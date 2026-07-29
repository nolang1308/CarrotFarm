/**
 * 화면 콘텐츠 이동량(월드). 집 메뉴가 열릴 때 밭+메뉴 합집합의 중심을
 * 화면 중앙으로 오게 해서 창의 대칭 여백을 없앤다. (평소엔 0)
 */
export const viewPan = { x: 0, y: 0, z: 0 }

/**
 * 지금 화면에 실제 적용된 pan (damp 애니메이션 중간값).
 * ViewPanGroup 이 매 프레임 기록 → 월드→화면 투영(튜토리얼 포커스)이 읽는다.
 */
export const viewPanCurrent = { x: 0, y: 0, z: 0 }
