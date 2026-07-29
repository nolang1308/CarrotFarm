import Hero from './components/Hero'
import Features from './components/Features'
import HowTo from './components/HowTo'
import Download from './components/Download'
import Footer from './components/Footer'
import './styles/App.scss'

export default function App() {
  return (
    <div className="site">
      <Hero />
      <Features />
      <HowTo />
      <Download />
      <Footer />
    </div>
  )
}
