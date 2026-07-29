import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RIPE_STAGE, isCellOccupied, useGameStore } from '../../store/gameStore'
import {
  useTutorialStore,
  type FocusRect,
} from '../../store/tutorialStore'
import { farmOffset } from '../../game/farmView'
import { viewPanCurrent } from '../../game/viewPan'

/** 포커스 구멍 주변 여유(px) */
const PAD = 6

const v = new THREE.Vector3()

/**
 * 튜토리얼 포커스용: 밭(농사 가능한 타일별)·집·다 자란 당근의 월드 박스를
 * 화면 픽셀 사각형으로 투영해 tutorialStore 에 기록한다. 렌더링 없음.
 * (타일 월드 좌표 = 그리드 + farmOffset + viewPanCurrent)
 */
export default function TutorialProjector() {
  const tutorialDone = useGameStore((s) => s.tutorialDone)

  useFrame(({ camera, size }) => {
    if (tutorialDone) return
    const st = useGameStore.getState()
    const setRects = useTutorialStore.getState().setRects

    /** 월드 박스(그리드 기준 x/z 범위 + y 범위) → 화면 사각형 */
    const project = (
      gx0: number,
      gx1: number,
      gz0: number,
      gz1: number,
      y0: number,
      y1: number,
    ): FocusRect => {
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (const gx of [gx0, gx1]) {
        for (const gz of [gz0, gz1]) {
          for (const y of [y0, y1]) {
            v.set(
              gx + farmOffset.x + viewPanCurrent.x,
              y + viewPanCurrent.y,
              gz + farmOffset.z + viewPanCurrent.z,
            ).project(camera)
            const sx = (v.x * 0.5 + 0.5) * size.width
            const sy = (1 - (v.y * 0.5 + 0.5)) * size.height
            if (sx < minX) minX = sx
            if (sx > maxX) maxX = sx
            if (sy < minY) minY = sy
            if (sy > maxY) maxY = sy
          }
        }
      }
      return {
        left: minX - PAD,
        top: minY - PAD,
        width: maxX - minX + PAD * 2,
        height: maxY - minY + PAD * 2,
      }
    }

    // 밭: 집이 점유하지 않은(농사 가능한) 타일만 칸별로 — 집은 포커스에서 제외
    const farmRects: FocusRect[] = []
    for (const t of st.tiles) {
      if (isCellOccupied(st.buildings, t.x, t.z)) continue
      farmRects.push(
        project(t.x - 0.5, t.x + 0.5, t.z - 0.5, t.z + 0.5, -0.25, 0.55),
      )
    }
    setRects('farm', farmRects)

    // 집 (2x2 건물, 지붕·귀까지)
    const b = st.buildings[0]
    if (b) {
      setRects('house', [
        project(b.x - 0.5, b.x + b.w - 0.5, b.z - 0.5, b.z + b.h - 0.5, 0, 3.0),
      ])
    }

    // 다 자란 당근 (첫 번째)
    const ripe = st.tiles.find((t) => t.growth === RIPE_STAGE)
    if (ripe) {
      setRects('ripe', [
        project(ripe.x - 0.6, ripe.x + 0.6, ripe.z - 0.6, ripe.z + 0.6, -0.2, 1.6),
      ])
    }
  })

  return null
}
