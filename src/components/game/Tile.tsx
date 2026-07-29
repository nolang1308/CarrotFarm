import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { type TileState, RIPE_STAGE, useGameStore } from '../../store/gameStore'
import { soilSideTexture, soilTopTexture } from '../../game/textures'
import { harvestDrag, plantDrag } from '../../game/dragState'
import Carrot from './Carrot'

interface TileProps {
  tile: TileState
  position: [number, number, number]
  /** 건물이 점유한 칸이면 심기/수확·호버 비활성 */
  occupied?: boolean
}

/**
 * 흙 한 칸 + 그 위에 자라는 당근.
 * BoxGeometry 의 6개 면에 각각 다른 픽셀 텍스처를 입힌다.
 * (면 순서: 0:+X 1:-X 2:+Y(윗면) 3:-Y(바닥) 4:+Z 5:-Z)
 */
export default function Tile({ tile, position, occupied = false }: TileProps) {
  const interactTile = useGameStore((s) => s.interactTile)
  const buildMode = useGameStore((s) => s.buildMode)
  const [hovered, setHovered] = useState(false)

  const top = soilTopTexture()
  const side = soilSideTexture()

  // 누르는 순간: 좌클릭=심기 / 우클릭=수확 + 각 드래그 시작
  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    // 땅 추가 모드거나 건물이 점유한 칸이면 심기/수확 안 함
    if (buildMode || occupied) return
    e.stopPropagation()
    if (e.button === 2) {
      // 우클릭: 수확
      harvestDrag.active = true
      if (tile.growth === RIPE_STAGE) interactTile(tile.x, tile.z)
    } else if (e.button === 0) {
      // 좌클릭: 심기
      plantDrag.active = true
      if (tile.growth === 0) interactTile(tile.x, tile.z)
    }
  }

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (buildMode || occupied) return
    setHovered(true)
    // 드래그 중이면 지나가는 칸에 심기/수확 (해당 상태의 칸만)
    if (plantDrag.active && tile.growth === 0) {
      interactTile(tile.x, tile.z)
    } else if (harvestDrag.active && tile.growth === RIPE_STAGE) {
      interactTile(tile.x, tile.z)
    }
  }

  // 호버 시 살짝 떠오르는 도트 게임 특유의 피드백
  const y = hovered && !buildMode ? position[1] + 0.06 : position[1]

  return (
    <group position={[position[0], y, position[2]]}>
      {/* 흙 블록 (면마다 다른 텍스처) */}
      <mesh
        castShadow
        receiveShadow
        onPointerDown={handleDown}
        onPointerOver={handleOver}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.94, 0.4, 0.94]} />
        <meshStandardMaterial attach="material-0" map={side} />
        <meshStandardMaterial attach="material-1" map={side} />
        <meshStandardMaterial
          attach="material-2"
          map={top}
          emissive="#ffcaa0"
          emissiveIntensity={hovered && !buildMode ? 0.35 : 0}
        />
        <meshStandardMaterial attach="material-3" map={side} />
        <meshStandardMaterial attach="material-4" map={side} />
        <meshStandardMaterial attach="material-5" map={side} />
      </mesh>

      {/* 작물 (반짝임 위상은 타일 좌표로 달리 줘서 다 같이 깜빡이지 않게) */}
      {tile.growth > 0 && (
        <Carrot
          growth={tile.growth}
          sparklePhase={((tile.x * 13 + tile.z * 7) % 8) / 4}
        />
      )}
    </group>
  )
}
