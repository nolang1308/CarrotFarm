import { useEffect, useRef, useState } from 'react'

/**
 * 팝업 등장/퇴장 애니메이션용 훅.
 * open 이 false 가 돼도 duration 동안 mounted 를 유지하며 closing=true 로 두어
 * 퇴장 애니메이션을 재생한 뒤 언마운트한다.
 */
export function useModalAnim(open: boolean, duration = 200) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const mountedRef = useRef(open)
  mountedRef.current = mounted

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mountedRef.current) return
    setClosing(true)
    const id = window.setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, duration)
    return () => window.clearTimeout(id)
  }, [open, duration])

  return { mounted, closing }
}
