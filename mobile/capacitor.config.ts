import type { CapacitorConfig } from '@capacitor/cli'

/**
 * 당근농장 모바일 껍데기.
 * 게임 자체는 루트의 src/ 를 그대로 쓰고(빌드 결과 ../dist),
 * 여기는 네이티브(iOS/Android) 래핑만 담당한다.
 *
 * 사용법:
 *   npm run sync          # 게임 빌드 + 네이티브 프로젝트에 복사
 *   npm run open:ios      # Xcode 로 열기 (시뮬레이터/실기기 실행)
 *   npm run open:android  # Android Studio 로 열기
 */
const config: CapacitorConfig = {
  appId: 'com.carrotfarm.game',
  appName: '당근농장',
  webDir: '../dist',
}

export default config
