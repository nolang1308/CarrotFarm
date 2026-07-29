import GameScene from './components/game/GameScene'
import BuildBar from './components/ui/BuildBar'
import Market from './components/ui/Market'
import Shop from './components/ui/Shop'
import Settings from './components/ui/Settings'
import AuthScreen from './components/ui/AuthScreen'
import Tutorial from './components/ui/Tutorial'
import PriceTicker from './components/game/PriceTicker'
import FarmSync from './components/game/FarmSync'
import { useAuthStore } from './store/authStore'
import { useGameStore } from './store/gameStore'
import './styles/App.scss'

function App() {
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  const hydrated = useGameStore((s) => s.hydrated)

  // 저장된 로그인 세션 확인 중
  if (initializing) {
    return (
      <div className="app">
        <div className="auth-loading">불러오는 중...</div>
      </div>
    )
  }

  // 첫 실행/로그아웃 상태: 로그인·회원가입 화면
  if (!user) {
    return (
      <div className="app">
        <AuthScreen />
      </div>
    )
  }

  return (
    <div className="app">
      {/* 계정별 농장 저장/불러오기 루프 (렌더링 없음) */}
      <FarmSync />

      {hydrated ? (
        <>
          <GameScene />
          <BuildBar />
          <Market />
          <Shop />
          <Settings />
          {/* 첫 로그인 튜토리얼 (완료한 계정이면 아무것도 안 그림) */}
          <Tutorial />
          {/* 시세 실시간 갱신 루프 (렌더링 없음) */}
          <PriceTicker />
        </>
      ) : (
        <div className="auth-loading">농장 불러오는 중...</div>
      )}
    </div>
  )
}

export default App
