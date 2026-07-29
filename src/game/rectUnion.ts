import type { FocusRect } from '../store/tutorialStore'

/** 화면 좌표 점 */
export type Pt = [number, number]

/**
 * 겹치는 축 정렬 사각형들의 합집합 외곽선(직교 다각형 루프들)을 구한다.
 * 튜토리얼 스포트라이트에서 여러 타일 구멍을 "한 덩어리"로 뚫고
 * 테두리도 덩어리 외곽에만 그리기 위해 사용.
 *
 * 방식: 좌표 격자 분해 → 덮인 셀 표시 → 덮임/안덮임 경계 에지 수집
 * (덮인 쪽이 진행 방향의 왼쪽이 되도록 방향 부여) → 에지를 이어 루프 구성.
 */
export function unionOutline(rects: FocusRect[]): Pt[][] {
  if (rects.length === 0) return []
  // 부동소수 오차로 미세 틈이 생기지 않게 0.1px 로 양자화
  const q = (n: number) => Math.round(n * 10) / 10
  const rs = rects.map((r) => ({
    x0: q(r.left),
    y0: q(r.top),
    x1: q(r.left + r.width),
    y1: q(r.top + r.height),
  }))

  const xsSet = new Set<number>()
  const ysSet = new Set<number>()
  for (const r of rs) {
    xsSet.add(r.x0)
    xsSet.add(r.x1)
    ysSet.add(r.y0)
    ysSet.add(r.y1)
  }
  const xs = [...xsSet].sort((a, b) => a - b)
  const ys = [...ysSet].sort((a, b) => a - b)
  const nx = xs.length - 1
  const ny = ys.length - 1

  // 각 격자 셀이 사각형에 덮여 있는지 (셀 중심으로 판정)
  const cov: boolean[][] = []
  for (let j = 0; j < ny; j++) {
    const row: boolean[] = []
    for (let i = 0; i < nx; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2
      const cy = (ys[j] + ys[j + 1]) / 2
      row.push(rs.some((r) => cx > r.x0 && cx < r.x1 && cy > r.y0 && cy < r.y1))
    }
    cov.push(row)
  }
  const covered = (i: number, j: number) =>
    i >= 0 && i < nx && j >= 0 && j < ny && cov[j][i]

  // 경계 에지 수집 (덮인 쪽이 왼쪽이 되는 방향)
  interface Edge {
    x0: number
    y0: number
    x1: number
    y1: number
  }
  const edges: Edge[] = []
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i < nx; i++) {
      const below = covered(i, j)
      const above = covered(i, j - 1)
      if (below === above) continue
      const y = ys[j]
      const xa = xs[i]
      const xb = xs[i + 1]
      if (below) edges.push({ x0: xb, y0: y, x1: xa, y1: y })
      else edges.push({ x0: xa, y0: y, x1: xb, y1: y })
    }
  }
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j < ny; j++) {
      const right = covered(i, j)
      const left = covered(i - 1, j)
      if (right === left) continue
      const x = xs[i]
      const ya = ys[j]
      const yb = ys[j + 1]
      if (right) edges.push({ x0: x, y0: ya, x1: x, y1: yb })
      else edges.push({ x0: x, y0: yb, x1: x, y1: ya })
    }
  }

  // 시작점 → 에지 매핑으로 루프 연결
  const key = (x: number, y: number) => `${x},${y}`
  const byStart = new Map<string, Edge[]>()
  for (const e of edges) {
    const k = key(e.x0, e.y0)
    const arr = byStart.get(k)
    if (arr) arr.push(e)
    else byStart.set(k, [e])
  }

  const used = new Set<Edge>()
  const loops: Pt[][] = []
  for (const start of edges) {
    if (used.has(start)) continue
    const pts: Pt[] = []
    let cur: Edge | undefined = start
    while (cur) {
      used.add(cur)
      pts.push([cur.x0, cur.y0])
      const candidates: Edge[] = byStart.get(key(cur.x1, cur.y1)) ?? []
      cur = candidates.find((e) => !used.has(e))
    }
    if (pts.length >= 4) loops.push(simplify(pts))
  }
  return loops
}

/** 일직선 위 중간 점 제거 */
function simplify(pts: Pt[]): Pt[] {
  const n = pts.length
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n]
    const b = pts[i]
    const c = pts[(i + 1) % n]
    const collinear =
      (a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])
    if (!collinear) out.push(b)
  }
  return out.length >= 4 ? out : pts
}
