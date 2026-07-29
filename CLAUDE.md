# CarrotFarm

React + TypeScript + SCSS + React Three Fiber(Three.js)로 만드는 아이소메트릭 농장 게임.

## ⭐ 최우선 규칙: 모든 것은 도트(픽셀) 그래픽

**이 프로젝트의 모든 그래픽과 모든 UI/UX는 도트(픽셀) 그래픽으로 만든다.** 예외 없음.

- 3D 씬의 오브젝트(밭 블럭, 작물 등), 이펙트, 그리고 HUD·버튼·메뉴 등 **UI/UX까지 전부 도트 스타일**로 통일한다.
- 매끈한(anti-aliased) 벡터/그라디언트 룩, 부드러운 3D 재질 룩은 지양한다.
- 새 그래픽 요소를 추가할 때는 **항상 도트로 먼저 생각**한다. 애매하면 도트로 간다.

### 도트 그래픽 구현 방식 (기존 패턴 따르기)

- **텍스처는 코드로 생성**: 외부 이미지 없이 `src/game/textures.ts`에서 캔버스에 한 픽셀씩 칠해 텍스처를 만든다. 새 그림도 여기에 `draw...` 함수 + 지연 생성 싱글턴으로 추가한다.
- **`NearestFilter` 필수**: 확대해도 픽셀이 뭉개지지 않게 `magFilter/minFilter = NearestFilter`, `generateMipmaps = false` (`toTexture` 헬퍼 사용).
- **결정론적 무늬**: 랜덤 무늬는 시드 고정(`makeRng`)으로 매번 같게.
- **식물/이펙트 등 평면 요소**: 카메라를 항상 바라보는 `<sprite>`(빌보드)에 픽셀 텍스처. `spriteMaterial`은 `toneMapped={false}`로 색 바램 방지, 투명은 `alphaTest`.
- **UI/UX(HUD 등)**: 픽셀 스타일 유지. 폰트도 픽셀 폰트를 우선 고려하고, 픽셀 룩을 해치는 부드러운 그림자/블러/그라디언트는 피한다.

## 코드 구조 규칙

- **tsx와 scss는 분리**한다. 컴포넌트는 `src/components/...`, 대응 스타일은 `src/styles/*.scss`에서 import.
- SCSS 변수/색은 `src/styles/_variables.scss`.
- 게임 상태는 zustand 스토어 `src/store/gameStore.ts`에 모은다.

## 주요 파일

- `src/game/textures.ts` — 모든 픽셀 텍스처 생성 (밭 흙, 잔디, 당근 성장 단계, 수확 아이콘, "+1" 라벨 등)
- `src/game/farmView.ts` — 밭 재중심 애니메이션 공유 오프셋(`farmOffset`)
- `src/game/dragState.ts` — 드래그 심기/수확 공유 플래그
- `src/store/gameStore.ts` — 코인·당근·타일·성장·수확 이펙트 상태 (+`FarmSave` 저장 스냅샷/`hydrate`)
- `src/store/authStore.ts` — Firebase 이메일/비밀번호 로그인 상태
- `src/firebase/farmSync.ts` — Firestore `farms/{uid}` 문서 저장/불러오기 (규칙: `firestore.rules`)
- `src/components/game/FarmSync.tsx` — 로그인 계정 농장 자동 저장(디바운스)/복원 루프
- `src/components/game/` — 3D 씬 (GameScene, Farm, Tile, Carrot, BuildLayer, HarvestEffect, GrowthLoop)
- `src/components/ui/` — HUD 등 UI

## 게임 규칙 요약

- **좌클릭/드래그 = 심기**, **우클릭/드래그 = 수확**, **휠 클릭 드래그 = 화면 이동**, **휠 = 확대/축소**
- 카메라: 직교(orthographic) 아이소 뷰, 회전 잠금. 밭 전체 바운딩 박스 중심이 항상 화면 중앙에 오도록 부드럽게 재정렬.
- 땅 확장: "땅 추가하기" 모드에서 기존 밭 **바로 옆(인접)** 빈 칸에만 설치.
- 작물 성장: 심은 시각 기준 **개별 성장**, 5단계 (초록 씨앗 → 꽃 → 조금 올라온 당근 → 반정도 올라온 당근 → 한 픽셀 더 올라온 당근(수확 가능)). 총 성장 시간 `GROW_TOTAL_MS`(1분), 튜토리얼 중엔 `TUTORIAL_GROW_TOTAL_MS`(5초).

## 개발

- `npm run dev` — 개발 서버
- `npm run build` — 타입체크 + 빌드 (변경 후 이걸로 검증)
