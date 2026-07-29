import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { type TileState, RIPE_STAGE } from '../../store/gameStore'
import { carrotStageTexture, sparkleTexture } from '../../game/textures'

/**
 * 타일 좌표 → 반짝임 위상. 타일마다 달리 줘서 다 같이 깜빡이지 않게 한다.
 * (Sparkle 의 elapsedTime * 2.5 와 더해지므로 범위는 아무 값이나 무방)
 */
export function sparklePhaseFor(x: number, z: number): number {
  return ((Math.abs(x * 13 + z * 7) % 8) / 8) * 2
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
  /** 반짝임 깜빡임 위상 (sparklePhaseFor 로 생성) */
  sparklePhase?: number
}

/**
 * 성장 단계별 당근을 도트 스프라이트로 표시.
 * <sprite> 는 항상 카메라를 바라보므로(빌보드) 픽셀 아트가 정면으로 보인다.
 * 다 자란 당근 위에는 노란 스파클이 깜빡여 수확 가능함을 알린다.
 */
export default function Carrot({ growth, sparklePhase = 0 }: CarrotProps) {
  if (growth < 1) return null
  const texture = carrotStageTexture(growth)

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

      {growth === RIPE_STAGE && <Sparkle phase={sparklePhase} />}
    </>
  )
}
