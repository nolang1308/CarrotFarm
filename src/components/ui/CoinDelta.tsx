import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import '../../styles/CoinDelta.scss'

/** 변동(+/-) 표시가 떠 있는 시간(ms) */
const DELTA_MS = 900

interface Popup {
  amount: number
  x: number
  y: number
  key: number
}

/**
 * 코인 변동량(+획득/-지출)을 마우스 커서 바로 위에 띄우는 플로팅 표시.
 * 짧은 간격의 연속 변동(드래그 수확 등)은 하나로 합산되고,
 * 위치는 마지막 변동 시점의 커서를 따라간다. 렌더링 외 상호작용 없음.
 */
export default function CoinDelta() {
  const coins = useGameStore((s) => s.coins)
  const prevCoins = useRef(coins)
  const pointer = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  })
  const timer = useRef(0)
  const [popup, setPopup] = useState<Popup | null>(null)

  // 커서 위치 추적
  useEffect(() => {
    const track = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('pointermove', track)
    window.addEventListener('pointerdown', track)
    return () => {
      window.removeEventListener('pointermove', track)
      window.removeEventListener('pointerdown', track)
    }
  }, [])

  // 코인 변동 감지 → 커서 위 팝업 (key 가 바뀌면 애니메이션 재시작)
  useEffect(() => {
    const diff = coins - prevCoins.current
    prevCoins.current = coins
    if (diff === 0) return
    setPopup((p) => ({
      amount: (p?.amount ?? 0) + diff,
      x: pointer.current.x,
      y: pointer.current.y,
      key: (p?.key ?? 0) + 1,
    }))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPopup(null), DELTA_MS)
  }, [coins])

  if (!popup) return null

  return (
    <span
      key={popup.key}
      className={`coindelta ${popup.amount > 0 ? 'is-plus' : 'is-minus'}`}
      style={{ left: popup.x, top: popup.y }}
    >
      {popup.amount > 0 ? '+' : ''}
      {popup.amount.toLocaleString('en-US')}
    </span>
  )
}
