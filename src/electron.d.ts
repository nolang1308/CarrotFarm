export {}

declare global {
  interface Window {
    /** Electron preload 로 노출된 API (브라우저에서는 undefined) */
    electronAPI?: {
      resizeTo: (width: number, height: number) => void
      startWindowDrag: () => void
      moveWindow: (dx: number, dy: number) => void
    }
  }
}
