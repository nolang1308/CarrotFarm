import '../styles/HowTo.scss'

interface Control {
  input: string
  action: string
}

const CONTROLS: Control[] = [
  { input: '좌클릭 / 드래그', action: '씨앗 심기' },
  { input: '우클릭 / 드래그', action: '다 자란 당근 수확' },
  { input: '휠', action: '밭 확대 · 축소' },
  { input: '집 클릭', action: '시장 · 상점 메뉴 열기' },
  { input: '집 잡고 끌기', action: '위젯(창) 옮기기' },
]

/** 조작법 표 */
export default function HowTo() {
  return (
    <section className="howto">
      <h2 className="howto__heading">조작법은 이게 다예요</h2>
      <ul className="howto__list">
        {CONTROLS.map((c) => (
          <li key={c.input} className="howto__row">
            <span className="howto__input">{c.input}</span>
            <span className="howto__action">{c.action}</span>
          </li>
        ))}
      </ul>
      <p className="howto__note">
        처음 시작하면 친절한 튜토리얼이 심기부터 판매까지 하나씩 알려줘요.
      </p>
    </section>
  )
}
