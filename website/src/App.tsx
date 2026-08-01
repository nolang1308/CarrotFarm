import Hero from './components/Hero'
import Features from './components/Features'
import HowTo from './components/HowTo'
import Download from './components/Download'
import RankingBoard from './components/RankingBoard'
import DexBoard from './components/DexBoard'
import FeedbackBoard from './components/FeedbackBoard'
import Footer from './components/Footer'
import './styles/App.scss'

export default function App() {
  return (
    <div className="site">
      <Hero />
      {/* 다운로드는 첫 화면에서 바로 보이게 상단 배치 */}
      <Download />
      <RankingBoard />
      <Features />
      <DexBoard />
      <HowTo />
      <FeedbackBoard />
      <Footer />
    </div>
  )
}
