/**
 * 드래그 상태 공유 플래그.
 * 여러 Tile 을 가로지르며 심기/수확해야 해서 컴포넌트 밖 모듈에 둔다(리렌더 유발 없음).
 */
export const plantDrag = { active: false } // 좌클릭 드래그: 심기
export const harvestDrag = { active: false } // 우클릭 드래그: 수확
