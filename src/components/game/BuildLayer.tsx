import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { tileKey, useGameStore } from '../../store/gameStore'
import { farmOffset } from '../../game/farmView'
import { soilTopTexture } from '../../game/textures'

/** 격자 셀 좌표 */
interface Cell {
  x: number
  z: number
}

/**
 * 땅 추가 모드에서만 동작하는 레이어.
 * - 카메라를 따라다니는 투명 평면이 마우스를 받아 격자 셀로 스냅
 * - 누른 채 드래그하면 지나가는 칸마다 땅 설치 (붙어 있는 자리만, store가 판정)
 * - 호버 칸엔 반투명 미리보기(갈색=가능, 빨강=불가). 위치는 farmOffset 에 맞춰 매 프레임 보정
 */
export default function BuildLayer() {
  const buildMode = useGameStore((s) => s.buildMode)
  const tiles = useGameStore((s) => s.tiles)
  const addTile = useGameStore((s) => s.addTile)
  const setPlacing = useGameStore((s) => s.setPlacing)
  const [hover, setHover] = useState<Cell | null>(null)
  const planeRef = useRef<THREE.Mesh>(null)
  const ghostRef = useRef<THREE.Mesh>(null)
  const dragging = useRef(false)

  const occupied = useMemo(
    () => new Set(tiles.map((t) => tileKey(t.x, t.z))),
    [tiles],
  )

  // 캔버스 밖에서 손을 떼도 드래그가 확실히 끝나도록
  useEffect(() => {
    const end = () => {
      if (dragging.current) {
        dragging.current = false
        setPlacing(false)
      }
    }
    window.addEventListener('pointerup', end)
    return () => window.removeEventListener('pointerup', end)
  }, [setPlacing])

  useFrame((state) => {
    // 배치 평면: 화면 중앙(카메라가 바닥을 보는 지점)을 따라다님
    const plane = planeRef.current
    if (plane) {
      const cam = state.camera
      plane.position.x = cam.position.x - cam.position.y
      plane.position.z = cam.position.z - cam.position.y
    }
    // 고스트: 애니메이션 중인 밭 오프셋에 맞춰 위치 갱신 (밭과 함께 미끄러짐)
    const ghost = ghostRef.current
    if (ghost && hover) {
      ghost.position.x = hover.x + farmOffset.x
      ghost.position.z = hover.z + farmOffset.z
    }
  })

  if (!buildMode) return null

  /** 월드 좌표 → 격자 셀로 스냅 (그리드 = 월드 - farmOffset) */
  const worldToCell = (point: THREE.Vector3): Cell => ({
    x: Math.round(point.x - farmOffset.x),
    z: Math.round(point.z - farmOffset.z),
  })

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    dragging.current = true
    setPlacing(true)
    const cell = worldToCell(e.point)
    setHover(cell)
    addTile(cell.x, cell.z)
  }

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const cell = worldToCell(e.point)
    setHover(cell)
    if (dragging.current) addTile(cell.x, cell.z)
  }

  const handleUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    dragging.current = false
    setPlacing(false)
  }

  /** 빈 칸이면서 상하좌우 중 하나라도 기존 밭과 맞닿아 있으면 배치 가능 */
  const canPlace = hover
    ? !occupied.has(tileKey(hover.x, hover.z)) &&
      (occupied.has(tileKey(hover.x + 1, hover.z)) ||
        occupied.has(tileKey(hover.x - 1, hover.z)) ||
        occupied.has(tileKey(hover.x, hover.z + 1)) ||
        occupied.has(tileKey(hover.x, hover.z - 1)))
    : false
  const top = soilTopTexture()

  return (
    <group>
      {/* 마우스를 받는 투명 평면 (raycast만 되고 화면엔 안 보임) */}
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={() => setHover(null)}
      >
        {/* 크게 잡아 최대 축소에서도 화면 전체를 덮음 (카메라를 따라다님) */}
        <planeGeometry args={[4000, 4000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 반투명 미리보기 땅 (설치 가능한 칸에서만 표시) */}
      {hover && canPlace && (
        <mesh
          ref={ghostRef}
          position={[hover.x + farmOffset.x, 0, hover.z + farmOffset.z]}
        >
          <boxGeometry args={[0.94, 0.4, 0.94]} />
          <meshStandardMaterial map={top} transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  )
}
