import { create } from 'zustand'

/** "자동저장됨..." / "저장됨!" 같은 저장 알림 토스트 상태 */
interface SaveToastState {
  message: string
  /** 같은 문구여도 다시 뜨도록 매번 증가 (컴포넌트 key 로 사용) */
  seq: number
  show: (message: string) => void
}

export const useSaveToast = create<SaveToastState>((set) => ({
  message: '',
  seq: 0,
  show: (message) => set((s) => ({ message, seq: s.seq + 1 })),
}))
