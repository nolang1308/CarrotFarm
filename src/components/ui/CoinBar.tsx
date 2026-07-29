import { useGameStore } from '../../store/gameStore'
import { coinIconUrl } from '../../game/textures'
import '../../styles/CoinBar.scss'

/**
 * 지붕 위에 항상 떠 있는 보유 코인 표시.
 * 자릿수가 아무리 많아도 줄이지 않고 전부 보여준다 (창 크기는 WidgetResizer 가 맞춤).
 */
export default function CoinBar() {
  const coins = useGameStore((s) => s.coins)

  return (
    <div className="coinbar">
      <img src={coinIconUrl()} alt="코인" />
      {coins.toLocaleString('en-US')}
    </div>
  )
}
