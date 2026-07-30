import { useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'

/**
 * 시세 확인 주기. 시세는 벽시계 분 단위 결정론이라
 * 분 경계를 늦지 않게 잡기 위해 10초마다 확인만 한다 (계산은 분이 바뀔 때만).
 */
const PRICE_INTERVAL_MS = 10 * 1000

/** 당근 시세를 분 단위로 갱신하는 루프. 렌더링 요소 없음. */
export default function PriceTicker() {
  const tickPrice = useGameStore((s) => s.tickPrice)

  useEffect(() => {
    const id = setInterval(tickPrice, PRICE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [tickPrice])

  return null
}
