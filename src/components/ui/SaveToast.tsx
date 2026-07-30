import { useSaveToast } from '../../store/saveToast'
import '../../styles/SaveToast.scss'

/** 화면 왼쪽 아래에 잠깐 떴다 사라지는 저장 알림 */
export default function SaveToast() {
  const message = useSaveToast((s) => s.message)
  const seq = useSaveToast((s) => s.seq)

  if (seq === 0) return null

  return (
    <div key={seq} className="savetoast">
      {message}
    </div>
  )
}
