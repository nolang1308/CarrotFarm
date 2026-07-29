import { useGameStore } from '../../store/gameStore'
import '../../styles/BuildBar.scss'

/** 땅 추가 모드일 때 화면 위에 뜨는 안내 + 완료 버튼 (모드 종료) */
export default function BuildBar() {
  const buildMode = useGameStore((s) => s.buildMode)
  const toggleBuildMode = useGameStore((s) => s.toggleBuildMode)

  if (!buildMode) return null

  return (
    <div className="buildbar">
      <button
        type="button"
        className="buildbar__done"
        onClick={toggleBuildMode}
      >
        완료
      </button>
    </div>
  )
}
