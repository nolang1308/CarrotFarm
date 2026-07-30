import { type FormEvent, useEffect, useState } from 'react'
import { fetchFeedback, submitFeedback, type Feedback } from '../api'
import '../styles/FeedbackBoard.scss'

function formatDate(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

/** 베타 피드백: 작성 폼 + 최근 목록 */
export default function FeedbackBoard() {
  const [list, setList] = useState<Feedback[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = () => {
    fetchFeedback()
      .then((rows) => {
        setList(rows)
        setLoadFailed(false)
      })
      .catch(() => setLoadFailed(true))
  }

  useEffect(load, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const msg = message.trim()
    if (msg.length < 2) {
      setNotice('내용을 2자 이상 적어주세요.')
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      await submitFeedback(name.trim() || '익명 농부', msg.slice(0, 500))
      setMessage('')
      setNotice('소중한 피드백 감사합니다! 🥕')
      load()
    } catch {
      setNotice('저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="feedback" className="feedback">
      <h2 className="feedback__heading">베타 피드백</h2>
      <p className="feedback__sub">
        버그, 아이디어, 하고 싶은 말을 자유롭게 남겨주세요. 농장을 함께
        가꿔주시는 거예요!
      </p>

      <form className="feedback__form" onSubmit={handleSubmit}>
        <input
          className="feedback__name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="닉네임 (안 적으면 익명 농부)"
          maxLength={20}
          spellCheck={false}
        />
        <textarea
          className="feedback__message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="예) 토끼가 너무 귀여워요 / 이런 작물도 있었으면..."
          maxLength={500}
          rows={4}
        />
        <div className="feedback__form-foot">
          {notice && <span className="feedback__notice">{notice}</span>}
          <button className="feedback__submit" type="submit" disabled={busy}>
            {busy ? '보내는 중...' : '피드백 보내기'}
          </button>
        </div>
      </form>

      <div className="feedback__list">
        {list == null && !loadFailed && (
          <p className="feedback__empty">피드백 불러오는 중...</p>
        )}
        {loadFailed && (
          <p className="feedback__empty">
            목록을 불러오지 못했어요. 새로고침해 주세요.
          </p>
        )}
        {list?.length === 0 && (
          <p className="feedback__empty">
            아직 피드백이 없어요. 첫 번째 농부가 되어주세요!
          </p>
        )}
        {list?.map((f, i) => (
          <div key={`${f.createdAt}-${i}`} className="feedback__item">
            <div className="feedback__item-head">
              <span className="feedback__item-name">{f.name}</span>
              <span className="feedback__item-date">
                {formatDate(f.createdAt)}
              </span>
            </div>
            <p className="feedback__item-msg">{f.message}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
