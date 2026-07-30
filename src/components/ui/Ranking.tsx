import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useAuthStore } from '../../store/authStore'
import {
  fetchRanking,
  flushFarm,
  type RankingResult,
} from '../../firebase/farmSync'
import {
  coinIconUrl,
  landIconUrl,
  speciesIconUrl,
  trophyIconUrl,
} from '../../game/textures'
import { countRole, speciesById } from '../../game/rabbitSpecies'
import { useModalAnim } from '../../hooks/useModalAnim'
import '../../styles/Ranking.scss'

/** 목록에 보여줄 상위 인원 */
const SHOW_TOP = 10

/** 닉네임은 중복될 수 있어서 UID 앞부분으로 구분 (전체는 툴팁) */
const shortUid = (uid: string) => uid.slice(0, 6)

/** 밭·토끼·검은 토끼 보유 수 (이름 아래 작은 줄) */
function Stats({
  land,
  rabbits,
  blackRabbits,
}: {
  land: number
  rabbits: number
  blackRabbits: number
}) {
  return (
    <span className="ranking__stats">
      <img src={landIconUrl()} alt="밭" />
      {land}
      <img src={speciesIconUrl(speciesById('white'))} alt="토끼" />
      {rabbits}
      <img src={speciesIconUrl(speciesById('black'))} alt="씨앗 토끼" />
      {blackRabbits}
    </span>
  )
}

/** 랭킹 모달: 코인 자산 기준 상위 목록 + 내 순위 */
export default function Ranking() {
  const open = useGameStore((s) => s.rankingOpen)
  const toggle = useGameStore((s) => s.toggleRanking)
  const { mounted, closing } = useModalAnim(open)

  const [result, setResult] = useState<RankingResult | null>(null)
  const [failed, setFailed] = useState(false)

  // 열 때마다 최신 순위 조회 (밀린 저장을 먼저 반영해 내 자산이 정확하게)
  useEffect(() => {
    if (!open) return
    const user = useAuthStore.getState().user
    if (!user) return
    setResult(null)
    setFailed(false)
    flushFarm()
      .then(() => fetchRanking(user.uid, useGameStore.getState().coins))
      .then(setResult)
      .catch((err) => {
        console.error('랭킹 조회 실패:', err)
        setFailed(true)
      })
  }, [open])

  if (!mounted) return null

  const myUid = useAuthStore.getState().user?.uid
  const game = useGameStore.getState()
  const myCoins = game.coins
  const top = result?.entries.slice(0, SHOW_TOP) ?? []
  const meInTop = top.some((e) => e.uid === myUid)

  return (
    <div className={`ranking ${closing ? 'is-closing' : ''}`} onClick={toggle}>
      <div
        className={`ranking__panel modal-panel ${closing ? 'is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ranking__title">
          <img src={trophyIconUrl()} alt="" />
          랭킹
        </div>

        {result && (
          <div className="ranking__me">
            내 순위 <b>{result.myRank.toLocaleString('en-US')}위</b>
            <span className="ranking__total">
              / 전체 {result.total.toLocaleString('en-US')}명
            </span>
          </div>
        )}

        <div className="ranking__list">
          {!result && !failed && (
            <div className="ranking__loading">순위 불러오는 중...</div>
          )}
          {failed && (
            <div className="ranking__loading">
              랭킹을 불러오지 못했어요. 잠시 후 다시 열어주세요.
            </div>
          )}

          {top.map((e, i) => (
            <div
              key={e.uid}
              className={`ranking__row ${e.uid === myUid ? 'is-me' : ''}`}
            >
              <span className={`ranking__rank ranking__rank--${i + 1}`}>
                {i + 1}
              </span>
              <span className="ranking__info">
                <span className="ranking__name" title={e.uid}>
                  {e.name}
                  <span className="ranking__uid">({shortUid(e.uid)})</span>
                  {e.uid === myUid && ' 나'}
                </span>
                <Stats
                  land={e.land}
                  rabbits={e.rabbits}
                  blackRabbits={e.blackRabbits}
                />
              </span>
              <span className="ranking__coins">
                <img src={coinIconUrl()} alt="" />
                {e.coins.toLocaleString('en-US')}
              </span>
            </div>
          ))}

          {/* 내가 상위 목록 밖이면 구분선 아래에 내 줄 표시 */}
          {result && !meInTop && (
            <>
              <div className="ranking__gap">⋯</div>
              <div className="ranking__row is-me">
                <span className="ranking__rank">{result.myRank}</span>
                <span className="ranking__info">
                  <span className="ranking__name" title={myUid}>
                    나
                    {myUid && (
                      <span className="ranking__uid">({shortUid(myUid)})</span>
                    )}
                  </span>
                  <Stats
                    land={game.tiles.length}
                    rabbits={countRole(game.rabbitTypes, 'harvest')}
                    blackRabbits={countRole(game.rabbitTypes, 'plant')}
                  />
                </span>
                <span className="ranking__coins">
                  <img src={coinIconUrl()} alt="" />
                  {myCoins.toLocaleString('en-US')}
                </span>
              </div>
            </>
          )}
        </div>

        <button type="button" className="ranking__close" onClick={toggle}>
          닫기
        </button>
      </div>
    </div>
  )
}
