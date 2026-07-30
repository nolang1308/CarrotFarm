import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from './config'
import type { Building, FarmSave, TileState } from '../store/gameStore'

/** Firestore 문서에 저장되는 타일 (undefined 불가 → plantedAt 은 null) */
interface SavedTile {
  x: number
  z: number
  growth: number
  plantedAt: number | null
}

interface FarmDoc extends Omit<FarmSave, 'tiles'> {
  tiles: SavedTile[]
  /** 마지막 저장 시각(ms) */
  updatedAt: number
}

const farmRef = (uid: string) => doc(db, 'farms', uid)

/**
 * FarmSync 가 등록하는 "밀린 변경만 저장하는" 플러시.
 * 로그아웃·앱 종료 등 저장을 보장해야 하는 지점은 flushFarm() 하나만 부르면 된다
 * (디바운스 대기 여부는 FarmSync 만 알기 때문에 여기로 모은다).
 */
let farmFlusher: (() => Promise<void>) | null = null

export function registerFarmFlusher(fn: (() => Promise<void>) | null): void {
  farmFlusher = fn
}

/** 밀린 농장 변경을 지금 저장 (없으면 아무것도 안 함) */
export async function flushFarm(): Promise<void> {
  if (farmFlusher) await farmFlusher()
}

/** 랭킹 표시용 이름 (이메일 앞부분) */
function displayName(): string {
  return auth.currentUser?.email?.split('@')[0] ?? '농부'
}

/** 랭킹용 공개 프로필(이름·코인) 갱신 */
export async function saveLeaderboard(
  uid: string,
  coins: number,
): Promise<void> {
  await setDoc(doc(db, 'leaderboard', uid), {
    name: displayName(),
    coins,
    updatedAt: Date.now(),
  })
}

/** 농장 저장 (문서 전체 덮어쓰기) + 랭킹 프로필 동시 갱신 */
export async function saveFarm(uid: string, save: FarmSave): Promise<void> {
  const data: FarmDoc = {
    ...save,
    tiles: save.tiles.map((t) => ({
      x: t.x,
      z: t.z,
      growth: t.growth,
      plantedAt: t.plantedAt ?? null,
    })),
    updatedAt: Date.now(),
  }
  await Promise.all([
    setDoc(farmRef(uid), data),
    saveLeaderboard(uid, save.coins),
  ])
}

/** 농장 불러오기. 저장본이 없으면(새 계정) null */
export async function loadFarm(uid: string): Promise<FarmSave | null> {
  const snap = await getDoc(farmRef(uid))
  if (!snap.exists()) return null
  const d = snap.data() as Partial<FarmDoc>

  const tiles: TileState[] = (d.tiles ?? []).map((t) => ({
    x: t.x,
    z: t.z,
    growth: Math.max(0, Math.min(5, t.growth ?? 0)) as TileState['growth'],
    plantedAt: t.plantedAt ?? undefined,
  }))

  return {
    coins: d.coins ?? 0,
    carrots: d.carrots ?? 0,
    seeds: d.seeds ?? 0,
    rabbits: d.rabbits ?? 1,
    blackRabbits: d.blackRabbits ?? 0,
    carrotPrice: d.carrotPrice ?? 12,
    priceHistory: d.priceHistory ?? [d.carrotPrice ?? 12],
    tiles,
    buildings: (d.buildings ?? []) as Building[],
    // 예전 저장본에 필드가 없으면 튜토리얼 미완료로 취급
    tutorialDone: d.tutorialDone ?? false,
  }
}

// ===== 랭킹 =====

export interface RankEntry {
  uid: string
  name: string
  coins: number
}

export interface RankingResult {
  /** 코인 내림차순 상위 목록 */
  entries: RankEntry[]
  /** 내 순위 (1부터) */
  myRank: number
  /** 전체 참가자 수 */
  total: number
}

/** 상위 목록으로 가져올 인원 */
const RANKING_LIMIT = 50

/**
 * 랭킹 조회: 코인 내림차순 상위 목록 + 내 순위.
 * 내가 상위 목록 밖이면 "나보다 코인 많은 사람 수 + 1" 집계로 순위를 구한다.
 */
export async function fetchRanking(
  uid: string,
  myCoins: number,
): Promise<RankingResult> {
  const board = collection(db, 'leaderboard')
  const [topSnap, totalSnap] = await Promise.all([
    getDocs(query(board, orderBy('coins', 'desc'), limit(RANKING_LIMIT))),
    getCountFromServer(board),
  ])
  const entries: RankEntry[] = topSnap.docs.map((d) => {
    const data = d.data() as { name?: string; coins?: number }
    return { uid: d.id, name: data.name ?? '농부', coins: data.coins ?? 0 }
  })

  const idx = entries.findIndex((e) => e.uid === uid)
  let myRank: number
  if (idx >= 0) {
    myRank = idx + 1
  } else {
    const higher = await getCountFromServer(
      query(board, where('coins', '>', myCoins)),
    )
    myRank = higher.data().count + 1
  }

  return { entries, myRank, total: totalSnap.data().count }
}
