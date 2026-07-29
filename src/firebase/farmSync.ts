import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './config'
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

/** 농장 저장 (문서 전체 덮어쓰기) */
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
  await setDoc(farmRef(uid), data)
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
