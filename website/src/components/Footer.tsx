import '../styles/Footer.scss'

/** 잔디 띠 + 저작권 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__grass" aria-hidden="true" />
      <p className="footer__text">
        © 2026 CarrotFarm · 이 페이지의 모든 그림은 코드가 그린 도트입니다
      </p>
    </footer>
  )
}
