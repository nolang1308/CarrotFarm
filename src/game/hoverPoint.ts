/**
 * 마우스 커서가 가리키는 밭 평면 위 월드 좌표 (매 프레임 갱신).
 * GameScene 의 HoverTracker 가 쓰고, 성장 게이지 등이 읽어
 * "커서 주변 일정 반경" 판정에 사용한다. (farmOffset 과 같은 패턴)
 */
export const hoverPoint = {
  x: 0,
  z: 0,
  /** 커서가 게임 화면 위에 있는지 (밖이면 게이지 숨김) */
  active: false,
}
