import {
  blackRabbitUrl,
  carrotUrl,
  coinUrl,
  landUrl,
  rabbitUrl,
  seedUrl,
} from '../pixel'
import '../styles/Features.scss'

interface Feature {
  icon: string
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  {
    icon: carrotUrl(),
    title: '전부 도트 그래픽',
    desc: '밭도, 당근도, 버튼도 전부 코드로 한 픽셀씩 그렸어요. 이 페이지의 그림들도 이미지 파일이 아니라 코드가 그린 거예요.',
  },
  {
    icon: landUrl(),
    title: '바탕화면 위젯',
    desc: '테두리 없는 투명 창이 밭 크기에 맞춰 스스로 늘고 줄어요. 집을 끌면 창이 통째로 따라옵니다.',
  },
  {
    icon: seedUrl(),
    title: '심고, 기다리고, 수확',
    desc: '좌클릭으로 씨앗을 심으면 5단계로 무럭무럭. 다 자란 당근은 우클릭 한 번에 쏙 뽑혀요.',
  },
  {
    icon: coinUrl(),
    title: '살아 있는 당근 시세',
    desc: '당근 값이 시시각각 오르내려요. 시장을 잘 지켜보다가 비쌀 때 전량 판매!',
  },
  {
    icon: rabbitUrl(),
    title: '토끼 알바생',
    desc: '흰 토끼는 다 자란 당근을 알아서 수확하고, 검은 토끼는 빈 밭에 씨앗을 심어줘요. 자동화 농장의 시작.',
  },
  {
    icon: blackRabbitUrl(),
    title: '클라우드 저장',
    desc: '계정으로 로그인하면 농장이 자동 저장돼요. 컴퓨터를 바꿔도 내 밭과 코인은 그대로.',
  },
]

/** 특징 6가지 카드 */
export default function Features() {
  return (
    <section className="features">
      <h2 className="features__heading">이런 게임이에요</h2>
      <div className="features__grid">
        {FEATURES.map((f) => (
          <div key={f.title} className="features__card">
            <img className="features__icon" src={f.icon} alt="" />
            <h3 className="features__title">{f.title}</h3>
            <p className="features__desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
