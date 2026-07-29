import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getFarmCenter, tileKey, useGameStore } from '../../store/gameStore'
import { farmOffset } from '../../game/farmView'
import Tile from './Tile'
import HarvestEffect from './HarvestEffect'
import RabbitHouse from './RabbitHouse'

/**
 * 밭 타일들을 하나의 그룹에 담고, 그룹 전체를 "밭 바운딩 박스 중심이 원점에
 * 오도록" 부드럽게(damp) 이동시킨다.
 * - 타일은 그리드 좌표 그대로 배치하고, 그룹 position 으로 중심을 맞춤
 * - 드래그 설치 중(isPlacing)에는 재중심을 멈춰 조준이 흔들리지 않게 하고,
 *   손을 떼면 새 중심으로 스르륵 이동
 * - 현재 오프셋을 farmOffset 에 기록 → BuildLayer 가 좌표/고스트를 맞춤
 */
export default function Farm() {
  const tiles = useGameStore((s) => s.tiles)
  const buildings = useGameStore((s) => s.buildings)
  const harvestEffects = useGameStore((s) => s.harvestEffects)
  const removeHarvestEffect = useGameStore((s) => s.removeHarvestEffect)
  const { cx, cz } = getFarmCenter(tiles)
  const groupRef = useRef<THREE.Group>(null)
  const initialized = useRef(false)

  // 건물이 점유한 칸 집합 (심기/수확 비활성)
  const occupied = useMemo(() => {
    const set = new Set<string>()
    for (const b of buildings) {
      for (let dx = 0; dx < b.w; dx++) {
        for (let dz = 0; dz < b.h; dz++) {
          set.add(tileKey(b.x + dx, b.z + dz))
        }
      }
    }
    return set
  }, [buildings])

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    const targetX = -cx
    const targetZ = -cz

    if (!initialized.current) {
      // 첫 프레임은 애니메이션 없이 바로 자리 잡기
      g.position.set(targetX, 0, targetZ)
      initialized.current = true
    } else if (!useGameStore.getState().isPlacing) {
      // 드래그 중이 아닐 때만 목표 중심으로 부드럽게 이동
      g.position.x = THREE.MathUtils.damp(g.position.x, targetX, 7, delta)
      g.position.z = THREE.MathUtils.damp(g.position.z, targetZ, 7, delta)
    }

    farmOffset.x = g.position.x
    farmOffset.z = g.position.z
  })

  return (
    <group ref={groupRef}>
      {tiles.map((tile) => (
        <Tile
          key={`${tile.x}-${tile.z}`}
          tile={tile}
          position={[tile.x, 0, tile.z]}
          occupied={occupied.has(tileKey(tile.x, tile.z))}
        />
      ))}

      {/* 수확 이펙트 (밭과 같은 그룹 → 그리드 좌표 그대로 사용) */}
      {harvestEffects.map((fx) => (
        <HarvestEffect key={fx.id} fx={fx} onDone={removeHarvestEffect} />
      ))}

      {/* 건물 */}
      {buildings.map((b) => (
        <RabbitHouse key={b.id} block={[b.x, b.z]} />
      ))}
    </group>
  )
}
