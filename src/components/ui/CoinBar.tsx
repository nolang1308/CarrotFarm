import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { coinIconUrl, trophyIconUrl } from '../../game/textures'
import '../../styles/CoinBar.scss'

/** 잔액이 목표값까지 굴러가는 시간(ms) */
const COUNT_MS = 700

/**
 * 지붕 위에 항상 떠 있는 보유 코인 표시.
 * - 자릿수가 아무리 많아도 줄이지 않고 전부 보여준다 (창 크기는 WidgetResizer 가 맞춤)
 * - 잔액은 틱 하고 바뀌는 대신 목표값까지 촤르르 굴러간다
 * (변동량 +/- 표시는 커서를 따라가는 CoinDelta 가 담당)
 */
export default function CoinBar() {
  const coins = useGameStore((s) => s.coins)
  const toggleRanking = useGameStore((s) => s.toggleRanking)

  // 표시용 숫자 (실제 잔액을 향해 이징으로 굴러감)
  const [shown, setShown] = useState(coins)
  const shownRef = useRef(coins)
  const rafRef = useRef(0)

  useEffect(() => {
    // 진행 중이던 굴리기가 있으면 현재 표시값에서 이어감
    cancelAnimationFrame(rafRef.current)
    const from = shownRef.current
    if (from === coins) return
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / COUNT_MS)
      const eased = 1 - (1 - p) ** 3 // ease-out cubic
      const val = Math.round(from + (coins - from) * eased)
      shownRef.current = val
      setShown(val)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [coins])

  return (
    <div className="coinbar">
      <img src={coinIconUrl()} alt="코인" />
      {shown.toLocaleString('en-US')}
      <button
        type="button"
        className="coinbar__rank"
        onClick={toggleRanking}
        title="랭킹"
      >
        <img src={trophyIconUrl()} alt="자산 랭킹" />
      </button>
    </div>
  )
}
