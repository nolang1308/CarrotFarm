import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Farm from './Farm'
import BuildLayer from './BuildLayer'
import GrowthLoop from './GrowthLoop'
import WidgetResizer from './WidgetResizer'
import ViewPanGroup from './ViewPanGroup'
import TutorialProjector from './TutorialProjector'
import { useGameStore } from '../../store/gameStore'
import { harvestDrag, plantDrag } from '../../game/dragState'
import '../../styles/GameScene.scss'

/**
 * 아이소메트릭 뷰의 핵심:
 * - `orthographic`: 원근 왜곡이 없는 직교 투영 카메라
 * - 카메라를 대각선 위쪽에 배치하고 씬 중앙(0,0,0)을 바라보게 함
 * - OrbitControls로 회전을 잠그면 고정된 아이소 앵글이 유지됨
 */
export default function GameScene() {
  // 튜토리얼 중에는 줌도 잠가 화면이 흔들리지 않게
  const tutorialDone = useGameStore((s) => s.tutorialDone)

  // 어디서 손을 떼든 드래그 심기/수확 종료
  useEffect(() => {
    const end = () => {
      plantDrag.active = false
      harvestDrag.active = false
    }
    window.addEventListener('pointerup', end)
    return () => window.removeEventListener('pointerup', end)
  }, [])

  return (
    // 우클릭 수확이 브라우저 컨텍스트 메뉴로 막히지 않게 기본 메뉴 차단
    <div
      className="game-scene"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        orthographic
        shadows
        // 위젯 모드: 캔버스를 투명하게(바탕화면이 비치도록)
        gl={{ alpha: true }}
        // 카메라를 iso 방향으로 멀찍이 물린다. 직교 투영이라 거리가 멀어도
        // 화면 크기는 zoom 으로만 정해져 그대로다. 이렇게 하면 밭이 커져도
        // (1) near/far 안에 들어와 잘리지 않고,
        // (2) 마우스 레이캐스트 원점이 밭 전체보다 앞에 있어 아래쪽까지 배치된다.
        camera={{ position: [1000, 1000, 1000], zoom: 55, near: 1, far: 4000 }}
      >
        {/* 배경색 없음 → 캔버스 투명 (위젯) */}

        {/* 조명 */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[8, 15, 6]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* 밭 + 배치 레이어 (메뉴 열릴 때 대칭 여백 제거용 pan 적용) */}
        <ViewPanGroup>
          <Farm />
          <BuildLayer />
        </ViewPanGroup>

        {/* 작물 성장 타이머 (렌더링 없음) */}
        <GrowthLoop />

        {/* 창 크기를 밭 크기에 맞춤 (Electron 위젯) */}
        <WidgetResizer />

        {/* 튜토리얼 포커스용 화면 좌표 계산 (렌더링 없음) */}
        <TutorialProjector />

        {/* 위젯 모드: 회전/이동은 잠그고, 휠로 땅 확대/축소만 허용.
            축소 한계 없음(minZoom 아주 작게), 확대는 창이 디스플레이에 닿으면
            창은 고정되고 밭만 계속 커진다(WidgetResizer 가 상한 처리). */}
        <OrbitControls
          makeDefault
          enableRotate={false}
          enablePan={false}
          enableZoom={tutorialDone}
          minZoom={0.2}
          maxZoom={4000}
        />
      </Canvas>
    </div>
  )
}
