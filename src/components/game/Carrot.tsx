import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  type TileState,
  RIPE_STAGE,
  growTotalMs,
  useGameStore,
} from '../../store/gameStore'
import {
  GAUGE_FILL_MAX,
  carrotStageTexture,
  growthGaugeTexture,
  sparkleTexture,
} from '../../game/textures'
import { farmOffset } from '../../game/farmView'
import { viewPanCurrent } from '../../game/viewPan'
import { hoverPoint } from '../../game/hoverPoint'

/** 게이지가 보이는 커서 반경 (월드 단위, 약 1.5칸) */
const GAUGE_HOVER_RADIUS = 1.6

/**
 * 타일 좌표 → 반짝임 위상. 타일마다 달리 줘서 다 같이 깜빡이지 않게 한다.
 * (Sparkle 의 elapsedTime * 2.5 와 더해지므로 범위는 아무 값이나 무방)
 */
export function sparklePhaseFor(x: number, z: number): number {
  return ((Math.abs(x * 13 + z * 7) % 8) / 8) * 2
}

/**
 * 자라는 동안 채워지는 노란 성장 게이지 (심은 시각 기준 연속 진행).
 * 항상 떠 있지 않고, 커서 주변 일정 반경(GAUGE_HOVER_RADIUS) 안에
 * 들어온 당근만 보여준다.
 */
function GrowthGauge({
  plantedAt,
  gx,
  gz,
}: {
  plantedAt: number
  gx: number
  gz: number
}) {
  const ref = useRef<THREE.Sprite>(null)
  const tutorialDone = useGameStore((s) => s.tutorialDone)

  useFrame(() => {
    const gauge = ref.current
    if (!gauge) return

    // 커서 반경 판정 (타일 월드 좌표 = 그리드 + farmOffset + viewPanCurrent)
    const dx = gx + farmOffset.x + viewPanCurrent.x - hoverPoint.x
    const dz = gz + farmOffset.z + viewPanCurrent.z - hoverPoint.z
    const visible =
      hoverPoint.active &&
      dx * dx + dz * dz <= GAUGE_HOVER_RADIUS * GAUGE_HOVER_RADIUS
    gauge.visible = visible
    if (!visible) return

    const progress = Math.min(
      1,
      (Date.now() - plantedAt) / growTotalMs(tutorialDone),
    )
    const tex = growthGaugeTexture(progress * GAUGE_FILL_MAX)
    const mat = gauge.material as THREE.SpriteMaterial
    if (mat.map !== tex) {
      mat.map = tex
      mat.needsUpdate = true
    }
  })

  return (
    <sprite
      ref={ref}
      visible={false}
      position={[0, 1.6, 0]}
      scale={[0.8, 0.8, 1]}
    >
      <spriteMaterial
        map={growthGaugeTexture(0)}
        transparent
        alphaTest={0.4}
        toneMapped={false}
        depthWrite={false}
      />
    </sprite>
  )
}

/** 수확 가능 반짝임: 작은 별 ↔ 큰 별 2프레임을 visible 토글로 깜빡임 */
function Sparkle({ phase }: { phase: number }) {
  const smallRef = useRef<THREE.Sprite>(null)
  const bigRef = useRef<THREE.Sprite>(null)

  useFrame(({ clock }) => {
    const frame = Math.floor(clock.elapsedTime * 2.5 + phase) % 2
    if (smallRef.current) smallRef.current.visible = frame === 0
    if (bigRef.current) bigRef.current.visible = frame === 1
  })

  return (
    <>
      <sprite ref={smallRef} position={[0.34, 1.42, 0]} scale={[0.5, 0.5, 1]}>
        <spriteMaterial
          map={sparkleTexture(0)}
          transparent
          alphaTest={0.4}
          toneMapped={false}
          depthWrite={false}
        />
      </sprite>
      <sprite
        ref={bigRef}
        visible={false}
        position={[0.34, 1.42, 0]}
        scale={[0.5, 0.5, 1]}
      >
        <spriteMaterial
          map={sparkleTexture(1)}
          transparent
          alphaTest={0.4}
          toneMapped={false}
          depthWrite={false}
        />
      </sprite>
    </>
  )
}

interface CarrotProps {
  growth: TileState['growth']
  /** 타일 그리드 좌표 (게이지의 커서 반경 판정용) */
  gx: number
  gz: number
  /** 씨를 심은 시각(ms) — 성장 게이지 진행 계산용 */
  plantedAt?: number
  /** 반짝임 깜빡임 위상 (sparklePhaseFor 로 생성) */
  sparklePhase?: number
}

/**
 * 성장 단계별 당근을 도트 스프라이트로 표시.
 * <sprite> 는 항상 카메라를 바라보므로(빌보드) 픽셀 아트가 정면으로 보인다.
 * 다 자란 당근 위에는 노란 스파클이 깜빡여 수확 가능함을 알린다.
 */
export default function Carrot({
  growth,
  gx,
  gz,
  plantedAt,
  sparklePhase = 0,
}: CarrotProps) {
  if (growth < 1) return null
  const texture = carrotStageTexture(growth)
  const ripe = growth === RIPE_STAGE

  return (
    <>
      <sprite position={[0, 0.85, 0]} scale={[1.3, 1.3, 1]}>
        <spriteMaterial
          map={texture}
          transparent
          alphaTest={0.4}
          toneMapped={false} // 톤 매핑으로 도트 색이 바래지 않게
        />
      </sprite>

      {/* 자라는 중: 커서 주변에서만 보이는 성장 게이지 / 다 자람: 반짝임 */}
      {!ripe && plantedAt != null && (
        <GrowthGauge plantedAt={plantedAt} gx={gx} gz={gz} />
      )}
      {ripe && <Sparkle phase={sparklePhase} />}
    </>
  )
}
