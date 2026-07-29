import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { type TileState, RIPE_STAGE } from '../../store/gameStore'
import { carrotStageTexture, sparkleTexture } from '../../game/textures'

interface CarrotProps {
  growth: TileState['growth']
  /** 반짝임 깜빡임 위상(타일마다 달리 줘서 동시에 깜빡이지 않게) */
  sparklePhase?: number
}

/**
 * 성장 단계별 당근을 도트 스프라이트로 표시.
 * <sprite> 는 항상 카메라를 바라보므로(빌보드) 픽셀 아트가 정면으로 보인다.
 * 다 자란 당근 위에는 노란 스파클이 깜빡여 수확 가능함을 알린다.
 */
export default function Carrot({ growth, sparklePhase = 0 }: CarrotProps) {
  const sparkRef = useRef<THREE.Sprite>(null)

  // 스파클 2프레임 깜빡임 (작은 별 ↔ 큰 별)
  useFrame(({ clock }) => {
    const spark = sparkRef.current
    if (!spark) return
    const frame = Math.floor(clock.elapsedTime * 2.5 + sparklePhase) % 2
    const mat = spark.material as THREE.SpriteMaterial
    const tex = sparkleTexture(frame)
    if (mat.map !== tex) {
      mat.map = tex
      mat.needsUpdate = true
    }
  })

  if (growth < 1) return null
  const texture = carrotStageTexture(growth)
  const ripe = growth === RIPE_STAGE

  return (
    <group>
      <sprite position={[0, 0.85, 0]} scale={[1.3, 1.3, 1]}>
        <spriteMaterial
          map={texture}
          transparent
          alphaTest={0.4}
          toneMapped={false} // 톤 매핑으로 도트 색이 바래지 않게
        />
      </sprite>

      {/* 수확 가능 반짝임 (당근 오른쪽 위) */}
      {ripe && (
        <sprite ref={sparkRef} position={[0.34, 1.42, 0]} scale={[0.5, 0.5, 1]}>
          <spriteMaterial
            map={sparkleTexture(0)}
            transparent
            alphaTest={0.4}
            toneMapped={false}
            depthWrite={false}
          />
        </sprite>
      )}
    </group>
  )
}
