import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../store/gameStore'
import { viewPan } from '../../game/viewPan'
import { coinBarAnchor } from './RabbitHouse'

const MARGIN = 14 // 밭/요소 주변 여백(px)
const MODAL_MARGIN = 24 // 중앙 팝업 주변 여백(px)

/**
 * 밭(땅)의 화면상 크기에 맞춰 Electron 창을 리사이즈한다.
 * 직교 카메라라 "월드 1유닛 = zoom 픽셀"로 창 크기와 무관하게 계산되어
 * 리사이즈 피드백 루프가 생기지 않는다. (브라우저에선 아무것도 안 함)
 */
export default function WidgetResizer() {
  const { camera } = useThree()
  const last = useRef({ w: 0, h: 0 })
  const right = useRef(new THREE.Vector3())
  const up = useRef(new THREE.Vector3())

  useFrame(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return
    const st = useGameStore.getState()
    const tiles = st.tiles
    if (tiles.length === 0) return

    // 밭 그리드 범위 → 원점 중심 반경(월드 유닛)
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const t of tiles) {
      if (t.x < minX) minX = t.x
      if (t.x > maxX) maxX = t.x
      if (t.z < minZ) minZ = t.z
      if (t.z > maxZ) maxZ = t.z
    }
    const halfX = (maxX - minX) / 2 + 0.5
    const halfZ = (maxZ - minZ) / 2 + 0.5
    const minY = -0.2
    const maxY = st.buildings.length > 0 ? 3.0 : 0.5 // 집 높이 포함

    // 카메라의 화면 오른쪽/위 축 (월드 기준)
    right.current.setFromMatrixColumn(camera.matrixWorld, 0)
    up.current.setFromMatrixColumn(camera.matrixWorld, 1)
    const zoom = (camera as THREE.OrthographicCamera).zoom

    // 밭 바운딩 박스 8모서리를 화면축에 투영 → 픽셀 범위
    let minSx = Infinity
    let maxSx = -Infinity
    let minSy = Infinity
    let maxSy = -Infinity
    for (const x of [-halfX, halfX]) {
      for (const z of [-halfZ, halfZ]) {
        for (const y of [minY, maxY]) {
          const sx =
            (x * right.current.x + y * right.current.y + z * right.current.z) *
            zoom
          const sy =
            (x * up.current.x + y * up.current.y + z * up.current.z) * zoom
          if (sx < minSx) minSx = sx
          if (sx > maxSx) maxSx = sx
          if (sy < minSy) minSy = sy
          if (sy > maxSy) maxSy = sy
        }
      }
    }

    // 밭의 화면 경계 (right/up-양수 기준). 밭은 원점 중심이라 대칭.
    let uLeft = minSx
    let uRight = maxSx
    let uBottom = minSy
    let uTop = maxSy

    // 집에 앵커된 DOM 요소(코인바·메뉴)를 합집합에 포함.
    // 집 화면위치는 계산으로, 요소 크기는 transform 영향 없는 offsetW/H 로 → 애니메이션 중에도 안 흔들림.
    const addAnchoredEl = (el: HTMLElement, wy: number) => {
      const b = st.buildings[0]
      const hxg = b.x + (b.w - 1) / 2 // 집 중심(그리드)
      const hzg = b.z + (b.h - 1) / 2
      const fcx = (minX + maxX) / 2
      const fcz = (minZ + maxZ) / 2
      const wx = hxg - fcx
      const wz = hzg - fcz
      const ax =
        (wx * right.current.x + wy * right.current.y + wz * right.current.z) *
        zoom
      const ay =
        (wx * up.current.x + wy * up.current.y + wz * up.current.z) * zoom
      const mw = el.offsetWidth / 2
      const mh = el.offsetHeight / 2
      uLeft = Math.min(uLeft, ax - mw)
      uRight = Math.max(uRight, ax + mw)
      uBottom = Math.min(uBottom, ay - mh)
      uTop = Math.max(uTop, ay + mh)
    }

    if (st.buildings.length > 0) {
      // 지붕 위 코인바: 항상 표시 → 돈 자릿수가 아무리 길어도 창이 다 담게 항상 포함
      // (메뉴가 열려 위로 비켜난 동안에는 현재 높이를 따라감)
      const coinEl = document.querySelector('.coinbar') as HTMLElement | null
      if (coinEl) addAnchoredEl(coinEl, coinBarAnchor.y)
      // 집 메뉴 (열려 있을 때만)
      if (st.panelOpen) {
        const menuEl = document.querySelector(
          '.housemenu',
        ) as HTMLElement | null
        if (menuEl) addAnchoredEl(menuEl, 1.5) // 1.5 = 메뉴 앵커 높이
      }
    }

    // 합집합 중심을 화면 중앙으로 옮기는 pan (대칭 여백 제거 + 코인바까지 중심 유지).
    // 땅 추가 모드에서는 0으로 → 마우스 레이캐스트/배치 조준이 어긋나지 않게.
    const ucx = (uLeft + uRight) / 2
    const ucy = (uBottom + uTop) / 2
    if (!st.buildMode) {
      const k = 1 / zoom
      viewPan.x = -(ucx * right.current.x + ucy * up.current.x) * k
      viewPan.y = -(ucx * right.current.y + ucy * up.current.y) * k
      viewPan.z = -(ucx * right.current.z + ucy * up.current.z) * k
    } else {
      viewPan.x = 0
      viewPan.y = 0
      viewPan.z = 0
    }

    // 튜토리얼 중: 창 크기를 넉넉한 고정값으로 잠근다 (스포트라이트가
    // 흔들리지 않게). 끝나면 아래의 동적 리사이즈로 복귀.
    if (!st.tutorialDone) {
      const tw = Math.min(660, window.screen.availWidth)
      const th = Math.min(660, window.screen.availHeight)
      if (
        Math.abs(tw - last.current.w) > 2 ||
        Math.abs(th - last.current.h) > 2
      ) {
        last.current = { w: tw, h: th }
        window.electronAPI.resizeTo(tw, th)
      }
      return
    }

    let w = uRight - uLeft + MARGIN * 2
    let h = uTop - uBottom + MARGIN * 2

    // 중앙 팝업(시장/상점)이 떠 있으면 실제 UI 크기를 측정해 잘리지 않게 창을 키움
    let modalEl: Element | null = null
    if (st.marketOpen) modalEl = document.querySelector('.market__panel')
    else if (st.shopOpen) modalEl = document.querySelector('.shop__panel')
    if (modalEl) {
      const el = modalEl as HTMLElement
      w = Math.max(w, el.offsetWidth + MODAL_MARGIN * 2)
      h = Math.max(h, el.offsetHeight + MODAL_MARGIN * 2)
    }


    // 디스플레이(작업 영역) 크기로 상한 → 그 이상은 창 고정, 확대만 계속
    w = Math.min(w, window.screen.availWidth)
    h = Math.min(h, window.screen.availHeight)

    w = Math.round(w)
    h = Math.round(h)
    if (Math.abs(w - last.current.w) > 2 || Math.abs(h - last.current.h) > 2) {
      last.current = { w, h }
      window.electronAPI.resizeTo(w, h)
    }
  })

  return null
}
