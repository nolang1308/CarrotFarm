import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useAuthStore } from '../../store/authStore'
import { useModalAnim } from '../../hooks/useModalAnim'
import '../../styles/Settings.scss'

/** 설정 모달: 자동 시작 토글 + 로그아웃 */
export default function Settings() {
  const open = useGameStore((s) => s.settingsOpen)
  const toggle = useGameStore((s) => s.toggleSettings)
  const logout = useAuthStore((s) => s.logout)
  const { mounted, closing } = useModalAnim(open)

  // 자동 시작 (Electron 에서만; 브라우저에선 줄 자체를 숨김)
  const [autoLaunch, setAutoLaunch] = useState<boolean | null>(null)
  useEffect(() => {
    if (!open) return
    window.electronAPI?.getAutoLaunch().then(setAutoLaunch)
  }, [open])

  if (!mounted) return null

  const toggleAutoLaunch = async () => {
    if (autoLaunch == null) return
    const applied = await window.electronAPI!.setAutoLaunch(!autoLaunch)
    setAutoLaunch(applied)
  }

  return (
    <div className={`settings ${closing ? 'is-closing' : ''}`} onClick={toggle}>
      <div
        className={`settings__panel ${closing ? 'is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings__title">설정</div>

        {autoLaunch != null && (
          <div className="settings__row">
            <div className="settings__label">
              자동 시작
              <span className="settings__hint">컴퓨터를 켜면 농장도 함께</span>
            </div>
            <button
              type="button"
              className={`settings__switch ${autoLaunch ? 'is-on' : ''}`}
              onClick={toggleAutoLaunch}
            >
              {autoLaunch ? 'ON' : 'OFF'}
            </button>
          </div>
        )}

        <div className="settings__row">
          <div className="settings__label">
            계정
            <span className="settings__hint">농장은 계정에 저장돼 있어요</span>
          </div>
          <button
            type="button"
            className="settings__logout"
            onClick={() => logout()}
          >
            로그아웃
          </button>
        </div>

        <button type="button" className="settings__close" onClick={toggle}>
          닫기
        </button>
      </div>
    </div>
  )
}
