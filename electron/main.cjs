const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

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

  // macOS: 독 아이콘 클릭 시 창이 없으면 다시 생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// macOS 외에는 모든 창이 닫히면 앱 종료
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
