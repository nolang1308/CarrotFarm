import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import '../../styles/CoinDelta.scss'

/** 변동(+/-) 표시가 떠 있는 시간(ms) */
const DELTA_MS = 900
/** 동시에 띄우는 최대 개수 (연타 폭주 대비) */
const MAX_POPUPS = 20

interface Popup {
  id: number
  amount: number
  x: number
  y: number
}

/**
 * 코인 변동량(+획득/-지출)을 마우스 커서 바로 위에 띄우는 플로팅 표시.
 * 변동 한 번 = 팝업 한 개. 연속 구매하면 -20, -20, -20 이 각각 떠올라서
 * "이번에 나간 돈"이 그대로 보인다 (누적 합산 표시는 오해를 줘서 안 함).
 */
export default function CoinDelta() {
  const coins = useGameStore((s) => s.coins)
  const prevCoins = useRef(coins)
  const pointer = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  })
  const nextId = useRef(0)
  const [popups, setPopups] = useState<Popup[]>([])

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

  // 코인 변동 감지 → 커서 위에 팝업 하나 추가, 수명이 다하면 제거
  useEffect(() => {
    const diff = coins - prevCoins.current
    prevCoins.current = coins
    if (diff === 0) return
    const id = nextId.current++
    setPopups((list) => [
      ...list.slice(-(MAX_POPUPS - 1)),
      { id, amount: diff, x: pointer.current.x, y: pointer.current.y },
    ])
    window.setTimeout(() => {
      setPopups((list) => list.filter((p) => p.id !== id))
    }, DELTA_MS)
  }, [coins])

  return (
    <>
      {popups.map((p) => (
        <span
          key={p.id}
          className={`coindelta ${p.amount > 0 ? 'is-plus' : 'is-minus'}`}
          style={{ left: p.x, top: p.y }}
        >
          {p.amount > 0 ? '+' : ''}
          {p.amount.toLocaleString('en-US')}
        </span>
      ))}
    </>
  )
}
