import { useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'

/** 시세 갱신 주기: 1분 */
const PRICE_INTERVAL_MS = 60 * 1000

/** 당근 시세를 1분마다 갱신하는 루프. 렌더링 요소 없음. */
export default function PriceTicker() {
  const tickPrice = useGameStore((s) => s.tickPrice)

  useEffect(() => {
    const id = setInterval(tickPrice, PRICE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [tickPrice])

  return null
}
