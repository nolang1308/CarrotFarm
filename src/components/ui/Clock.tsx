import { useEffect, useState } from 'react'

function format(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const h24 = d.getHours()
  const ampm = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 || 12
  return `${ampm} ${p(h12)}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 시계 (초 단위, 매초 갱신). 배치는 부모가 담당. */
export default function Clock() {
  const [time, setTime] = useState(() => format(new Date()))

  useEffect(() => {
    const id = setInterval(() => setTime(format(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  return <span className="clock">{time}</span>
}
