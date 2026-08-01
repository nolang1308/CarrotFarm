import { RABBIT_SPECIES } from '../../../src/game/rabbitSpecies'
import { rabbitUrlFor } from '../pixel'
import '../styles/DexBoard.scss'

/** 토끼 도감 소개: 게임 속 10종의 친구들 */
export default function DexBoard() {
  const harvest = RABBIT_SPECIES.filter((sp) => sp.role === 'harvest')
  const plant = RABBIT_SPECIES.filter((sp) => sp.role === 'plant')

  return (
    <section className="dexboard">
      <h2 className="dexboard__heading">토끼 도감</h2>
      <p className="dexboard__sub">
        상점에서 토끼를 뽑으면 열 종의 친구들 중 하나가 나와요. 누굴 만날지는
        뽑기 운!
      </p>

      {[
        { label: '수확 토끼 — 다 자란 당근을 대신 뽑아줘요', list: harvest },
        { label: '씨앗 토끼 — 빈 밭에 알아서 씨앗을 심어줘요', list: plant },
      ].map(({ label, list }) => (
        <div key={label} className="dexboard__group">
          <div className="dexboard__label">{label}</div>
          <div className="dexboard__grid">
            {list.map((sp) => (
              <div
                key={sp.id}
                className={`dexboard__card ${
                  sp.rarity === 'rare' ? 'is-rare' : ''
                }`}
              >
                <img src={rabbitUrlFor(sp)} alt={sp.name} />
                <div className="dexboard__name">
                  {sp.name}
                  {sp.rarity === 'rare' && (
                    <span className="dexboard__star">★</span>
                  )}
                </div>
                <p className="dexboard__desc">{sp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
