import { useGameStore } from '../../store/gameStore'
import { carrotIconUrl } from '../../game/textures'
import { useModalAnim } from '../../hooks/useModalAnim'
import '../../styles/Market.scss'

/** 당근 시장 모달. 현재 시세(실시간) + 전량 판매. */
export default function Market() {
  const open = useGameStore((s) => s.marketOpen)
  const toggle = useGameStore((s) => s.toggleMarket)
  const price = useGameStore((s) => s.carrotPrice)
  const carrots = useGameStore((s) => s.carrots)
  const history = useGameStore((s) => s.priceHistory)
  const sellAll = useGameStore((s) => s.sellAllCarrots)
  const { mounted, closing } = useModalAnim(open)

  if (!mounted) return null

  const prev = history.length >= 2 ? history[history.length - 2] : price
  const dir = price > prev ? 'up' : price < prev ? 'down' : 'flat'
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■'
  const total = carrots * price

  return (
    <div className={`market ${closing ? 'is-closing' : ''}`} onClick={toggle}>
      <div
        className={`market__panel ${closing ? 'is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="market__title">
          <img className="market__ticon" src={carrotIconUrl()} alt="" />
          당근 시장
        </div>

        <div className="market__price">
          <span className="market__price-num">{price}</span>
          <span className="market__price-unit">코인 / 개</span>
          <span className={`market__dir market__dir--${dir}`}>{arrow}</span>
        </div>

        <div className="market__rows">
          <div className="market__row">
            <span>보유 당근</span>
            <span>{carrots} 개</span>
          </div>
          <div className="market__row market__row--total">
            <span>전량 판매 시</span>
            <span>+{total} 코인</span>
          </div>
        </div>

        <div className="market__buttons">
          <button
            type="button"
            className="market__sell"
            onClick={() => sellAll()}
            disabled={carrots === 0}
          >
            팔기
          </button>
          <button type="button" className="market__close" onClick={toggle}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
