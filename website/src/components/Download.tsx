import { carrotUrl } from '../pixel'
import '../styles/Download.scss'

const VERSION = '0.0.1'

/** 설치 파일은 GitHub Releases 에서 받는다 (대용량 배포의 표준) */
const RELEASE_BASE = `https://github.com/nolang1308/CarrotFarm/releases/download/v${VERSION}`

interface Target {
  os: string
  detail: string
  /** 다운로드 URL. null 이면 아직 준비 중 */
  url: string | null
  label: string
}

const TARGETS: Target[] = [
  {
    os: 'macOS',
    detail: 'Apple Silicon (M1 이상)',
    url: `${RELEASE_BASE}/CarrotFarm-${VERSION}-arm64.dmg`,
    label: '.dmg 받기',
  },
  {
    os: 'macOS',
    detail: 'Intel',
    url: `${RELEASE_BASE}/CarrotFarm-${VERSION}.dmg`,
    label: '.dmg 받기',
  },
  {
    os: 'Windows',
    detail: 'Windows 10 이상 (64bit)',
    url: `${RELEASE_BASE}/CarrotFarm-Setup-${VERSION}.exe`,
    label: '.exe 받기',
  },
]

/** 다운로드 섹션: macOS(arm64/intel) + Windows */
export default function Download() {
  return (
    <section id="download" className="download">
      <h2 className="download__heading">다운로드</h2>
      <p className="download__version">
        <img src={carrotUrl()} alt="" />v{VERSION}
      </p>

      <div className="download__grid">
        {TARGETS.map((t) =>
          t.url ? (
            <a key={t.os + t.detail} className="download__card" href={t.url}>
              <span className="download__os">{t.os}</span>
              <span className="download__detail">{t.detail}</span>
              <span className="download__button">{t.label}</span>
            </a>
          ) : (
            <div
              key={t.os + t.detail}
              className="download__card download__card--soon"
            >
              <span className="download__os">{t.os}</span>
              <span className="download__detail">{t.detail}</span>
              <span className="download__button download__button--soon">
                {t.label}
              </span>
            </div>
          ),
        )}
      </div>

      <p className="download__note">
        설치 후 회원가입 한 번이면 농장이 클라우드에 자동 저장됩니다.
      </p>
    </section>
  )
}
