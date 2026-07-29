import { useEffect, useRef, useState } from 'react'
import { RIPE_STAGE, useGameStore } from '../../store/gameStore'
import {
  useTutorialStore,
  type FocusRect,
  type SceneTarget,
  type TutorialStep,
} from '../../store/tutorialStore'
import { unionOutline, type Pt } from '../../game/rectUnion'
import '../../styles/Tutorial.scss'

interface StepConfig {
  msg: string
  /** 포커스 대상: DOM 셀렉터('dom') 또는 3D 투영 사각형 */
  target?: 'dom' | SceneTarget
  domSelector?: string
  /** 구멍 안 클릭 허용 (실습 단계) */
  interactive?: boolean
  /** "다음" 버튼 표시 (설명 단계) */
  nextButton?: boolean
}

const STEPS: Record<TutorialStep, StepConfig> = {
  welcome: {
    msg: '안녕하세요! 당근농장에 오신 걸 환영합니다.\n당근농장에 대해 설명 드리겠습니다!',
    nextButton: true,
  },
  money: {
    msg: '지붕 위 숫자는 보유한 코인이에요.\n씨앗·땅·토끼를 살 때 쓰여요.',
    target: 'dom',
    domSelector: '.coinbar',
    nextButton: true,
  },
  land: {
    msg: '여기는 밭이에요. 빈 땅을 좌클릭하면 씨앗을 심고,\n다 자란 당근은 우클릭으로 수확해요.',
    target: 'farm',
    nextButton: true,
  },
  house: {
    msg: '여기는 집이에요.\n집을 누르면 시장과 상점 메뉴가 열려요.',
    target: 'house',
    nextButton: true,
  },
  'try-house': {
    msg: '그럼 직접 해볼까요? 집을 눌러보세요!',
    target: 'house',
    interactive: true,
  },
  'try-shop': {
    msg: '좋아요! 이제 상점 버튼을 눌러보세요.',
    target: 'dom',
    domSelector: '.housemenu__side--right .special',
    interactive: true,
  },
  'try-buy': {
    msg: '씨앗 10개 묶음을 구매해 보세요.',
    target: 'dom',
    domSelector: '.shop__buy',
    interactive: true,
  },
  'try-close': {
    msg: '잘했어요! 닫기를 눌러 상점을 닫아요.',
    target: 'dom',
    domSelector: '.shop__close',
    interactive: true,
  },
  'try-plant': {
    msg: '이제 빈 땅을 좌클릭해서 씨앗을 심어보세요!',
    target: 'farm',
    interactive: true,
  },
  'wait-grow': {
    msg: '당근이 자라고 있어요... 잠시만 기다려요!',
  },
  'try-harvest': {
    msg: '당근이 다 자랐어요!\n우클릭으로 수확해 보세요.',
    target: 'ripe',
    interactive: true,
  },
  'try-house-2': {
    msg: '수확한 당근을 팔아볼까요?\n집을 다시 눌러보세요!',
    target: 'house',
    interactive: true,
  },
  'try-market': {
    msg: '이번엔 시장 버튼을 눌러보세요.',
    target: 'dom',
    domSelector: '.housemenu__side--left .special',
    interactive: true,
  },
  'try-sell': {
    msg: '팔기를 눌러 당근을 판매해 보세요!\n시세는 시간마다 달라져요.',
    target: 'dom',
    domSelector: '.market__sell',
    interactive: true,
  },
  done: {
    msg: '자! 이제 당근농장에서 마음껏 당근을 키워보세요!',
  },
}

/** DOM 요소 포커스 구멍 주변 여유(px) */
const DOM_PAD = 6

/** 두 사각형이 사실상 같은지 (1.5px 미만 차이 무시 → 리렌더 억제) */
function sameRect(a: FocusRect | null, b: FocusRect): boolean {
  return (
    !!a &&
    Math.abs(a.left - b.left) < 1.5 &&
    Math.abs(a.top - b.top) < 1.5 &&
    Math.abs(a.width - b.width) < 1.5 &&
    Math.abs(a.height - b.height) < 1.5
  )
}

/** 합집합 외곽선 루프들 → SVG 패스 */
function loopsPath(loops: Pt[][]): string {
  return loops
    .map((l) => `M${l.map(([x, y]) => `${x} ${y}`).join('L')}Z`)
    .join('')
}

/**
 * 첫 로그인 튜토리얼 오버레이 (직접 구현).
 * - 화면을 어둡게 덮고, 현재 단계 대상만 구멍(스포트라이트)으로 밝게 남긴다
 * - 실습 단계에서는 구멍 안쪽만 클릭이 통과 → 캔버스가 원래 방식(호버·드래그
 *   포함)으로 입력을 받고, 나머지 행동은 전부 차단된다
 * - 실습 진행은 게임 상태 변화(메뉴 열림·씨앗 증가 등)로 자동 감지
 * - 말풍선은 항상 코인바(돈 표시) 바로 위, 가로 중앙
 */
export default function Tutorial() {
  const tutorialDone = useGameStore((s) => s.tutorialDone)
  const finishTutorial = useGameStore((s) => s.finishTutorial)
  const step = useTutorialStore((s) => s.step)
  const next = useTutorialStore((s) => s.next)
  const skipToDone = useTutorialStore((s) => s.skipToDone)
  const sceneRects = useTutorialStore((s) => s.rects)
  const [domRect, setDomRect] = useState<FocusRect | null>(null)
  /** 말풍선 밑변의 화면 y (코인바 위 10px). 아직 못 쟀으면 null */
  const [anchorY, setAnchorY] = useState<number | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)

  // 계정 전환 대비: 튜토리얼이 다시 뜰 땐 항상 처음부터
  useEffect(() => {
    useTutorialStore.getState().reset()
  }, [])

  // 실습 단계 자동 진행.
  // 이전 튜토리얼을 중간에 끊은 저장본(씨앗·작물이 이미 있는 상태)으로
  // 다시 시작해도 단계가 저절로 건너뛰지 않게, 절대값이 아니라
  // "이번 변화에서 실제로 그 행동을 했는지"(이전 상태와의 차이)로 판정한다.
  useEffect(() => {
    if (tutorialDone) return
    return useGameStore.subscribe((s, prev) => {
      const t = useTutorialStore.getState()
      switch (t.step) {
        case 'try-house':
          if (s.panelOpen && !prev.panelOpen) t.next()
          break
        case 'try-shop':
          if (s.shopOpen && !prev.shopOpen) t.next()
          break
        case 'try-buy':
          if (s.seeds > prev.seeds) t.next()
          break
        case 'try-close':
          if (!s.shopOpen && prev.shopOpen) t.next()
          break
        case 'try-plant': {
          const planted = s.tiles.filter((tile) => tile.plantedAt != null).length
          const before = prev.tiles.filter(
            (tile) => tile.plantedAt != null,
          ).length
          if (planted > before) t.next()
          break
        }
        case 'wait-grow':
          // 성장 완료는 행동이 아니라 시간 경과라 상태 기준 그대로
          // (이미 다 자란 당근이 있으면 기다릴 필요 없이 바로 수확 단계로)
          if (s.tiles.some((tile) => tile.growth === RIPE_STAGE)) t.next()
          break
        case 'try-harvest':
          if (s.carrots > prev.carrots) t.next()
          break
        case 'try-house-2':
          if (s.panelOpen && !prev.panelOpen) t.next()
          break
        case 'try-market':
          if (s.marketOpen && !prev.marketOpen) t.next()
          break
        case 'try-sell':
          // 전량 판매로 당근이 줄었으면 통과
          if (s.carrots < prev.carrots) t.next()
          break
      }
    })
  }, [tutorialDone])

  // DOM 대상 위치 측정 (메뉴 등장 애니메이션·창 리사이즈를 따라가도록 주기 측정)
  const cfg = STEPS[step]
  useEffect(() => {
    if (cfg.target !== 'dom' || !cfg.domSelector) {
      setDomRect(null)
      return
    }
    const sel = cfg.domSelector
    const measure = () => {
      const el = document.querySelector(sel) as HTMLElement | null
      if (!el) {
        setDomRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      const padded: FocusRect = {
        left: r.left - DOM_PAD,
        top: r.top - DOM_PAD,
        width: r.width + DOM_PAD * 2,
        height: r.height + DOM_PAD * 2,
      }
      setDomRect((prev) => (sameRect(prev, padded) ? prev : padded))
    }
    measure()
    const id = window.setInterval(measure, 80)
    return () => window.clearInterval(id)
  }, [cfg.target, cfg.domSelector])

  // 말풍선 위치: 코인바 바로 위 (코인바가 움직이면 따라감)
  useEffect(() => {
    if (tutorialDone) return
    const place = () => {
      const coin = document.querySelector('.coinbar') as HTMLElement | null
      if (!coin) return
      const y = coin.getBoundingClientRect().top - 10
      setAnchorY((prev) => (prev != null && Math.abs(prev - y) < 1.5 ? prev : y))
    }
    place()
    const id = window.setInterval(place, 100)
    return () => window.clearInterval(id)
  }, [tutorialDone])

  if (tutorialDone) return null

  const holes: FocusRect[] =
    cfg.target === 'dom'
      ? domRect
        ? [domRect]
        : []
      : cfg.target
        ? (sceneRects[cfg.target] ?? [])
        : []

  // 말풍선이 창 위로 나가지 않게 최소 높이 보정
  const bubbleH = bubbleRef.current?.offsetHeight ?? 0
  const bubbleTop = anchorY != null ? Math.max(8 + bubbleH, anchorY) : 12 + bubbleH

  return (
    <div className="tutorial" onContextMenu={(e) => e.preventDefault()}>
      {holes.length > 0 ? (
        <>
          {/* 어두운 마스크: 구멍들의 합집합이 한 덩어리로 뚫림.
              칠해진 영역이 클릭을 삼킨다 */}
          <svg className="tutorial__mask">
            {(() => {
              const loops = unionOutline(holes)
              const d = loopsPath(loops)
              return (
                <>
                  <path
                    d={`M-10 -10H100000V100000H-10Z${d}`}
                    fill="rgba(20, 14, 8, 0.62)"
                    fillRule="evenodd"
                  />
                  {/* 덩어리 외곽에만 픽셀 프레임 (어두운 외곽선 + 노란 선) */}
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(58, 42, 24, 0.9)"
                    strokeWidth={7}
                  />
                  <path d={d} fill="none" stroke="#ffd873" strokeWidth={3} />
                </>
              )
            })()}
          </svg>
          {/* 설명 단계에서는 구멍 안도 클릭 차단 (투명) */}
          {!cfg.interactive &&
            holes.map((h, i) => (
              <div
                key={i}
                className="tutorial__block"
                style={{
                  left: h.left,
                  top: h.top,
                  width: h.width,
                  height: h.height,
                }}
              />
            ))}
        </>
      ) : (
        <div className="tutorial__dim" style={{ inset: 0 }} />
      )}

      {/* 말풍선: 코인바 바로 위, 가로 중앙 (translateY(-100%)로 밑변 기준 정렬) */}
      <div className="tutorial__bubble" ref={bubbleRef} style={{ top: bubbleTop }}>
        <p className="tutorial__msg">{cfg.msg}</p>

        {(cfg.nextButton || step === 'done') && (
          <div className="tutorial__buttons">
            {cfg.nextButton && (
              <button type="button" className="tutorial__next" onClick={next}>
                다음
              </button>
            )}
            {step === 'done' && (
              <button
                type="button"
                className="tutorial__next"
                onClick={finishTutorial}
              >
                시작하기
              </button>
            )}
          </div>
        )}

        {step !== 'done' && (
          <button type="button" className="tutorial__skip" onClick={skipToDone}>
            튜토리얼 건너뛰기
          </button>
        )}
      </div>
    </div>
  )
}
