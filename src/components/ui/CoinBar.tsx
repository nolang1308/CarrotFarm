import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { coinIconUrl } from '../../game/textures'
import '../../styles/CoinBar.scss'

/** 잔액이 목표값까지 굴러가는 시간(ms) */
const COUNT_MS = 700
/** 변동(+/-) 표시가 떠 있는 시간(ms) */
const DELTA_MS = 900

/**
 * 지붕 위에 항상 떠 있는 보유 코인 표시.
 * - 자릿수가 아무리 많아도 줄이지 않고 전부 보여준다 (창 크기는 WidgetResizer 가 맞춤)
 * - 잔액은 틱 하고 바뀌는 대신 목표값까지 촤르르 굴러간다
 * - 변동이 생기면 위로 "+N"/"-N" 이 떠올랐다 사라진다 (연속 변동은 합산)
 */
export default function CoinBar() {
  const coins = useGameStore((s) => s.coins)

  // 표시용 숫자 (실제 잔액을 향해 이징으로 굴러감)
  const [shown, setShown] = useState(coins)
  const shownRef = useRef(coins)
  const rafRef = useRef(0)

  // 변동 플로팅 표시 (key 가 바뀌면 애니메이션이 처음부터 다시 재생)
  const [delta, setDelta] = useState<{ amount: number; key: number } | null>(
    null,
  )
  const prevCoins = useRef(coins)
  const deltaTimer = useRef(0)

  useEffect(() => {
    // 1) 변동량 팝업 (짧은 간격의 연속 변동은 하나로 합산)
    const diff = coins - prevCoins.current
    prevCoins.current = coins
    if (diff !== 0) {
      setDelta((d) => ({
        amount: (d?.amount ?? 0) + diff,
        key: (d?.key ?? 0) + 1,
      }))
      window.clearTimeout(deltaTimer.current)
      deltaTimer.current = window.setTimeout(() => setDelta(null), DELTA_MS)
    }

    // 2) 잔액 굴리기 (진행 중이던 굴리기가 있으면 현재 표시값에서 이어감)
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

      {delta && (
        <span
          key={delta.key}
          className={`coinbar__delta ${
            delta.amount > 0 ? 'is-plus' : 'is-minus'
          }`}
        >
          {delta.amount > 0 ? '+' : ''}
          {delta.amount.toLocaleString('en-US')}
        </span>
      )}
    </div>
  )
}
