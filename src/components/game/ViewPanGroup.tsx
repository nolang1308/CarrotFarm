import { type ReactNode, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { viewPan, viewPanCurrent } from '../../game/viewPan'

/** 자식(밭 등)을 viewPan 만큼 부드럽게 이동시키는 그룹 */
export default function ViewPanGroup({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const g = ref.current
    if (!g) return
    g.position.x = THREE.MathUtils.damp(g.position.x, viewPan.x, 18, delta)
    g.position.y = THREE.MathUtils.damp(g.position.y, viewPan.y, 18, delta)
    g.position.z = THREE.MathUtils.damp(g.position.z, viewPan.z, 18, delta)
    viewPanCurrent.x = g.position.x
    viewPanCurrent.y = g.position.y
    viewPanCurrent.z = g.position.z
  })

  return <group ref={ref}>{children}</group>
}
