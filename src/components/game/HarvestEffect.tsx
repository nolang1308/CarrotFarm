import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { type HarvestEffect as Fx, RIPE_STAGE } from '../../store/gameStore'
import {
  carrotIconTexture,
  carrotStageTexture,
  plusOneTexture,
} from '../../game/textures'

interface Props {
  fx: Fx
  onDone: (id: number) => void
}

/** 이펙트 지속 시간(초) */
const DURATION = 1.0

/**
 * 헤이데이식 수확 이펙트.
 * - 땅에 있던 당근이 그 자리에서 서서히 사라짐(페이드아웃)
 * - 완전한 당근이 부유하듯 위로 올라가며 사라짐
 * 다 재생되면 스스로 목록에서 제거(onDone).
 */
export default function HarvestEffect({ fx, onDone }: Props) {
  const risingRef = useRef<THREE.Sprite>(null)
  const labelRef = useRef<THREE.Sprite>(null)
  const groundMat = useRef<THREE.SpriteMaterial>(null)
  const risingMat = useRef<THREE.SpriteMaterial>(null)
  const labelMat = useRef<THREE.SpriteMaterial>(null)
  const elapsed = useRef(0)
  const finished = useRef(false)

  const ripeTexture = carrotStageTexture(RIPE_STAGE)
  const iconTexture = carrotIconTexture()
  const labelTexture = plusOneTexture()

  useFrame((_, delta) => {
    if (finished.current) return
    elapsed.current += delta
    const p = Math.min(elapsed.current / DURATION, 1)

    // 땅에 있던 당근: 제자리에서 페이드아웃
    if (groundMat.current) groundMat.current.opacity = 1 - p

    // 완전한 당근: 부유하듯 위로(easeOutQuad) 올라가며 후반부에 페이드
    const ease = 1 - (1 - p) * (1 - p)
    if (risingRef.current) risingRef.current.position.y = 0.9 + ease * 1.4
    if (risingMat.current) {
      risingMat.current.opacity = p < 0.45 ? 1 : 1 - (p - 0.45) / 0.55
    }

    // "+1" 라벨: 당근보다 조금 더 높이 떠오르며 페이드
    if (labelRef.current) labelRef.current.position.y = 1.5 + ease * 1.5
    if (labelMat.current) {
      labelMat.current.opacity = p < 0.4 ? 1 : 1 - (p - 0.4) / 0.6
    }

    if (p >= 1) {
      finished.current = true
      onDone(fx.id)
    }
  })

  return (
    <group position={[fx.x, 0, fx.z]}>
      {/* 땅에 있던 당근이 제자리에서 사라짐 */}
      <sprite position={[0, 0.85, 0]} scale={[1.3, 1.3, 1]}>
        <spriteMaterial
          ref={groundMat}
          map={ripeTexture}
          transparent
          alphaTest={0.01}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* 완전한 당근이 부유하며 올라감 */}
      <sprite ref={risingRef} position={[0, 0.9, 0]} scale={[1.15, 1.15, 1]}>
        <spriteMaterial
          ref={risingMat}
          map={iconTexture}
          transparent
          alphaTest={0.01}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* "+1" 숫자 팝업 (항상 위에 보이도록 depthTest 끔) */}
      <sprite ref={labelRef} position={[0, 1.5, 0]} scale={[1.1, 1.1, 1]}>
        <spriteMaterial
          ref={labelMat}
          map={labelTexture}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  )
}
