import { useEffect, useState } from 'react'
import { fetchTopRanking, type RankEntry } from '../api'
import { blackRabbitUrl, coinUrl, landUrl, rabbitUrl } from '../pixel'
import '../styles/RankingBoard.scss'

/** 자동 갱신 주기(ms) — Firestore 읽기 절약을 위해 5분 */
const REFRESH_MS = 300_000

/** 닉네임 중복 구분용 UID 앞부분 */
const shortUid = (uid: string) => uid.slice(0, 6)

/** 실시간 랭킹 TOP 10 (5분마다 자동 갱신, 탭이 숨겨져 있으면 쉼) */
export default function RankingBoard() {
  const [entries, setEntries] = useState<RankEntry[] | null>(null)

  useEffect(() => {
    const load = () => {
      if (document.hidden) return // 백그라운드 탭은 읽기 낭비 방지
      fetchTopRanking(10)
        .then(setEntries)
        .catch(() => {}) // 실패 시 이전 목록 유지
    }
    load()
    const id = window.setInterval(load, REFRESH_MS)
    // 탭으로 돌아오면 바로 한 번 갱신
    document.addEventListener('visibilitychange', load)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', load)
    }
  }, [])

  // 아직 아무도 없으면 섹션 자체를 숨김
  if (entries != null && entries.length === 0) return null

  return (
    <section className="rankboard">
      <h2 className="rankboard__heading">실시간 랭킹 TOP 10</h2>
      <p className="rankboard__sub">코인 자산 순 · 5분마다 자동 갱신</p>

      <div className="rankboard__panel">
        {entries == null && (
          <p className="rankboard__loading">순위 불러오는 중...</p>
        )}
        {entries?.map((e, i) => (
          <div key={e.uid} className="rankboard__row">
            <span className={`rankboard__rank rankboard__rank--${i + 1}`}>
              {i + 1}
            </span>
            <span className="rankboard__info">
              <span className="rankboard__name" title={e.uid}>
                {e.name}
                <span className="rankboard__uid">({shortUid(e.uid)})</span>
              </span>
              <span className="rankboard__stats">
                <img src={landUrl()} alt="밭" />
                {e.land}
                <img src={rabbitUrl()} alt="토끼" />
                {e.rabbits}
                <img src={blackRabbitUrl()} alt="검은 토끼" />
                {e.blackRabbits}
              </span>
            </span>
            <span className="rankboard__coins">
              <img src={coinUrl()} alt="코인" />
              {e.coins.toLocaleString('en-US')}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
