import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { RIPE_STAGE, isCellOccupied, useGameStore } from '../../store/gameStore'
import HouseMenu from '../ui/HouseMenu'
import CoinBar from '../ui/CoinBar'
import { useModalAnim } from '../../hooks/useModalAnim'
import {
  HOUSE_COLORS,
  houseDoorwayTexture,
  houseWallTexture,
  houseWindowTexture,
  speciesFaceTexture,
} from '../../game/textures'
import {
  type RabbitSpecies,
  speciesById,
} from '../../game/rabbitSpecies'

interface RabbitHouseProps {
  /** 2x2 블록의 시작(좌상단) 그리드 셀 */
  block: [number, number]
}

const GROUND = 0.2
const DOORW = 0.62
const DOORH = 0.84
/** 지붕 위 코인 표시 기본 앵커 높이 */
export const COINBAR_Y = 3.5

/**
 * 코인바의 현재(애니메이션 중간값) 앵커 높이.
 * 집 메뉴가 열리면 메뉴와 겹치지 않게 위로 올라간다.
 * WidgetResizer 가 창 크기 계산에 이 값을 읽는다. (farmOffset 과 같은 패턴)
 */
export const coinBarAnchor = { y: COINBAR_Y }
const SPEED = 1.7
const OPEN_TIME = 0.3
const HARVEST_PAUSE = 0.3
const DISPATCH_EVERY = 0.35 // idle 토끼 파견 확인 주기(초)

// 집을 통과하지 않도록 하는 장애물(집 발자국) / 우회 모서리
const OB = 1.05
const CH = 1.35
const CORNERS: Array<[number, number]> = [
  [-CH, -CH],
  [CH, -CH],
  [CH, CH],
  [-CH, CH],
]

/** i번째 토끼가 나오는 문 앞 지점(약간씩 벌려 겹침 방지) */
function exitOf(i: number): [number, number] {
  return [((i % 3) - 1) * 0.3, 1.2]
}

interface Target {
  x: number // 집 로컬
  z: number
  gx: number // 그리드
  gz: number
}

type Phase = 'idle' | 'moving' | 'working' | 'returning'

/** 토끼가 하는 일: 흰 토끼=수확, 검은 토끼=씨앗 심기 */
type Job = 'harvest' | 'plant'

interface Worker {
  phase: Phase
  target: Target | null
  path: Array<[number, number]>
  pi: number
  timer: number
  time: number
  /** 이번 목표 칸에서 일(수확/심기)을 이미 했는지 */
  done: boolean
}

const ck = (gx: number, gz: number) => `${gx}-${gz}`

/** 선분이 원점 중심 정사각형([-h,h]^2)과 겹치는지 */
function segHitsBox(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  h: number,
): boolean {
  let tmin = 0
  let tmax = 1
  const axes: Array<[number, number]> = [
    [bx - ax, ax],
    [bz - az, az],
  ]
  for (const [d, s] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (s < -h || s > h) return false
    } else {
      let ta = (-h - s) / d
      let tb = (h - s) / d
      if (ta > tb) [ta, tb] = [tb, ta]
      tmin = Math.max(tmin, ta)
      tmax = Math.min(tmax, tb)
      if (tmin > tmax) return false
    }
  }
  return true
}

/** A→B 경로를 집을 피해 계산 (모서리 경유) */
function routeAround(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): Array<[number, number]> {
  if (!segHitsBox(ax, az, bx, bz, OB)) return [[bx, bz]]
  const pts: Array<[number, number]> = [[ax, az], [bx, bz], ...CORNERS]
  const n = pts.length
  const dist = new Array(n).fill(Infinity)
  const prev = new Array(n).fill(-1)
  const visited = new Array(n).fill(false)
  dist[0] = 0
  for (let iter = 0; iter < n; iter++) {
    let u = -1
    let best = Infinity
    for (let k = 0; k < n; k++) {
      if (!visited[k] && dist[k] < best) {
        best = dist[k]
        u = k
      }
    }
    if (u < 0) break
    visited[u] = true
    for (let v = 0; v < n; v++) {
      if (visited[v]) continue
      if (segHitsBox(pts[u][0], pts[u][1], pts[v][0], pts[v][1], OB)) continue
      const w = Math.hypot(pts[u][0] - pts[v][0], pts[u][1] - pts[v][1])
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w
        prev[v] = u
      }
    }
  }
  if (dist[1] === Infinity) return [[bx, bz]]
  const path: Array<[number, number]> = []
  let cur = 1
  while (cur !== -1 && cur !== 0) {
    path.push([pts[cur][0], pts[cur][1]])
    cur = prev[cur]
  }
  path.reverse()
  return path
}

function dampAngle(cur: number, target: number, lambda: number, dt: number) {
  let diff = target - cur
  diff = Math.atan2(Math.sin(diff), Math.cos(diff))
  return cur + diff * (1 - Math.exp(-lambda * dt))
}

/** obj 를 (tx,tz)로 이동(진행 방향으로 회전). 도착하면 true */
function moveToward(
  obj: THREE.Object3D,
  tx: number,
  tz: number,
  delta: number,
): boolean {
  const p = obj.position
  const dx = tx - p.x
  const dz = tz - p.z
  const d = Math.hypot(dx, dz)
  if (d < 0.05) return true
  obj.rotation.y = dampAngle(obj.rotation.y, Math.atan2(dx, dz), 10, delta)
  const step = SPEED * delta
  if (step >= d) {
    p.x = tx
    p.z = tz
    return true
  }
  p.x += (dx / d) * step
  p.z += (dz / d) * step
  return false
}

/** 토끼 귀 하나 */
function BunnyEar({
  x,
  colors,
}: {
  x: number
  colors: { body: string; ear: string }
}) {
  return (
    <group position={[x, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.11, 0.34, 0.09]} />
        <meshStandardMaterial color={colors.body} />
      </mesh>
      <mesh position={[0, 0.02, 0.05]}>
        <boxGeometry args={[0.05, 0.22, 0.02]} />
        <meshStandardMaterial color={colors.ear} />
      </mesh>
    </group>
  )
}

/** 3D 도트 토끼 모델 (가시성/위치/회전은 부모가 ref로 제어) */
function RabbitModel({ species }: { species: RabbitSpecies }) {
  const face = speciesFaceTexture(species)
  const colors = species.palette
  const white = colors.body
  return (
    <>
      <mesh position={[0, 0.17, 0]} castShadow>
        <boxGeometry args={[0.34, 0.34, 0.3]} />
        <meshStandardMaterial color={white} />
      </mesh>
      <mesh position={[0, 0.2, -0.16]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.08]} />
        <meshStandardMaterial color={white} />
      </mesh>
      <mesh position={[-0.09, 0.03, 0.13]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.16]} />
        <meshStandardMaterial color={white} />
      </mesh>
      <mesh position={[0.09, 0.03, 0.13]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.16]} />
        <meshStandardMaterial color={white} />
      </mesh>
      <mesh position={[0, 0.46, 0.03]} castShadow>
        <boxGeometry args={[0.36, 0.32, 0.32]} />
        <meshStandardMaterial attach="material-0" color={white} />
        <meshStandardMaterial attach="material-1" color={white} />
        <meshStandardMaterial attach="material-2" color={white} />
        <meshStandardMaterial attach="material-3" color={white} />
        <meshStandardMaterial attach="material-4" map={face} />
        <meshStandardMaterial attach="material-5" color={white} />
      </mesh>
      <group position={[0, 0.66, 0.03]}>
        <BunnyEar x={-0.1} colors={colors} />
        <BunnyEar x={0.1} colors={colors} />
      </group>
    </>
  )
}

/**
 * 토끼 집 (2x2). 보유한 토끼 마리수만큼 이 하나의 집에서 토끼가 나와
 * 서로 다른(가까운) 칸을 나눠 맡는다.
 * - 흰 토끼: 다 자란 당근을 수확
 * - 검은 토끼: 빈 흙을 찾아 씨앗을 심음 (씨앗이 있을 때만)
 */
export default function RabbitHouse({ block }: RabbitHouseProps) {
  const wall = houseWallTexture()
  const doorway = houseDoorwayTexture()
  const windowTex = houseWindowTexture()
  const interactTile = useGameStore((s) => s.interactTile)
  const rabbitTypes = useGameStore((s) => s.rabbitTypes)
  const total = rabbitTypes.length
  const togglePanel = useGameStore((s) => s.togglePanel)
  const closePanel = useGameStore((s) => s.closePanel)
  const panelOpen = useGameStore((s) => s.panelOpen)
  const menu = useModalAnim(panelOpen, 240)

  // 메뉴가 열려 있을 때, 메뉴 바깥을 누르면 닫기
  useEffect(() => {
    if (!panelOpen) return
    const onDown = (e: PointerEvent) => {
      // 튜토리얼 중엔 바깥 클릭으로 닫히지 않게 (실습 단계 소프트락 방지)
      if (!useGameStore.getState().tutorialDone) return
      const t = e.target as HTMLElement | null
      if (t && t.closest('.housemenu')) return // 메뉴 안 클릭은 유지
      useGameStore.getState().closePanel()
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [panelOpen])

  const cx = block[0] + 0.5
  const cz = block[1] + 0.5

  const doorRef = useRef<THREE.Group>(null)
  const coinbarRef = useRef<THREE.Group>(null)
  const rabbitRefs = useRef<Array<THREE.Group | null>>([])
  const workers = useRef<Worker[]>([])
  const doorOpen = useRef(0)
  const pollTimer = useRef(0)

  /** 통행 가능한 칸 집합 (밭 타일 중 건물이 점유하지 않은 곳) */
  const passableCells = (): Set<string> => {
    const st = useGameStore.getState()
    const set = new Set<string>()
    for (const t of st.tiles) {
      if (!isCellOccupied(st.buildings, t.x, t.z)) set.add(ck(t.x, t.z))
    }
    return set
  }

  /** (로컬 좌표) a→b 직선 구간이 전부 통행 칸 위인지 (경로 다듬기용) */
  const canWalkStraight = (
    ax: number,
    az: number,
    bx: number,
    bz: number,
    passable: Set<string>,
  ): boolean => {
    const d = Math.hypot(bx - ax, bz - az)
    const steps = Math.max(1, Math.ceil(d / 0.2))
    for (let i = 0; i <= steps; i++) {
      const x = ax + ((bx - ax) * i) / steps
      const z = az + ((bz - az) * i) / steps
      if (!passable.has(ck(Math.round(x + cx), Math.round(z + cz)))) {
        return false
      }
    }
    return true
  }

  /**
   * 밭 타일 위로만 걷는 경로 (그리드 BFS).
   * 땅이 상하좌우로만 이어지는 규칙 덕에 두 타일 사이 경로는 항상 있고,
   * 예외적으로 못 찾으면 기존 직선 우회(routeAround)로 폴백한다.
   * 반환 좌표는 집 로컬 기준, 마지막 점은 정확한 목적지.
   */
  const buildTilePath = (
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    toGx: number,
    toGz: number,
  ): Array<[number, number]> => {
    const passable = passableCells()

    // 시작 셀 (문 앞처럼 타일 밖이면 인접 통행 칸으로 스냅)
    let sx = Math.round(fromX + cx)
    let sz = Math.round(fromZ + cz)
    if (!passable.has(ck(sx, sz))) {
      const near = (
        [
          [sx + 1, sz],
          [sx - 1, sz],
          [sx, sz + 1],
          [sx, sz - 1],
        ] as Array<[number, number]>
      ).find(([a, b]) => passable.has(ck(a, b)))
      if (near) [sx, sz] = near
    }
    if (!passable.has(ck(sx, sz)) || !passable.has(ck(toGx, toGz))) {
      return routeAround(fromX, fromZ, toX, toZ)
    }

    // BFS (4방향)
    const startKey = ck(sx, sz)
    const goalKey = ck(toGx, toGz)
    const prev = new Map<string, string | null>([[startKey, null]])
    const coord = new Map<string, [number, number]>([[startKey, [sx, sz]]])
    const queue: Array<[number, number]> = [[sx, sz]]
    while (queue.length) {
      const [x, z] = queue.shift()!
      if (ck(x, z) === goalKey) break
      for (const [nx, nz] of [
        [x + 1, z],
        [x - 1, z],
        [x, z + 1],
        [x, z - 1],
      ] as Array<[number, number]>) {
        const k = ck(nx, nz)
        if (!passable.has(k) || prev.has(k)) continue
        prev.set(k, ck(x, z))
        coord.set(k, [nx, nz])
        queue.push([nx, nz])
      }
    }
    if (!prev.has(goalKey)) return routeAround(fromX, fromZ, toX, toZ)

    // 경로 복원 (그리드 → 로컬)
    const cells: Array<[number, number]> = []
    let cur: string | null = goalKey
    while (cur) {
      const [gx, gz] = coord.get(cur)!
      cells.push([gx - cx, gz - cz])
      cur = prev.get(cur) ?? null
    }
    cells.reverse()

    // 직선으로 이어도 타일을 벗어나지 않는 구간은 합쳐서 부드럽게
    const pts: Array<[number, number]> = []
    let from: [number, number] = [fromX, fromZ]
    let i = 0
    while (i < cells.length) {
      let j = cells.length - 1
      while (
        j > i &&
        !canWalkStraight(from[0], from[1], cells[j][0], cells[j][1], passable)
      ) {
        j--
      }
      pts.push(cells[j])
      from = cells[j]
      i = j + 1
    }
    pts[pts.length - 1] = [toX, toZ]
    return pts
  }

  /**
   * 현재 위치(px,pz)에서 가장 가까운, 아직 아무도 노리지 않은 일감 칸.
   * - harvest: 다 자란 당근
   * - plant: 빈 흙 (건물 칸 제외, 씨앗이 없으면 일감 없음)
   */
  const findNearestWork = (
    px: number,
    pz: number,
    claimed: Set<string>,
    job: Job,
  ): Target | null => {
    const state = useGameStore.getState()
    if (job === 'plant' && state.seeds <= 0) return null
    const wanted = job === 'harvest' ? RIPE_STAGE : 0
    let best: Target | null = null
    let bd = Infinity
    for (const t of state.tiles) {
      if (t.growth !== wanted) continue
      if (claimed.has(ck(t.x, t.z))) continue
      if (job === 'plant' && isCellOccupied(state.buildings, t.x, t.z)) continue
      const lx = t.x - cx
      const lz = t.z - cz
      const d = Math.hypot(lx - px, lz - pz)
      if (d < bd) {
        bd = d
        best = { x: lx, z: lz, gx: t.x, gz: t.z }
      }
    }
    return best
  }

  // 집을 누르고 끌면 창 이동, 짧게 클릭(안 끌면)하면 관리 패널 토글
  const handleHousePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return // 좌클릭만
    e.stopPropagation()
    const api = window.electronAPI
    api?.startWindowDrag()
    const start = {
      sx: e.nativeEvent.screenX,
      sy: e.nativeEvent.screenY,
      moved: false,
      // 누른 시점의 상태로 판정 (바깥-닫기 리스너가 먼저 닫아도 재오픈 안 되게)
      wasOpen: useGameStore.getState().panelOpen,
    }
    const onMove = (ev: PointerEvent) => {
      const dx = ev.screenX - start.sx
      const dy = ev.screenY - start.sy
      if (!start.moved && Math.hypot(dx, dy) > 4) start.moved = true
      if (start.moved) api?.moveWindow(dx, dy)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (start.moved) return // 끌었으면 창 이동만
      if (start.wasOpen) closePanel()
      else togglePanel()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  useFrame((state, delta) => {
    // ── 코인바: 메뉴가 열려 있으면 메뉴 위로 비켜나기 ──
    // 필요한 높이를 화면 픽셀로 재고 월드 y 로 환산: sy = dy * up.y * zoom
    const coinG = coinbarRef.current
    if (coinG) {
      let targetY = COINBAR_Y
      if (menu.mounted && !menu.closing) {
        const menuEl = document.querySelector('.housemenu') as HTMLElement | null
        const coinEl = document.querySelector('.coinbar') as HTMLElement | null
        if (menuEl && coinEl) {
          const zoom = (state.camera as THREE.OrthographicCamera).zoom
          // 카메라 화면 위쪽 축의 월드 y 성분 (직교 iso 뷰에서 ≈ 0.82)
          const upY = Math.max(0.2, state.camera.matrixWorld.elements[5])
          const needPx =
            menuEl.offsetHeight / 2 + coinEl.offsetHeight / 2 + 10
          // 메뉴 앵커(y=1.5) 위로 needPx 만큼 떨어진 월드 y
          targetY = Math.max(COINBAR_Y, 1.5 + needPx / (upY * zoom))
        }
      }
      coinG.position.y = THREE.MathUtils.damp(
        coinG.position.y,
        targetY,
        14,
        delta,
      )
      coinBarAnchor.y = coinG.position.y
    }

    // 워커 수를 전체 마리수(흰+검은)에 맞춤
    while (workers.current.length < total) {
      workers.current.push({
        phase: 'idle',
        target: null,
        path: [],
        pi: 0,
        timer: 0,
        time: 0,
        done: false,
      })
    }

    // 파견 확인 주기
    pollTimer.current += delta
    const canDispatch = pollTimer.current >= DISPATCH_EVERY
    if (canDispatch) pollTimer.current = 0

    // 이미 배정된 목표들(중복 방지)
    const claimed = new Set<string>()
    for (const w of workers.current) {
      if (w.target) claimed.add(ck(w.target.gx, w.target.gz))
    }

    for (let i = 0; i < total; i++) {
      const rabbit = rabbitRefs.current[i]
      const w = workers.current[i]
      if (!rabbit || !w) continue
      // 역할은 각 토끼의 종이 정한다
      const job: Job = speciesById(rabbitTypes[i]).role

      // idle: 일감이 있으면 파견
      if (w.phase === 'idle') {
        if (!canDispatch) {
          rabbit.visible = false
          continue
        }
        const [ex, ez] = exitOf(i)
        const t = findNearestWork(ex, ez, claimed, job)
        if (!t) {
          rabbit.visible = false
          continue
        }
        claimed.add(ck(t.gx, t.gz))
        w.target = t
        w.path = buildTilePath(ex, ez, t.x, t.z, t.gx, t.gz)
        w.pi = 0
        w.time = 0
        w.phase = 'moving'
        rabbit.position.set(ex, GROUND, ez)
        rabbit.rotation.y = Math.PI / 4
      }

      rabbit.visible = true
      w.time += delta
      const hop = Math.abs(Math.sin(w.time * 12)) * 0.05

      if (w.phase === 'moving' || w.phase === 'returning') {
        const wp = w.path[w.pi]
        const arrived = wp ? moveToward(rabbit, wp[0], wp[1], delta) : true
        rabbit.position.y = GROUND + hop
        if (arrived) {
          w.pi += 1
          if (w.pi >= w.path.length) {
            if (w.phase === 'moving') {
              w.phase = 'working'
              w.timer = 0
              w.done = false
            } else {
              w.phase = 'idle'
              w.target = null
              rabbit.visible = false
            }
          }
        }
      } else if (w.phase === 'working') {
        w.timer += delta
        rabbit.position.y = GROUND
        // 도착한 칸의 상태에 맞춰 interactTile 이 알아서 수확/심기를 처리
        if (!w.done && w.timer > 0.12 && w.target) {
          interactTile(w.target.gx, w.target.gz)
          w.done = true
        }
        if (w.timer > HARVEST_PAUSE) {
          if (w.target) claimed.delete(ck(w.target.gx, w.target.gz))
          const t = findNearestWork(
            rabbit.position.x,
            rabbit.position.z,
            claimed,
            job,
          )
          if (t) {
            claimed.add(ck(t.gx, t.gz))
            w.target = t
            w.path = buildTilePath(
              rabbit.position.x,
              rabbit.position.z,
              t.x,
              t.z,
              t.gx,
              t.gz,
            )
            w.pi = 0
            w.phase = 'moving'
          } else {
            const [ex, ez] = exitOf(i)
            w.target = null
            w.path = buildTilePath(
              rabbit.position.x,
              rabbit.position.z,
              ex,
              ez,
              Math.round(ex + cx),
              Math.round(ez + cz),
            )
            w.pi = 0
            w.phase = 'returning'
          }
        }
      }
    }

    // 문: 나와 있는 토끼가 하나라도 있으면 열림
    const anyActive = workers.current
      .slice(0, total)
      .some((w) => w.phase !== 'idle')
    const target = anyActive ? 1 : 0
    if (doorOpen.current < target) {
      doorOpen.current = Math.min(target, doorOpen.current + delta / OPEN_TIME)
    } else {
      doorOpen.current = Math.max(target, doorOpen.current - delta / OPEN_TIME)
    }
    if (doorRef.current) doorRef.current.rotation.y = -doorOpen.current * 1.7
  })

  return (
    <group position={[cx, 0, cz]} onPointerDown={handleHousePointerDown}>
      {/* 벽 */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 1.1, 1.9]} />
        <meshStandardMaterial attach="material-0" map={windowTex} />
        <meshStandardMaterial attach="material-1" map={wall} />
        <meshStandardMaterial attach="material-2" map={wall} />
        <meshStandardMaterial attach="material-3" map={wall} />
        <meshStandardMaterial attach="material-4" map={doorway} />
        <meshStandardMaterial attach="material-5" map={wall} />
      </mesh>

      {/* 지붕 */}
      <mesh position={[0, 1.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.6, 1.0, 4]} />
        <meshStandardMaterial color={HOUSE_COLORS.roof} flatShading />
      </mesh>

      {/* 토끼 귀 2개 */}
      <group position={[0.26, 2.4, -0.26]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.55, 0.16]} />
          <meshStandardMaterial color={HOUSE_COLORS.ear} />
        </mesh>
        <mesh position={[0.05, 0.02, 0.05]}>
          <boxGeometry args={[0.11, 0.36, 0.11]} />
          <meshStandardMaterial color={HOUSE_COLORS.earInner} />
        </mesh>
      </group>
      <group position={[-0.26, 2.4, 0.26]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.55, 0.16]} />
          <meshStandardMaterial color={HOUSE_COLORS.ear} />
        </mesh>
        <mesh position={[0.05, 0.02, 0.05]}>
          <boxGeometry args={[0.11, 0.36, 0.11]} />
          <meshStandardMaterial color={HOUSE_COLORS.earInner} />
        </mesh>
      </group>

      {/* 여닫는 문 */}
      <group ref={doorRef} position={[-DOORW / 2, GROUND, 0.96]}>
        <mesh position={[DOORW / 2, DOORH / 2, 0]} castShadow>
          <boxGeometry args={[DOORW, DOORH, 0.06]} />
          <meshStandardMaterial color="#9c6b3a" />
        </mesh>
        <mesh position={[DOORW - 0.1, DOORH / 2, 0.05]}>
          <boxGeometry args={[0.05, 0.05, 0.04]} />
          <meshStandardMaterial color="#ffd24a" />
        </mesh>
      </group>

      {/* 보유한 토끼들 (각자 자기 종의 색으로) */}
      {rabbitTypes.map((id, i) => (
        <group
          key={i}
          ref={(el) => {
            rabbitRefs.current[i] = el
            if (el && workers.current[i]?.phase === undefined) el.visible = false
          }}
        >
          <RabbitModel species={speciesById(id)} />
        </group>
      ))}

      {/* 지붕 위 상시 코인 표시 (메뉴가 열리면 useFrame 이 위로 올림) */}
      <group ref={coinbarRef} position={[0, COINBAR_Y, 0]}>
        <Html center zIndexRange={[15, 0]}>
          <CoinBar />
        </Html>
      </group>

      {/* 집에 붙는 메뉴 (위=자산 / 좌=시장 / 우=상점) */}
      {menu.mounted && (
        <Html position={[0, 1.5, 0]} center zIndexRange={[100, 0]}>
          <HouseMenu closing={menu.closing} />
        </Html>
      )}
    </group>
  )
}
