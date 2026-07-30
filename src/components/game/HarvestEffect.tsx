import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { type HarvestEffect as Fx, RIPE_STAGE } from '../../store/gameStore'
import {
  carrotIconTexture,
  carrotStageTexture,
  plusNumTexture,
  seedIconTexture,
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
 * - 완전한 당근 + "+1" 이 부유하듯 위로 올라가며 사라짐
 * - 씨앗이 함께 나왔으면(fx.seeds > 0) 오른쪽에서 씨앗 + 초록 "+N" 도 떠오름
 * 다 재생되면 스스로 목록에서 제거(onDone).
 */
export default function HarvestEffect({ fx, onDone }: Props) {
  const risingRef = useRef<THREE.Sprite>(null)
  const labelRef = useRef<THREE.Sprite>(null)
  const seedRef = useRef<THREE.Sprite>(null)
  const seedLabelRef = useRef<THREE.Sprite>(null)
  const groundMat = useRef<THREE.SpriteMaterial>(null)
  const risingMat = useRef<THREE.SpriteMaterial>(null)
  const labelMat = useRef<THREE.SpriteMaterial>(null)
  const seedMat = useRef<THREE.SpriteMaterial>(null)
  const seedLabelMat = useRef<THREE.SpriteMaterial>(null)
  const elapsed = useRef(0)
  const finished = useRef(false)

  const ripeTexture = carrotStageTexture(RIPE_STAGE)
  const iconTexture = carrotIconTexture()
  const labelTexture = plusNumTexture(1, 'yellow')
  const withSeeds = fx.seeds > 0

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

    // 씨앗 드랍: 오른쪽에서 살짝 늦게 따라 올라감
    if (withSeeds) {
      const pd = Math.max(0, Math.min(1, (p - 0.12) / 0.88)) // 0.12초 지연
      const easeD = 1 - (1 - pd) * (1 - pd)
      if (seedRef.current) seedRef.current.position.y = 0.7 + easeD * 1.3
      if (seedMat.current) {
        seedMat.current.opacity = pd < 0.45 ? 1 : 1 - (pd - 0.45) / 0.55
      }
      if (seedLabelRef.current) {
        seedLabelRef.current.position.y = 1.2 + easeD * 1.4
      }
      if (seedLabelMat.current) {
        seedLabelMat.current.opacity = pd < 0.4 ? 1 : 1 - (pd - 0.4) / 0.6
      }
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

      {/* 덤으로 나온 씨앗 + 초록 "+N" (당근 오른쪽에서 살짝 늦게) */}
      {withSeeds && (
        <>
          <sprite
            ref={seedRef}
            position={[0.5, 0.7, 0]}
            scale={[0.85, 0.85, 1]}
          >
            <spriteMaterial
              ref={seedMat}
              map={seedIconTexture()}
              transparent
              alphaTest={0.01}
              depthWrite={false}
              toneMapped={false}
              opacity={0}
            />
          </sprite>
          <sprite
            ref={seedLabelRef}
            position={[0.5, 1.2, 0]}
            scale={[0.95, 0.95, 1]}
          >
            <spriteMaterial
              ref={seedLabelMat}
              map={plusNumTexture(fx.seeds, 'green')}
              transparent
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
              opacity={0}
            />
          </sprite>
        </>
      )}
    </group>
  )
}
