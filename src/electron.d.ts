export {}

declare global {
  interface Window {
    /** Electron preload 로 노출된 API (브라우저에서는 undefined) */
    electronAPI?: {
      resizeTo: (width: number, height: number) => void
      startWindowDrag: () => void
      moveWindow: (dx: number, dy: number) => void
      /** 자동 시작(로그인 시 실행) 여부 조회 */
      getAutoLaunch: () => Promise<boolean>
      /** 자동 시작 설정. 적용된 값을 반환 */
      setAutoLaunch: (enable: boolean) => Promise<boolean>
    }
  }
}
