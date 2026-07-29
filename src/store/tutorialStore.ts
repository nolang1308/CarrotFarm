import { create } from 'zustand'

/**
 * 튜토리얼 단계.
 * 1부(설명): welcome → money → land → house ("다음" 버튼으로 진행)
 * 2부(실습): try-house → try-shop → try-buy → try-close → try-plant
 *            → wait-grow → try-harvest → try-house-2 → try-market → try-sell
 *            (게임 상태 변화로 자동 진행)
 * done: 마무리 인사 ("건너뛰기"를 누르면 어느 단계에서든 여기로)
 */
export type TutorialStep =
  | 'welcome'
  | 'money'
  | 'land'
  | 'house'
  | 'try-house'
  | 'try-shop'
  | 'try-buy'
  | 'try-close'
  | 'try-plant'
  | 'wait-grow'
  | 'try-harvest'
  | 'try-house-2'
  | 'try-market'
  | 'try-sell'
  | 'done'

const ORDER: TutorialStep[] = [
  'welcome',
  'money',
  'land',
  'house',
  'try-house',
  'try-shop',
  'try-buy',
  'try-close',
  'try-plant',
  'wait-grow',
  'try-harvest',
  'try-house-2',
  'try-market',
  'try-sell',
  'done',
]

/** 화면 픽셀 기준 포커스 사각형 */
export interface FocusRect {
  left: number
  top: number
  width: number
  height: number
}

/** 3D 오브젝트 포커스 대상 (TutorialProjector 가 매 프레임 화면 좌표로 투영) */
export type SceneTarget = 'farm' | 'house' | 'ripe'

/** 두 사각형이 사실상 같은지 (1.5px 미만 차이 무시) */
function closeRect(a: FocusRect, b: FocusRect): boolean {
  return (
    Math.abs(a.left - b.left) < 1.5 &&
    Math.abs(a.top - b.top) < 1.5 &&
    Math.abs(a.width - b.width) < 1.5 &&
    Math.abs(a.height - b.height) < 1.5
  )
}

interface TutorialState {
  step: TutorialStep
  /**
   * 3D 대상의 화면 사각형 목록 (아직 계산 전이면 없음).
   * 밭은 "농사 가능한 타일들"이라 여러 개, 집/당근은 하나.
   */
  rects: Partial<Record<SceneTarget, FocusRect[]>>
  /** 다음 단계로 */
  next: () => void
  /** 건너뛰기: 마무리 인사(done)로 바로 이동 */
  skipToDone: () => void
  /** 투영된 화면 사각형 갱신 (1.5px 미만 변화는 무시해 리렌더 억제) */
  setRects: (key: SceneTarget, rects: FocusRect[]) => void
  /** 처음 단계로 초기화 (계정 전환 대비) */
  reset: () => void
}

export const useTutorialStore = create<TutorialState>((set) => ({
  step: 'welcome',
  rects: {},

  next: () =>
    set((s) => {
      const i = ORDER.indexOf(s.step)
      return i < ORDER.length - 1 ? { step: ORDER[i + 1] } : {}
    }),

  skipToDone: () => set({ step: 'done' }),

  setRects: (key, rects) =>
    set((s) => {
      const prev = s.rects[key]
      if (
        prev &&
        prev.length === rects.length &&
        prev.every((p, i) => closeRect(p, rects[i]))
      ) {
        return {}
      }
      return { rects: { ...s.rects, [key]: rects } }
    }),

  reset: () => set({ step: 'welcome', rects: {} }),
}))
