import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { snapshotFarm, useGameStore } from '../../store/gameStore'
import {
  loadFarm,
  registerFarmFlusher,
  saveFarm,
  saveLeaderboard,
} from '../../firebase/farmSync'

/** 변경 후 저장까지의 지연 (연속 조작을 한 번의 쓰기로 묶음) */
const SAVE_DEBOUNCE_MS = 2000
/** 불러오기 실패 시 재시도 간격 */
const LOAD_RETRY_MS = 3000

/**
 * 로그인한 계정의 농장을 Firestore 와 동기화하는 루프. 렌더링 없음.
 * - 로그인/계정 전환 시: 저장본을 불러와 스토어에 적용 (없으면 초기 농장)
 * - 이후: 저장 대상 필드가 바뀌면 디바운스로 자동 저장, 종료 시 즉시 저장
 */
export default function FarmSync() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    const uid = user.uid
    let alive = true
    let saveTimer: number | null = null
    let dirty = false

    useGameStore.getState().beginHydration()

    const tryLoad = () => {
      loadFarm(uid)
        .then((save) => {
          if (!alive) return
          useGameStore.getState().hydrate(save)
          // 아무 변경 없이 접속만 해도 랭킹에 보이도록 프로필 갱신 (최선 노력)
          void saveLeaderboard(uid, useGameStore.getState().coins).catch(
            () => {},
          )
        })
        .catch((err) => {
          // 오프라인 등 일시 오류: 초기화 상태로 덮어쓰지 않고 재시도만 한다
          console.error('농장 불러오기 실패, 재시도 예정:', err)
          if (alive) window.setTimeout(() => alive && tryLoad(), LOAD_RETRY_MS)
        })
    }
    tryLoad()

    // 밀린 변경을 지금 저장 (로그아웃·앱 종료도 flushFarm() 을 통해 이걸 부른다)
    const flush = async () => {
      if (!dirty) return
      dirty = false
      if (saveTimer != null) {
        window.clearTimeout(saveTimer)
        saveTimer = null
      }
      try {
        await saveFarm(uid, snapshotFarm(useGameStore.getState()))
      } catch (err) {
        console.error('농장 저장 실패:', err)
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
        s.rabbits === prev.rabbits &&
        s.blackRabbits === prev.blackRabbits &&
        s.carrotPrice === prev.carrotPrice &&
        s.priceHistory === prev.priceHistory &&
        s.tiles === prev.tiles &&
        s.buildings === prev.buildings &&
        s.tutorialDone === prev.tutorialDone
      ) {
        return
      }
      dirty = true
      if (saveTimer != null) window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(flush, SAVE_DEBOUNCE_MS)
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
