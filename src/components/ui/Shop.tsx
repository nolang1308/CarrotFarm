import { useState } from 'react'
import {
  SEED_COST,
  SEED_PACK,
  blackRabbitCost,
  rabbitCost,
  tileCost,
  useGameStore,
} from '../../store/gameStore'
import {
  blackRabbitIconUrl,
  coinIconUrl,
  landIconUrl,
  rabbitIconUrl,
  seedIconUrl,
} from '../../game/textures'
import { useModalAnim } from '../../hooks/useModalAnim'
import '../../styles/Shop.scss'

type Tab = 'seed' | 'land' | 'rabbit' | 'blackRabbit'

/** 상점 모달. 씨앗/땅/토끼/검은 토끼 탭으로 나눠 구매. */
export default function Shop() {
  const open = useGameStore((s) => s.shopOpen)
  const toggle = useGameStore((s) => s.toggleShop)
  const coins = useGameStore((s) => s.coins)
  const seeds = useGameStore((s) => s.seeds)
  const rabbits = useGameStore((s) => s.rabbits)
  const blackRabbits = useGameStore((s) => s.blackRabbits)
  const land = useGameStore((s) => s.tiles.length)
  const buySeeds = useGameStore((s) => s.buySeeds)
  const addRabbit = useGameStore((s) => s.addRabbit)
  const addBlackRabbit = useGameStore((s) => s.addBlackRabbit)
  const toggleBuildMode = useGameStore((s) => s.toggleBuildMode)
  const [tab, setTab] = useState<Tab>('seed')
  const { mounted, closing } = useModalAnim(open)

  if (!mounted) return null

  // 영구 자산은 살 때마다 가격이 오름 → 현재 보유 수 기준 다음 가격
  const landCost = tileCost(land)
  const nextRabbitCost = rabbitCost(rabbits)
  const nextBlackRabbitCost = blackRabbitCost(blackRabbits)

  const item =
    tab === 'seed'
      ? {
          icon: seedIconUrl(),
          name: '당근 씨앗',
          owned: `보유 ${seeds}개`,
          desc: `밭 빈 흙에 심어 당근을 기릅니다. 한 번에 ${SEED_PACK}개씩 들어옵니다.`,
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
              icon: rabbitIconUrl(),
              name: '토끼',
              owned: `보유 ${rabbits}마리`,
              desc: '집에서 나와 다 자란 당근을 알아서 대신 수확해 줍니다. 살수록 비싸져요.',
              buyText: '토끼 1마리',
              cost: nextRabbitCost,
              canBuy: coins >= nextRabbitCost,
              onBuy: addRabbit,
            }
          : {
              icon: blackRabbitIconUrl(),
              name: '검은 토끼',
              owned: `보유 ${blackRabbits}마리`,
              desc: '집에서 나와 빈 밭을 찾아 알아서 씨앗을 심어 줍니다. 살수록 비싸져요.',
              buyText: '검은 토끼 1마리',
              cost: nextBlackRabbitCost,
              canBuy: coins >= nextBlackRabbitCost,
              onBuy: addBlackRabbit,
            }

  return (
    <div className={`shop ${closing ? 'is-closing' : ''}`} onClick={toggle}>
      <div
        className={`shop__panel ${closing ? 'is-closing' : ''}`}
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
            <img src={rabbitIconUrl()} alt="" />
            토끼
          </button>
          <button
            type="button"
            className={`shop__tab ${tab === 'blackRabbit' ? 'is-active' : ''}`}
            onClick={() => setTab('blackRabbit')}
          >
            <img src={blackRabbitIconUrl()} alt="" />
            검은 토끼
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
            onClick={() => item.onBuy()}
          >
            <span className="shop__buy-text">{item.buyText} 구매</span>
            <span className="shop__buy-price">
              <img src={coinIconUrl()} alt="" />
              {item.cost}
            </span>
          </button>
        </div>

        <button type="button" className="shop__close" onClick={toggle}>
          닫기
        </button>
      </div>
    </div>
  )
}
