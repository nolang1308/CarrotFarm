import { useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'

/**
 * 각 작물을 "심은 시각" 기준으로 개별 성장시키는 게임 루프.
 * 짧은 주기로 현재 시각을 넘겨, 타일마다 (지금 − 심은 시각)으로 단계를 계산한다.
 * 렌더링 요소는 없다.
 */
export default function GrowthLoop() {
  const tickGrowth = useGameStore((s) => s.tickGrowth)

  useEffect(() => {
    const id = setInterval(() => tickGrowth(Date.now()), 500)
    return () => clearInterval(id)
  }, [tickGrowth])

  return null
}
