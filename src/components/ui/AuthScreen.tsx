import { type FormEvent, useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { isFirebaseConfigured } from '../../firebase/config'
import { carrotIconUrl } from '../../game/textures'
import '../../styles/AuthScreen.scss'

type Mode = 'login' | 'signup'

/** 첫 실행(비로그인) 시 보이는 로그인/회원가입 화면 */
export default function AuthScreen() {
  // 게임 중 위젯 모드로 작아진 창에서 로그아웃해도 폼이 잘리지 않게,
  // 이 화면이 뜨는 동안은 창을 넉넉한 고정 크기로 맞춘다.
  useEffect(() => {
    window.electronAPI?.resizeTo(
      Math.min(460, window.screen.availWidth),
      Math.min(720, window.screen.availHeight),
    )
  }, [])
  const busy = useAuthStore((s) => s.busy)
  const error = useAuthStore((s) => s.error)
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const clearError = useAuthStore((s) => s.clearError)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  // 비밀번호 확인 불일치 등 제출 전 검증 문구 (스토어 error 와 별도)
  const [localError, setLocalError] = useState<string | null>(null)

  const switchMode = (next: Mode) => {
    setMode(next)
    setLocalError(null)
    clearError()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setLocalError(null)
    if (!email.trim() || !password) {
      setLocalError('이메일과 비밀번호를 입력해 주세요.')
      return
    }
    if (mode === 'signup' && password !== password2) {
      setLocalError('비밀번호가 서로 달라요.')
      return
    }
    if (mode === 'login') await signIn(email, password)
    else await signUp(email, password)
  }

  const shownError = localError ?? error

  return (
    <div className="auth">
      <form className="auth__panel" onSubmit={handleSubmit}>
        <div className="auth__title">
          <img className="auth__ticon" src={carrotIconUrl()} alt="" />
          당근 농장
          <img className="auth__ticon" src={carrotIconUrl()} alt="" />
        </div>
        <div className="auth__subtitle">
          {mode === 'login'
            ? '돌아오셨군요! 밭이 기다리고 있어요.'
            : '새 농장주가 되어 보세요!'}
        </div>

        <div className="auth__tabs">
          <button
            type="button"
            className={`auth__tab ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            로그인
          </button>
          <button
            type="button"
            className={`auth__tab ${mode === 'signup' ? 'is-active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            회원가입
          </button>
        </div>

        <label className="auth__field">
          <span>이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="farmer@carrot.com"
            autoComplete="email"
            spellCheck={false}
          />
        </label>

        <label className="auth__field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
          />
        </label>

        {mode === 'signup' && (
          <label className="auth__field">
            <span>비밀번호 확인</span>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="한 번 더"
              autoComplete="new-password"
            />
          </label>
        )}

        {!isFirebaseConfigured && (
          <div className="auth__notice">
            Firebase 설정이 비어 있어요. <b>.env.local</b> 을 채운 뒤 다시
            실행해 주세요. (.env.example 참고)
          </div>
        )}

        {shownError && <div className="auth__error">{shownError}</div>}

        <button
          type="submit"
          className="auth__submit"
          disabled={busy || !isFirebaseConfigured}
        >
          {busy
            ? '잠시만요...'
            : mode === 'login'
              ? '농장 들어가기'
              : '농장 만들기'}
        </button>
      </form>
    </div>
  )
}
