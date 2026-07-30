import { useGameStore } from '../../store/gameStore'
import {
  RABBIT_SPECIES,
  type RabbitSpecies,
} from '../../game/rabbitSpecies'
import { speciesIconUrl } from '../../game/textures'
import { useModalAnim } from '../../hooks/useModalAnim'
import '../../styles/Dex.scss'

/** 도감 카드 한 장 (미발견은 실루엣 + ???) */
function DexCard({ sp, owned }: { sp: RabbitSpecies; owned: number }) {
  const found = owned > 0
  return (
    <div className={`dex__card ${found ? 'is-found' : ''}`}>
      <img
        className={`dex__portrait ${found ? '' : 'is-silhouette'}`}
        src={speciesIconUrl(sp)}
        alt=""
      />
      <div className="dex__name">
        {found ? sp.name : '???'}
        {found && sp.rarity === 'rare' && <span className="dex__rare">★</span>}
      </div>
      <div className="dex__desc">
        {found ? sp.desc : '아직 만나지 못했어요.'}
      </div>
      {found && <div className="dex__count">×{owned}</div>}
    </div>
  )
}

/** 토끼 도감: 발견한 종은 초상·설명, 미발견은 실루엣 */
export default function Dex() {
  const open = useGameStore((s) => s.dexOpen)
  const toggle = useGameStore((s) => s.toggleDex)
  const rabbitTypes = useGameStore((s) => s.rabbitTypes)
  const { mounted, closing } = useModalAnim(open)

  if (!mounted) return null

  const ownedOf = (id: string) => rabbitTypes.filter((t) => t === id).length
  const foundCount = RABBIT_SPECIES.filter((sp) => ownedOf(sp.id) > 0).length
  const harvestList = RABBIT_SPECIES.filter((sp) => sp.role === 'harvest')
  const plantList = RABBIT_SPECIES.filter((sp) => sp.role === 'plant')

  return (
    <div className={`dex ${closing ? 'is-closing' : ''}`} onClick={toggle}>
      <div
        className={`dex__panel modal-panel ${closing ? 'is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dex__title">토끼 도감</div>
        <div className="dex__progress">
          발견 {foundCount} / {RABBIT_SPECIES.length}
        </div>

        <div className="dex__section">수확 토끼</div>
        <div className="dex__grid">
          {harvestList.map((sp) => (
            <DexCard key={sp.id} sp={sp} owned={ownedOf(sp.id)} />
          ))}
        </div>

        <div className="dex__section">씨앗 토끼</div>
        <div className="dex__grid">
          {plantList.map((sp) => (
            <DexCard key={sp.id} sp={sp} owned={ownedOf(sp.id)} />
          ))}
        </div>

        <button type="button" className="dex__close" onClick={toggle}>
          닫기
        </button>
      </div>
    </div>
  )
}
