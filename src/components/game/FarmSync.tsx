import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import {
  type TileState,
  snapshotFarm,
  useGameStore,
} from '../../store/gameStore'
import {
  loadFarm,
  registerFarmFlusher,
  saveFarm,
  saveLeaderboard,
} from '../../firebase/farmSync'
import { useSaveToast } from '../../store/saveToast'

/** 자동 저장 최소 간격 (Firestore 쓰기 절약: 아무리 바빠도 1분에 1회) */
const SAVE_INTERVAL_MS = 60_000
/** 불러오기 실패 시 재시도 간격 */
const LOAD_RETRY_MS = 3000

/**
 * 저장 관점에서 타일이 바뀌었는지.
 * growth 는 plantedAt 에서 파생되므로 무시한다 — 성장 틱마다
 * 저장이 발생하는 낭비를 막는 핵심 필터.
 */
function tilesPersistChanged(a: TileState[], b: TileState[]): boolean {
  if (a === b) return false
  if (a.length !== b.length) return true
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].x !== b[i].x ||
      a[i].z !== b[i].z ||
      a[i].plantedAt !== b[i].plantedAt
    ) {
      return true
    }
  }
  return false
}

/**
 * 로그인한 계정의 농장을 Firestore 와 동기화하는 루프. 렌더링 없음.
 * - 로그인/계정 전환 시: 저장본을 불러와 스토어에 적용 (없으면 초기 농장)
 * - 이후: 변경이 있으면 스로틀(1분에 최대 1회)로 자동 저장 + "자동저장됨..." 토스트
 * - 종료·로그아웃·수동 저장(flushFarm)은 스로틀과 무관하게 즉시 저장
 */
export default function FarmSync() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    const uid = user.uid
    let alive = true
    let saveTimer: number | null = null
    let dirty = false
    let lastSaveAt = Date.now()

    useGameStore.getState().beginHydration()

    const tryLoad = () => {
      loadFarm(uid)
        .then((save) => {
          if (!alive) return
          useGameStore.getState().hydrate(save)
          lastSaveAt = Date.now()
          // 아무 변경 없이 접속만 해도 랭킹에 보이도록 프로필 갱신 (최선 노력)
          void saveLeaderboard(
            uid,
            snapshotFarm(useGameStore.getState()),
          ).catch(() => {})
        })
        .catch((err) => {
          // 오프라인 등 일시 오류: 초기화 상태로 덮어쓰지 않고 재시도만 한다
          console.error('농장 불러오기 실패, 재시도 예정:', err)
          if (alive) window.setTimeout(() => alive && tryLoad(), LOAD_RETRY_MS)
        })
    }
    tryLoad()

    // 밀린 변경을 지금 저장. 실제로 썼으면 true 반환.
    // (로그아웃·앱 종료·수동 저장도 flushFarm() 을 통해 이걸 부른다)
    const flush = async (): Promise<boolean> => {
      if (!dirty) return false
      dirty = false
      if (saveTimer != null) {
        window.clearTimeout(saveTimer)
        saveTimer = null
      }
      lastSaveAt = Date.now()
      try {
        await saveFarm(uid, snapshotFarm(useGameStore.getState()))
        return true
      } catch (err) {
        console.error('농장 저장 실패:', err)
        return false
      }
    }
    registerFarmFlusher(flush)

    const unsub = useGameStore.subscribe((s, prev) => {
      // 불러오기 전/불러오기 자체로 인한 변화는 저장하지 않음
      if (!s.hydrated || !prev.hydrated) return
      if (
        s.coins === prev.coins &&
        s.carrots === prev.carrots &&
        s.seeds === prev.seeds &&
        s.rabbitTypes === prev.rabbitTypes &&
        s.buildings === prev.buildings &&
        s.tutorialDone === prev.tutorialDone &&
        !tilesPersistChanged(s.tiles, prev.tiles)
      ) {
        return
      }
      dirty = true
      // 스로틀: 이미 예약돼 있으면 그대로 두고, 없으면 "마지막 저장 + 1분" 시점에 예약
      if (saveTimer == null) {
        const wait = Math.max(0, lastSaveAt + SAVE_INTERVAL_MS - Date.now())
        saveTimer = window.setTimeout(async () => {
          saveTimer = null
          if (await flush()) {
            useSaveToast.getState().show('자동저장됨...')
          }
        }, wait)
      }
    })

    // 창을 닫을 때 마지막 변경 저장 (최선 노력)
    const flushNow = () => void flush()
    window.addEventListener('beforeunload', flushNow)

    return () => {
      alive = false
      unsub()
      window.removeEventListener('beforeunload', flushNow)
      registerFarmFlusher(null)
      void flush() // 로그아웃/계정 전환 시 남은 변경 저장
    }
  }, [user])

  return null
}
