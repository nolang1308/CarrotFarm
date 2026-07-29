const { contextBridge, ipcRenderer } = require('electron')

// 렌더러 → 메인: 창 크기 조절 요청만 안전하게 노출
contextBridge.exposeInMainWorld('electronAPI', {
  resizeTo: (width, height) =>
    ipcRenderer.send('resize-window', {
      width: Math.round(width),
      height: Math.round(height),
    }),
  // 창 드래그(집을 끌어 창 이동)
  startWindowDrag: () => ipcRenderer.send('window-drag-start'),
  moveWindow: (dx, dy) =>
    ipcRenderer.send('window-drag-move', {
      dx: Math.round(dx),
      dy: Math.round(dy),
    }),
  // 자동 시작 (로그인 시 앱 실행) 조회/설정
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enable) => ipcRenderer.invoke('set-auto-launch', enable),
  // 앱 종료
  quitApp: () => ipcRenderer.send('quit-app'),
})
