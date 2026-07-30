import { useEffect, useState } from 'react'
import { blackRabbitUrl, carrotUrl, rabbitUrl } from '../pixel'
import { fetchFarmerCount } from '../feedback'
import '../styles/Hero.scss'

/** 첫 화면: 도트 당근 + 소개 문구 + 농부 수 */
export default function Hero() {
  const [farmers, setFarmers] = useState<number | null>(null)

  useEffect(() => {
    fetchFarmerCount()
      .then(setFarmers)
      .catch(() => {}) // 실패하면 그냥 안 보여줌
  }, [])
  return (
    <header className="hero">
      <div className="hero__art">
        <img className="hero__rabbit" src={rabbitUrl()} alt="" />
        <img className="hero__carrot" src={carrotUrl()} alt="당근" />
        <img className="hero__rabbit" src={blackRabbitUrl()} alt="" />
      </div>

      <h1 className="hero__title">
        당근농장 <span className="hero__beta">BETA</span>
      </h1>
      <p className="hero__tagline">바탕화면 위에서 자라는 도트 당근 농장 위젯</p>
      <p className="hero__sub">
        창 테두리도, 배경도 없이 바탕화면에 살포시 얹히는 작은 밭.
        <br />
        씨앗을 심고, 기다리고, 수확해서 시세 좋은 날 내다 파세요.
      </p>

      {farmers != null && farmers > 0 && (
        <p className="hero__farmers">
          현재 <b>{farmers.toLocaleString('en-US')}명</b>의 농부가
          사용중이에요!
        </p>
      )}
    </header>
  )
}
