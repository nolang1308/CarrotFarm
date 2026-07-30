import { useEffect, useRef, useState } from 'react'
import {
  SEED_COST,
  SEED_PACK,
  blackRabbitCost,
  growTotalMs,
  rabbitCost,
  tileCost,
  useGameStore,
} from '../../store/gameStore'
import {
  coinIconUrl,
  landIconUrl,
  seedIconUrl,
  speciesIconUrl,
} from '../../game/textures'
import { countRole, speciesById } from '../../game/rabbitSpecies'
import { useModalAnim } from '../../hooks/useModalAnim'
import '../../styles/Shop.scss'

type Tab = 'seed' | 'land' | 'rabbit' | 'blackRabbit'

/** 상점 모달. 씨앗/땅/토끼/검은 토끼 탭으로 나눠 구매. */
export default function Shop() {
  const open = useGameStore((s) => s.shopOpen)
  const toggle = useGameStore((s) => s.toggleShop)
  const coins = useGameStore((s) => s.coins)
  const seeds = useGameStore((s) => s.seeds)
  const rabbitTypes = useGameStore((s) => s.rabbitTypes)
  const land = useGameStore((s) => s.tiles.length)
  const buySeeds = useGameStore((s) => s.buySeeds)
  const buyRabbit = useGameStore((s) => s.buyRabbit)
  const tutorialDone = useGameStore((s) => s.tutorialDone)
  const toggleBuildMode = useGameStore((s) => s.toggleBuildMode)
  const [tab, setTab] = useState<Tab>('seed')
  const { mounted, closing } = useModalAnim(open)
  // 마지막으로 뽑은 토끼 (뽑기 결과 배너)
  const [pull, setPull] = useState<{ id: string; isNew: boolean } | null>(null)

  // 상점을 열 때마다 이전 뽑기 결과는 지움
  useEffect(() => {
    if (open) setPull(null)
  }, [open])

  // 꾹 누르면 자동 연속 구매 (씨앗처럼 반복 구매하는 소모품 전용)
  const holdTimeout = useRef(0)
  const holdInterval = useRef(0)
  const buyRef = useRef<() => void>(() => {})
  const stopHold = () => {
    window.clearTimeout(holdTimeout.current)
    window.clearInterval(holdInterval.current)
  }
  useEffect(() => stopHold, [])

  if (!mounted) return null

  // 영구 자산은 살 때마다 가격이 오름 → 현재 보유 수 기준 다음 가격
  const rabbits = countRole(rabbitTypes, 'harvest')
  const blackRabbits = countRole(rabbitTypes, 'plant')
  const landCost = tileCost(land)
  const nextRabbitCost = rabbitCost(rabbits)
  const nextBlackRabbitCost = blackRabbitCost(blackRabbits)

  /** 토끼 뽑기: 결과 배너 갱신 (처음 만난 종이면 NEW) */
  const doGacha = (role: 'harvest' | 'plant') => {
    const before = useGameStore.getState().rabbitTypes
    const id = buyRabbit(role)
    if (!id) return
    setPull({ id, isNew: !before.includes(id) })
  }

  // 다 자랄 때까지 걸리는 시간 표기 (튜토리얼 중에는 빠른 시간 그대로 표시)
  const growTotal = growTotalMs(tutorialDone)
  const growText =
    growTotal >= 60_000
      ? `${Math.round(growTotal / 60_000)}분`
      : `${Math.round(growTotal / 1000)}초`

  const item =
    tab === 'seed'
      ? {
          icon: seedIconUrl(),
          name: '당근 씨앗',
          owned: `보유 ${seeds}개`,
          desc: `밭 빈 흙에 심으면 약 ${growText} 만에 다 자랍니다. 한 번에 ${SEED_PACK}개씩 들어옵니다.`,
          buyText: `씨앗 ${SEED_PACK}개`,
          cost: SEED_COST,
          canBuy: coins >= SEED_COST,
          onBuy: buySeeds,
        }
      : tab === 'land'
        ? {
            icon: landIconUrl(),
            name: '땅 (밭)',
            owned: `보유 ${land}칸`,
            desc: '기존 밭 옆 빈 칸에 새 밭을 놓습니다. 살수록 다음 칸이 비싸져요.',
            buyText: '밭 넓히기',
            cost: landCost,
            canBuy: coins >= landCost,
            // 상점을 닫고 배치 모드로 진입 (완료 버튼으로 종료)
            onBuy: () => {
              toggle()
              toggleBuildMode()
            },
          }
        : tab === 'rabbit'
          ? {
              icon: speciesIconUrl(speciesById('white')),
              name: '수확 토끼 뽑기',
              owned: `보유 ${rabbits}마리`,
              desc: '다 자란 당근을 대신 수확해 줍니다. 다섯 종 중 누가 나올지는 뽑기 운! 살수록 비싸져요.',
              buyText: '토끼 뽑기',
              cost: nextRabbitCost,
              canBuy: coins >= nextRabbitCost,
              onBuy: () => doGacha('harvest'),
            }
          : {
              icon: speciesIconUrl(speciesById('black')),
              name: '씨앗 토끼 뽑기',
              owned: `보유 ${blackRabbits}마리`,
              desc: '빈 밭을 찾아 알아서 씨앗을 심어 줍니다. 다섯 종 중 누가 나올지는 뽑기 운! 살수록 비싸져요.',
              buyText: '토끼 뽑기',
              cost: nextBlackRabbitCost,
              canBuy: coins >= nextBlackRabbitCost,
              onBuy: () => doGacha('plant'),
            }

  // 항상 최신 구매 액션을 가리키게 (홀드 인터벌이 이전 탭 액션을 잡지 않도록)
  buyRef.current = () => item.onBuy()

  /** 누르는 순간 1회 구매 + (씨앗 탭이면) 꾹 누르는 동안 연속 구매 */
  const handleBuyDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    buyRef.current()
    if (tab !== 'seed') return // 영구 자산·땅은 클릭당 1회
    holdTimeout.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(() => buyRef.current(), 90)
    }, 350)
  }

  return (
    <div className={`shop ${closing ? 'is-closing' : ''}`} onClick={toggle}>
      <div
        className={`shop__panel modal-panel ${closing ? 'is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shop__header">
          <span className="shop__title">상점</span>
          <span className="shop__coins">
            <img src={coinIconUrl()} alt="코인" />
            {coins}
          </span>
        </div>

        <div className="shop__tabs">
          <button
            type="button"
            className={`shop__tab ${tab === 'seed' ? 'is-active' : ''}`}
            onClick={() => setTab('seed')}
          >
            <img src={seedIconUrl()} alt="" />
            씨앗
          </button>
          <button
            type="button"
            className={`shop__tab ${tab === 'land' ? 'is-active' : ''}`}
            onClick={() => setTab('land')}
          >
            <img src={landIconUrl()} alt="" />
            땅
          </button>
          <button
            type="button"
            className={`shop__tab ${tab === 'rabbit' ? 'is-active' : ''}`}
            onClick={() => setTab('rabbit')}
          >
            <img src={speciesIconUrl(speciesById('white'))} alt="" />
            토끼
          </button>
          <button
            type="button"
            className={`shop__tab ${tab === 'blackRabbit' ? 'is-active' : ''}`}
            onClick={() => setTab('blackRabbit')}
          >
            <img src={speciesIconUrl(speciesById('black'))} alt="" />
            씨앗 토끼
          </button>
        </div>

        <div className="shop__body">
          <div className="shop__card">
            <div className="shop__well">
              <img className="shop__wicon" src={item.icon} alt="" />
            </div>
            <div className="shop__meta">
              <div className="shop__name">{item.name}</div>
              <div className="shop__owned">{item.owned}</div>
              <div className="shop__desc">{item.desc}</div>
            </div>
          </div>

          <button
            type="button"
            className="shop__buy"
            disabled={!item.canBuy}
            onPointerDown={handleBuyDown}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
          >
            <span className="shop__buy-text">{item.buyText} 구매</span>
            <span className="shop__buy-price">
              <img src={coinIconUrl()} alt="" />
              {item.cost}
            </span>
          </button>

          {/* 뽑기 결과: 방금 나온 토끼 */}
          {pull && (tab === 'rabbit' || tab === 'blackRabbit') && (
            <div className="shop__pull" key={pull.id + String(pull.isNew)}>
              <img src={speciesIconUrl(speciesById(pull.id))} alt="" />
              <span className="shop__pull-name">
                {speciesById(pull.id).name}
              </span>
              {speciesById(pull.id).rarity === 'rare' && (
                <span className="shop__pull-rare">★</span>
              )}
              {pull.isNew && <span className="shop__pull-new">NEW!</span>}
            </div>
          )}
        </div>

        <button type="button" className="shop__close" onClick={toggle}>
          닫기
        </button>
      </div>
    </div>
  )
}
