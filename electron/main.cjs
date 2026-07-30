const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')

// ===================================================================
// 업데이트: 양 플랫폼 모두 electron-updater 로 자동 다운로드 → 재시작 시 설치
// (GitHub Releases 의 latest.yml / latest-mac.yml 을 업데이트 서버로 사용.
//  macOS 는 서명·공증된 빌드부터 자동 설치가 동작한다)
// ===================================================================
function setupAutoUpdate() {
  if (!app.isPackaged) return // 개발 중에는 확인 안 함
  try {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.on('update-downloaded', (info) => {
      dialog
        .showMessageBox({
          type: 'info',
          buttons: ['지금 재시작', '나중에'],
          defaultId: 0,
          title: '업데이트 준비 완료',
          message: `새 버전 v${info.version} 이 준비됐어요!`,
          detail:
            '지금 재시작하면 바로 적용됩니다. 나중에를 누르면 앱을 껐다 켤 때 적용돼요.',
        })
        .then((r) => {
          if (r.response === 0) autoUpdater.quitAndInstall()
        })
    })
    // 백그라운드로 확인·다운로드 (실패는 조용히 무시)
    autoUpdater.checkForUpdates().catch(() => {})
  } catch {
    /* updater 로드 실패 시 그냥 수동 업데이트 */
  }
}

// 집을 끌어 창을 옮기기: 드래그 시작 시 창 위치 기록 → 이동량만큼 setPosition
let dragOrigin = null
ipcMain.on('window-drag-start', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win || win.isDestroyed()) return
  const b = win.getBounds()
  dragOrigin = { x: b.x, y: b.y }
})
ipcMain.on('window-drag-move', (e, { dx, dy }) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win || win.isDestroyed() || !dragOrigin) return
  win.setPosition(dragOrigin.x + dx, dragOrigin.y + dy)
})

// 렌더러의 종료 요청 (설정 모달의 종료 버튼)
ipcMain.on('quit-app', () => {
  app.quit()
})

// ===== 자동 시작 (컴퓨터 켜면 앱도 실행) =====
// 개발 실행(app.isPackaged=false)에서는 개발용 Electron 바이너리가 OS 로그인
// 항목에 등록되면 안 되므로, 메모리 상태로만 토글을 흉내낸다 (UI 확인용).
let devAutoLaunch = false

ipcMain.handle('get-auto-launch', () => {
  if (!app.isPackaged) return devAutoLaunch
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('set-auto-launch', (_e, enable) => {
  if (!app.isPackaged) {
    devAutoLaunch = Boolean(enable)
    return devAutoLaunch
  }
  app.setLoginItemSettings({ openAtLogin: Boolean(enable) })
  return app.getLoginItemSettings().openAtLogin
})

// 렌더러가 계산한 밭 크기에 맞춰 창을 리사이즈 (중심 유지)
ipcMain.on('resize-window', (e, { width, height }) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win || win.isDestroyed()) return
  const w = Math.max(120, Math.round(width))
  const h = Math.max(120, Math.round(height))
  const b = win.getBounds()
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  win.setBounds({
    x: Math.round(cx - w / 2),
    y: Math.round(cy - h / 2),
    width: w,
    height: h,
  })
})

// 빌드된 dist 를 로드할지 여부
// - 패키지된 앱: 항상 dist
// - `npm start`: ELECTRON_LOAD_DIST=1 로 강제 dist
// - `npm run electron:dev`: 둘 다 아니므로 vite 개발 서버 사용
const useDist = app.isPackaged || process.env.ELECTRON_LOAD_DIST === '1'

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 600,
    minWidth: 120,
    minHeight: 120,
    title: 'CarrotFarm',
    // 위젯처럼: 창 프레임/타이틀바 제거 + 투명 배경
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // 위젯이 다른 창에 가려지거나 포커스를 잃어도 게임 루프(토끼·시세·성장 틱)가
      // 멈추지 않게 백그라운드 스로틀링을 끈다
      backgroundThrottling: false,
    },
  })

  if (useDist) {
    // vite base: './' 로 빌드했으므로 file:// 로 로드 가능
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  } else {
    win.loadURL('http://127.0.0.1:5173')
  }
}

app.whenReady().then(() => {
  createWindow()
  setupAutoUpdate()

  // macOS: 독 아이콘 클릭 시 창이 없으면 다시 생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// macOS 외에는 모든 창이 닫히면 앱 종료
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
