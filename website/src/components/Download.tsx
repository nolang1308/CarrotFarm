import { carrotUrl } from '../pixel'
import '../styles/Download.scss'

const VERSION = '0.0.4'

/** 설치 파일은 GitHub Releases 에서 받는다 (대용량 배포의 표준) */
const RELEASE_BASE = `https://github.com/nolang1308/CarrotFarm/releases/download/v${VERSION}`

interface Target {
  os: string
  detail: string
  /** 다운로드 URL. null 이면 커밍순 */
  url: string | null
  label: string
  /** 호버 시 아래로 펼쳐지는 주의사항 */
  note: string
}

const TARGETS: Target[] = [
  {
    os: 'Windows',
    detail: 'Windows 10 이상 (64bit)',
    url: `${RELEASE_BASE}/CarrotFarm-Setup-${VERSION}.exe`,
    label: '.exe 받기',
    note: '설치 시 "Windows의 PC 보호" 경고가 뜰 수 있어요. [추가 정보] → [실행]을 누르면 정상 설치됩니다. 아직 서명 인증서가 없어서 뜨는 안내일 뿐, 안전해요.',
  },
  {
    os: 'macOS',
    detail: 'Apple Silicon (M1 이상)',
    url: `${RELEASE_BASE}/CarrotFarm-${VERSION}-arm64.dmg`,
    label: '.dmg 받기',
    note: 'Apple 공증을 받은 앱이라 경고 없이 바로 설치됩니다. dmg 를 열고 앱을 Applications 폴더로 끌어다 놓으세요.',
  },
  {
    os: 'macOS',
    detail: 'Intel',
    url: `${RELEASE_BASE}/CarrotFarm-${VERSION}.dmg`,
    label: '.dmg 받기',
    note: 'Apple 공증을 받은 앱이라 경고 없이 바로 설치됩니다. dmg 를 열고 앱을 Applications 폴더로 끌어다 놓으세요.',
  },
]

/** 카드 공통 내용 (호버 시 주의사항이 아래로 부드럽게 펼쳐짐) */
function CardBody({ t, soon }: { t: Target; soon?: boolean }) {
  return (
    <>
      <span className="download__os">{t.os}</span>
      <span className="download__detail">{t.detail}</span>
      <span className={`download__button ${soon ? 'download__button--soon' : ''}`}>
        {t.label}
      </span>
      <span className="download__notice">
        <span className="download__notice-inner">{t.note}</span>
      </span>
    </>
  )
}

/** 다운로드 섹션: Windows + macOS(커밍순) */
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
              <CardBody t={t} />
            </a>
          ) : (
            <div
              key={t.os + t.detail}
              className="download__card download__card--soon"
            >
              <CardBody t={t} soon />
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
