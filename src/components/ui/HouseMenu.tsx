import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useAuthStore } from '../../store/authStore'
import {
  blackRabbitIconUrl,
  landIconUrl,
  marketFrameUrl,
  marketIconUrl,
  rabbitIconUrl,
  seedIconUrl,
  shopFrameUrl,
  shopIconUrl,
} from '../../game/textures'
import '../../styles/HouseMenu.scss'

/** 집에 붙는 메뉴: 위=보유 자산(코인은 지붕 위 CoinBar), 왼쪽=시장, 오른쪽=상점 */
export default function HouseMenu({ closing }: { closing: boolean }) {
  const seeds = useGameStore((s) => s.seeds)
  const rabbits = useGameStore((s) => s.rabbits)
  const blackRabbits = useGameStore((s) => s.blackRabbits)
  const land = useGameStore((s) => s.tiles.length)
  const toggleMarket = useGameStore((s) => s.toggleMarket)
  const toggleShop = useGameStore((s) => s.toggleShop)
  const logout = useAuthStore((s) => s.logout)

  // 자동 시작 (Electron 에서만; 브라우저에선 버튼 숨김)
  const [autoLaunch, setAutoLaunch] = useState<boolean | null>(null)
  useEffect(() => {
    window.electronAPI?.getAutoLaunch().then(setAutoLaunch)
  }, [])
  const toggleAutoLaunch = async () => {
    if (autoLaunch == null) return
    const applied = await window.electronAPI!.setAutoLaunch(!autoLaunch)
    setAutoLaunch(applied)
  }

  return (
    <div className={`housemenu ${closing ? 'is-closing' : ''}`}>
      <div className="housemenu__stats">
        <span className="housemenu__chip">
          <img src={seedIconUrl()} alt="씨앗" />
          {seeds}
        </span>
        <span className="housemenu__chip">
          <img src={rabbitIconUrl()} alt="토끼" />
          {rabbits}
        </span>
        {blackRabbits > 0 && (
          <span className="housemenu__chip">
            <img src={blackRabbitIconUrl()} alt="검은 토끼" />
            {blackRabbits}
          </span>
        )}
        <span className="housemenu__chip">
          <img src={landIconUrl()} alt="땅" />
          {land}
        </span>
        {autoLaunch != null && (
          <button
            type="button"
            className={`housemenu__logout housemenu__autolaunch ${
              autoLaunch ? 'is-on' : ''
            }`}
            onClick={toggleAutoLaunch}
          >
            자동 시작 {autoLaunch ? 'ON' : 'OFF'}
          </button>
        )}
        <button
          type="button"
          className="housemenu__logout"
          onClick={() => logout()}
        >
          로그아웃
        </button>
      </div>

      <div className="housemenu__side housemenu__side--left">
        <button
          type="button"
          className="special"
          style={{ backgroundImage: `url(${marketFrameUrl()})` }}
          onClick={toggleMarket}
        >
          <img className="special__icon" src={marketIconUrl()} alt="" />
          <span className="special__label">시장</span>
        </button>
      </div>

      <div className="housemenu__side housemenu__side--right">
        <button
          type="button"
          className="special"
          style={{ backgroundImage: `url(${shopFrameUrl()})` }}
          onClick={toggleShop}
        >
          <img className="special__icon" src={shopIconUrl()} alt="" />
          <span className="special__label">상점</span>
        </button>
      </div>
    </div>
  )
}
