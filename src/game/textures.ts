import * as THREE from 'three'

/**
 * 도트(픽셀) 그래픽 텍스처 생성기.
 *
 * 핵심 아이디어:
 * - 작은 캔버스(예: 16x16 논리 픽셀)에 한 칸씩 색을 칠해 픽셀 아트를 그린다
 * - 그 캔버스를 THREE.CanvasTexture 로 감싸고 magFilter = NearestFilter 로 설정
 *   → 화면에서 크게 확대돼도 픽셀이 흐려지지 않고 또렷한 도트 느낌 유지
 * - 텍스처는 한 번만 만들어 모든 타일이 공유(성능)
 */

/** 결정론적 난수 (같은 시드 → 항상 같은 무늬. 텍스처가 매번 달라지지 않도록) */
function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

interface PixelCanvas {
  ctx: CanvasRenderingContext2D
  size: number
  scale: number
  canvas: HTMLCanvasElement
}

/** size x size 논리 픽셀 캔버스 생성 (scale = 한 픽셀을 몇 배로 그릴지) */
function makeCanvas(size: number, scale: number): PixelCanvas {
  const canvas = document.createElement('canvas')
  canvas.width = size * scale
  canvas.height = size * scale
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return { ctx, size, scale, canvas }
}

/** 한 칸(도트) 칠하기 */
function dot(pc: PixelCanvas, x: number, y: number, color: string): void {
  pc.ctx.fillStyle = color
  pc.ctx.fillRect(x * pc.scale, y * pc.scale, pc.scale, pc.scale)
}

/** 사각형 영역 채우기 (x0,y0)~(x1,y1) 포함 */
function fillRect(
  pc: PixelCanvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) dot(pc, x, y, color)
  }
}

/** 캔버스 → 픽셀 아트용 텍스처 (NearestFilter 로 또렷하게) */
function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ===== 팔레트 =====
const SOIL = {
  base: '#8a5a34',
  ridge: '#a9764c', // 이랑(밝은 두둑)
  furrow: '#6f4526', // 고랑(어두운 골)
  speckDark: '#5c3a20',
  speckLight: '#c08a5a',
}

const DIRT = {
  base: '#7a4e2c',
  dark: '#5f3c20',
  light: '#946037',
}

const GRASS = {
  base: '#7cb342',
  dark: '#5e9331',
  light: '#8fc94e',
  deep: '#4f8a2c',
}

/** 밭 윗면: 이랑/고랑이 있는 갈아엎은 흙 */
function buildSoilTop(): THREE.CanvasTexture {
  const pc = makeCanvas(16, 8)
  const rng = makeRng(7)
  for (let y = 0; y < pc.size; y++) {
    for (let x = 0; x < pc.size; x++) {
      // 4칸 주기로 이랑(두둑)–고랑 패턴
      let color = SOIL.base
      const m = y % 4
      if (m === 0) color = SOIL.ridge
      else if (m === 2) color = SOIL.furrow
      // 자잘한 흙 알갱이
      const r = rng()
      if (r < 0.06) color = SOIL.speckDark
      else if (r > 0.95) color = SOIL.speckLight
      dot(pc, x, y, color)
    }
  }
  return toTexture(pc.canvas)
}

/** 밭 옆면: 결이 있는 흙 (아래로 갈수록 어두움) */
function buildSoilSide(): THREE.CanvasTexture {
  const pc = makeCanvas(16, 8)
  const rng = makeRng(21)
  for (let y = 0; y < pc.size; y++) {
    for (let x = 0; x < pc.size; x++) {
      let color = DIRT.base
      const r = rng()
      if (r < 0.12) color = DIRT.dark
      else if (r > 0.9) color = DIRT.light
      // 맨 윗줄은 살짝 밝게(빛 받는 모서리)
      if (y === 0 && r > 0.4) color = DIRT.light
      // 아래쪽은 그늘
      if (y >= 13 && r < 0.5) color = DIRT.dark
      dot(pc, x, y, color)
    }
  }
  return toTexture(pc.canvas)
}

/** 바닥 잔디: 잔디 무늬 (넓은 평면에 반복 타일링) */
function buildGrass(): THREE.CanvasTexture {
  const pc = makeCanvas(16, 8)
  const rng = makeRng(99)
  for (let y = 0; y < pc.size; y++) {
    for (let x = 0; x < pc.size; x++) {
      let color = GRASS.base
      const r = rng()
      if (r < 0.14) color = GRASS.dark
      else if (r < 0.24) color = GRASS.light
      else if (r < 0.28) color = GRASS.deep
      dot(pc, x, y, color)
    }
  }
  const tex = toTexture(pc.canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(20, 20)
  return tex
}

// ===== 지연 생성 싱글턴 (최초 사용 시 1회만 생성, 이후 공유) =====
let _soilTop: THREE.CanvasTexture | null = null
let _soilSide: THREE.CanvasTexture | null = null
let _grass: THREE.CanvasTexture | null = null

export const soilTopTexture = (): THREE.CanvasTexture =>
  (_soilTop ??= buildSoilTop())
export const soilSideTexture = (): THREE.CanvasTexture =>
  (_soilSide ??= buildSoilSide())
export const grassTexture = (): THREE.CanvasTexture => (_grass ??= buildGrass())

// ===================================================================
// 당근 성장 단계 스프라이트 (배경 투명, 카메라를 바라보는 빌보드에 사용)
// 16x16 픽셀 도트 아트. 아래 두 줄(y=14,15) 근처가 흙 표면.
// ===================================================================
const PLANT = {
  soil: '#5f3c20',
  green: '#4caf50',
  greenDark: '#2e7d32',
  greenLight: '#81c784',
  orange: '#ff922b',
  orangeDark: '#e8590c',
  white: '#fdfdfd',
  yellow: '#ffe066',
}

/** 1단계 초록색 씨앗: 흙 위에 놓인 작은 초록 씨앗 */
function drawGreenSeed(pc: PixelCanvas): void {
  dot(pc, 7, 12, PLANT.greenLight)
  dot(pc, 8, 12, PLANT.greenLight)
  dot(pc, 6, 13, PLANT.green)
  dot(pc, 7, 13, PLANT.green)
  dot(pc, 8, 13, PLANT.green)
  dot(pc, 9, 13, PLANT.green)
  dot(pc, 7, 14, PLANT.greenDark)
  dot(pc, 8, 14, PLANT.greenDark)
}

/** 2단계 꽃: 줄기 없이 땅에 놓인 하얀 꽃 */
function drawFlower(pc: PixelCanvas): void {
  // 하얀 꽃잎 + 노란 꽃술 (땅바닥 가까이, 줄기 없음)
  dot(pc, 7, 10, PLANT.white)
  dot(pc, 6, 11, PLANT.white)
  dot(pc, 7, 11, PLANT.yellow)
  dot(pc, 8, 11, PLANT.white)
  dot(pc, 5, 12, PLANT.white)
  dot(pc, 6, 12, PLANT.yellow)
  dot(pc, 7, 12, PLANT.yellow)
  dot(pc, 8, 12, PLANT.yellow)
  dot(pc, 9, 12, PLANT.white)
  dot(pc, 6, 13, PLANT.white)
  dot(pc, 7, 13, PLANT.yellow)
  dot(pc, 8, 13, PLANT.white)
  dot(pc, 7, 14, PLANT.white)
  // 양옆에 작은 초록 잎
  dot(pc, 4, 13, PLANT.green)
  dot(pc, 10, 13, PLANT.green)
}

/** 3단계 조금 올라온 당근: 주황색이 정말 조금(끝만 살짝)만 보임 */
function drawCarrotLow(pc: PixelCanvas): void {
  // 잎
  dot(pc, 7, 9, PLANT.greenLight)
  dot(pc, 6, 10, PLANT.green)
  dot(pc, 7, 10, PLANT.green)
  dot(pc, 8, 10, PLANT.green)
  dot(pc, 5, 11, PLANT.greenLight)
  dot(pc, 6, 11, PLANT.green)
  dot(pc, 7, 11, PLANT.greenDark)
  dot(pc, 8, 11, PLANT.green)
  dot(pc, 9, 11, PLANT.greenLight)
  // 정말 조금 보이는 주황 당근 끝 (딱 두 픽셀)
  dot(pc, 7, 12, PLANT.orange)
  dot(pc, 8, 12, PLANT.orange)
  // 흙 표면
  dot(pc, 5, 12, PLANT.soil)
  dot(pc, 6, 12, PLANT.soil)
  dot(pc, 9, 12, PLANT.soil)
  dot(pc, 6, 13, PLANT.soil)
  dot(pc, 7, 13, PLANT.soil)
  dot(pc, 8, 13, PLANT.soil)
}

/** 4단계 반정도 올라온 당근: 주황 당근 끝이 봉긋하게 */
function drawCarrotHalf(pc: PixelCanvas): void {
  // 잎
  dot(pc, 7, 8, PLANT.greenLight)
  dot(pc, 6, 9, PLANT.green)
  dot(pc, 7, 9, PLANT.green)
  dot(pc, 8, 9, PLANT.green)
  dot(pc, 5, 10, PLANT.greenLight)
  dot(pc, 6, 10, PLANT.green)
  dot(pc, 7, 10, PLANT.greenDark)
  dot(pc, 8, 10, PLANT.green)
  dot(pc, 9, 10, PLANT.greenLight)
  // 봉긋하게 드러난 주황 당근 끝
  dot(pc, 6, 11, PLANT.orange)
  dot(pc, 7, 11, PLANT.orange)
  dot(pc, 8, 11, PLANT.orange)
  dot(pc, 7, 12, PLANT.orange)
  dot(pc, 8, 12, PLANT.orangeDark)
  // 흙 표면
  dot(pc, 5, 12, PLANT.soil)
  dot(pc, 9, 12, PLANT.soil)
}

/** 5단계 한 픽셀 더 올라온 당근: 4단계보다 한 줄 더 드러남 (수확 가능) */
function drawCarrotHigh(pc: PixelCanvas): void {
  // 잎 (한 픽셀 위로)
  dot(pc, 7, 7, PLANT.greenLight)
  dot(pc, 6, 8, PLANT.green)
  dot(pc, 7, 8, PLANT.green)
  dot(pc, 8, 8, PLANT.green)
  dot(pc, 5, 9, PLANT.greenLight)
  dot(pc, 6, 9, PLANT.green)
  dot(pc, 7, 9, PLANT.greenDark)
  dot(pc, 8, 9, PLANT.green)
  dot(pc, 9, 9, PLANT.greenLight)
  // 한 줄 더 드러난 주황 당근
  dot(pc, 6, 10, PLANT.orange)
  dot(pc, 7, 10, PLANT.orange)
  dot(pc, 8, 10, PLANT.orange)
  dot(pc, 6, 11, PLANT.orange)
  dot(pc, 7, 11, PLANT.orange)
  dot(pc, 8, 11, PLANT.orange)
  dot(pc, 7, 12, PLANT.orange)
  dot(pc, 8, 12, PLANT.orangeDark)
  // 결(어두운 주황)
  dot(pc, 7, 11, PLANT.orangeDark)
  // 흙 표면
  dot(pc, 5, 12, PLANT.soil)
  dot(pc, 9, 12, PLANT.soil)
}

/** 성장 단계 draw 함수 목록 (1~5단계 순서) */
const CARROT_DRAWERS = [
  drawGreenSeed,
  drawFlower,
  drawCarrotLow,
  drawCarrotHalf,
  drawCarrotHigh,
]

/** draw 함수 목록 → 16x16 스프라이트 프레임 텍스처들 (배경 투명) */
function buildFrames(
  drawers: Array<(pc: PixelCanvas) => void>,
): THREE.CanvasTexture[] {
  return drawers.map((draw) => {
    const pc = makeCanvas(16, 8)
    draw(pc)
    return toTexture(pc.canvas)
  })
}

let _carrots: THREE.CanvasTexture[] | null = null

/** 성장 단계(1~5)에 해당하는 당근 스프라이트 텍스처 */
export const carrotStageTexture = (stage: number): THREE.CanvasTexture => {
  _carrots ??= buildFrames(CARROT_DRAWERS)
  const i = Math.min(Math.max(stage, 1), CARROT_DRAWERS.length) - 1
  return _carrots[i]
}

/** 완전한 당근 아이콘 (수확 이펙트에서 부유하며 올라가는 그림) */
function drawCarrotIcon(pc: PixelCanvas): void {
  // 잎
  dot(pc, 7, 1, PLANT.greenLight)
  dot(pc, 6, 2, PLANT.green)
  dot(pc, 7, 2, PLANT.green)
  dot(pc, 8, 2, PLANT.green)
  dot(pc, 5, 3, PLANT.greenLight)
  dot(pc, 6, 3, PLANT.green)
  dot(pc, 7, 3, PLANT.greenDark)
  dot(pc, 8, 3, PLANT.green)
  dot(pc, 9, 3, PLANT.greenLight)
  dot(pc, 6, 4, PLANT.green)
  dot(pc, 7, 4, PLANT.green)
  dot(pc, 8, 4, PLANT.green)
  // 몸통(역삼각형)
  const rows: Array<[number, number, number]> = [
    [5, 5, 9],
    [6, 5, 9],
    [7, 5, 9],
    [8, 6, 8],
    [9, 6, 8],
    [10, 6, 8],
    [11, 7, 8],
    [12, 7, 7],
    [13, 7, 7],
  ]
  for (const [y, x0, x1] of rows) {
    for (let x = x0; x <= x1; x++) dot(pc, x, y, PLANT.orange)
  }
  // 결(어두운 주황)
  dot(pc, 6, 6, PLANT.orangeDark)
  dot(pc, 8, 8, PLANT.orangeDark)
  dot(pc, 7, 10, PLANT.orangeDark)
  dot(pc, 7, 12, PLANT.orangeDark)
}

let _carrotIcon: THREE.CanvasTexture | null = null

export const carrotIconTexture = (): THREE.CanvasTexture => {
  if (!_carrotIcon) {
    const pc = makeCanvas(16, 8)
    drawCarrotIcon(pc)
    _carrotIcon = toTexture(pc.canvas)
  }
  return _carrotIcon
}

// ===== 성장 게이지 (자라는 당근 위 노란 바) =====
const GAUGE = {
  frame: '#7a5320',
  inner: '#3f2d1c',
  fill: '#ffd24a',
  fillLight: '#ffe89a',
}

/** 게이지 안쪽 최대 채움 픽셀 수 */
export const GAUGE_FILL_MAX = 14

/** 16px 폭 바: 갈색 테두리 + 어두운 안쪽 + 노란 채움(fill px) */
function drawGauge(pc: PixelCanvas, fill: number): void {
  fillRect(pc, 0, 6, 15, 9, GAUGE.frame)
  fillRect(pc, 1, 7, 14, 8, GAUGE.inner)
  if (fill > 0) {
    fillRect(pc, 1, 8, fill, 8, GAUGE.fill)
    fillRect(pc, 1, 7, fill, 7, GAUGE.fillLight) // 윗줄 하이라이트
  }
}

const _gauge: Array<THREE.CanvasTexture | undefined> = []

/** 채움 단계(0~GAUGE_FILL_MAX)별 게이지 텍스처 (지연 생성) */
export const growthGaugeTexture = (fill: number): THREE.CanvasTexture => {
  const i = Math.max(0, Math.min(GAUGE_FILL_MAX, Math.round(fill)))
  if (!_gauge[i]) {
    const pc = makeCanvas(16, 8)
    drawGauge(pc, i)
    _gauge[i] = toTexture(pc.canvas)
  }
  return _gauge[i]!
}

// ===== 수확 가능 반짝임 (다 자란 당근 위 스파클, 2프레임 깜빡임) =====
const SPARK = {
  core: '#fff9d9',
  star: '#ffe066',
  edge: '#ffd24a',
}

/** 프레임 0: 작은 십자 별 */
function drawSparkSmall(pc: PixelCanvas): void {
  dot(pc, 8, 7, SPARK.star)
  dot(pc, 7, 8, SPARK.star)
  dot(pc, 9, 8, SPARK.star)
  dot(pc, 8, 9, SPARK.star)
  dot(pc, 8, 8, SPARK.core)
}

/** 프레임 1: 팔이 긴 4방향 별 + 대각 점 */
function drawSparkBig(pc: PixelCanvas): void {
  // 세로 팔
  dot(pc, 8, 5, SPARK.edge)
  dot(pc, 8, 6, SPARK.star)
  dot(pc, 8, 7, SPARK.star)
  dot(pc, 8, 9, SPARK.star)
  dot(pc, 8, 10, SPARK.star)
  dot(pc, 8, 11, SPARK.edge)
  // 가로 팔
  dot(pc, 5, 8, SPARK.edge)
  dot(pc, 6, 8, SPARK.star)
  dot(pc, 7, 8, SPARK.star)
  dot(pc, 9, 8, SPARK.star)
  dot(pc, 10, 8, SPARK.star)
  dot(pc, 11, 8, SPARK.edge)
  // 대각 점 + 중심
  dot(pc, 6, 6, SPARK.edge)
  dot(pc, 10, 6, SPARK.edge)
  dot(pc, 6, 10, SPARK.edge)
  dot(pc, 10, 10, SPARK.edge)
  dot(pc, 8, 8, SPARK.core)
}

let _sparkFrames: THREE.CanvasTexture[] | null = null

/** 반짝임 프레임(0=작은 별, 1=큰 별) 텍스처 */
export const sparkleTexture = (frame: number): THREE.CanvasTexture => {
  _sparkFrames ??= buildFrames([drawSparkSmall, drawSparkBig])
  return _sparkFrames[frame % 2]
}

// ===== 도트 글리프 (직접 그린 픽셀 숫자/기호) =====
const GLYPH_PLUS = ['00100', '00100', '11111', '00100', '00100']
const GLYPH_DIGITS: Record<number, string[]> = {
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
}

/** 글리프(1=칠함)를 외곽선과 함께 (ox,oy)에 찍는다 */
function stampGlyph(
  pc: PixelCanvas,
  rows: string[],
  ox: number,
  oy: number,
  fill: string,
  outline: string,
): void {
  // 외곽선 먼저 (칠한 픽셀의 8이웃)
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== '1') continue
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          dot(pc, ox + x + dx, oy + y + dy, outline)
    }
  }
  // 채움
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === '1') dot(pc, ox + x, oy + y, fill)
    }
  }
}

/** "+N" 라벨 색: yellow=당근(코인빛) / green=씨앗 */
export type PlusVariant = 'yellow' | 'green'

const PLUS_COLORS: Record<PlusVariant, { fill: string; outline: string }> = {
  yellow: { fill: '#ffd24a', outline: '#4a2c12' },
  green: { fill: '#8fc94e', outline: '#2c4a12' },
}

const _plusNum = new Map<string, THREE.CanvasTexture>()

/** 수확 시 떠오르는 "+N"(1~3) 도트 숫자 (외곽선 있는 글씨) */
export const plusNumTexture = (
  n: number,
  variant: PlusVariant = 'yellow',
): THREE.CanvasTexture => {
  const digit = Math.max(1, Math.min(3, Math.round(n)))
  const key = `${digit}-${variant}`
  let tex = _plusNum.get(key)
  if (!tex) {
    const { fill, outline } = PLUS_COLORS[variant]
    const pc = makeCanvas(16, 8)
    stampGlyph(pc, GLYPH_PLUS, 2, 6, fill, outline)
    stampGlyph(pc, GLYPH_DIGITS[digit], 10, 6, fill, outline)
    tex = toTexture(pc.canvas)
    _plusNum.set(key, tex)
  }
  return tex
}

// ===== HUD용 도트 아이콘 (DOM <img> 에 쓰는 data URL) =====

/** 픽셀 동전 */
function drawCoin(pc: PixelCanvas): void {
  const y = '#ffd24a'
  const yl = '#ffe89a'
  const yd = '#e0a92e'
  const rim = '#a9761f'
  const disc: Array<[number, number, number]> = [
    [4, 6, 9],
    [5, 5, 10],
    [6, 4, 11],
    [7, 4, 11],
    [8, 4, 11],
    [9, 4, 11],
    [10, 5, 10],
    [11, 6, 9],
  ]
  for (const [yy, x0, x1] of disc) {
    for (let x = x0; x <= x1; x++) dot(pc, x, yy, y)
  }
  // 테두리 음영
  dot(pc, 6, 4, rim)
  dot(pc, 9, 4, rim)
  dot(pc, 4, 6, rim)
  dot(pc, 11, 9, rim)
  dot(pc, 9, 11, rim)
  // 하이라이트 / 그림자
  dot(pc, 5, 5, yl)
  dot(pc, 6, 5, yl)
  dot(pc, 10, 10, yd)
  dot(pc, 9, 10, yd)
}

function buildIconDataUrl(draw: (pc: PixelCanvas) => void): string {
  const pc = makeCanvas(16, 8)
  draw(pc)
  return pc.canvas.toDataURL()
}

/** 픽셀 씨앗 (초록 새싹 씨앗) */
function drawSeedIcon(pc: PixelCanvas): void {
  const g = '#7cb342'
  const gd = '#5e9331'
  const gl = '#a5d66a'
  const sprout = '#8fc94e'
  // 씨앗 몸통 (통통한 타원)
  const body: Array<[number, number, number]> = [
    [6, 7, 8],
    [7, 6, 9],
    [8, 5, 10],
    [9, 5, 10],
    [10, 6, 9],
    [11, 7, 8],
  ]
  for (const [y, x0, x1] of body) {
    for (let x = x0; x <= x1; x++) dot(pc, x, y, g)
  }
  // 음영 / 하이라이트
  dot(pc, 9, 9, gd)
  dot(pc, 9, 10, gd)
  dot(pc, 6, 8, gl)
  dot(pc, 7, 7, gl)
  // 새싹
  dot(pc, 7, 5, sprout)
  dot(pc, 8, 4, sprout)
  dot(pc, 8, 5, g)
}

/** 시장 아이콘: 금화 3개 스택 */
function drawMarketIcon(pc: PixelCanvas): void {
  const g = '#ffd24a'
  const gd = '#e0a92e'
  const gl = '#ffe89a'
  const rim = '#a9761f'
  for (const y of [4, 7, 10]) {
    fillRect(pc, 4, y, 11, y + 2, g)
    fillRect(pc, 4, y + 2, 11, y + 2, gd)
    dot(pc, 5, y, gl)
    dot(pc, 6, y, gl)
    dot(pc, 4, y + 1, rim)
    dot(pc, 11, y + 1, rim)
  }
}

/** 상점 아이콘: 쇼핑백 */
function drawShopIcon(pc: PixelCanvas): void {
  const bag = '#e0a869'
  const bagD = '#b97b3c'
  const bagL = '#f2c893'
  const handle = '#8a5a2c'
  // 손잡이 아치
  dot(pc, 5, 4, handle)
  dot(pc, 5, 3, handle)
  dot(pc, 6, 2, handle)
  dot(pc, 7, 2, handle)
  dot(pc, 8, 2, handle)
  dot(pc, 9, 2, handle)
  dot(pc, 10, 3, handle)
  dot(pc, 10, 4, handle)
  // 가방 몸통
  fillRect(pc, 4, 5, 11, 5, bagD)
  fillRect(pc, 3, 6, 12, 13, bag)
  fillRect(pc, 3, 6, 3, 13, bagL) // 왼쪽 하이라이트
  fillRect(pc, 12, 6, 12, 13, bagD) // 오른쪽 음영
  fillRect(pc, 3, 13, 12, 13, bagD) // 바닥
}

/** 픽셀 둥근 사각형 내부 판정 (모서리를 원형으로 깎아 도트 곡선) */
function inRR(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
): boolean {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

interface FrameColors {
  fill: string
  light: string
  dark: string
  edge: string
}

const MARKET_FRAME: FrameColors = {
  fill: '#f7d774',
  light: '#ffe9a8',
  dark: '#d6a52e',
  edge: '#7a5320',
}
const SHOP_FRAME: FrameColors = {
  fill: '#93d4ea',
  light: '#c6ecf6',
  dark: '#4fa6c4',
  edge: '#2b6b82',
}

/** 20x20 픽셀 버튼 프레임: 둥근 모서리 + 입체 베벨 (완전 도트) */
function drawSpecialFrame(pc: PixelCanvas, c: FrameColors): void {
  const N = 20
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!inRR(x, y, 0, 0, 19, 19, 5)) continue // 바깥(투명)
      else if (!inRR(x, y, 1, 1, 18, 18, 4)) dot(pc, x, y, c.edge) // 짙은 테두리
      else if (!inRR(x, y, 3, 3, 16, 16, 3))
        dot(pc, x, y, x + y < 19 ? c.light : c.dark) // 베벨(좌상 밝게/우하 어둡게)
      else dot(pc, x, y, c.fill) // 안쪽 채움
    }
  }
}

function buildFrameDataUrl(c: FrameColors): string {
  const pc = makeCanvas(20, 8)
  drawSpecialFrame(pc, c)
  return pc.canvas.toDataURL()
}

/** 땅(밭) 아이콘: 잔디 덮인 흙 블록 */
function drawLandIcon(pc: PixelCanvas): void {
  const grass = '#7cb342'
  const grassD = '#5e9331'
  const dirt = '#8b5e3c'
  const dirtD = '#6b4426'
  fillRect(pc, 3, 4, 12, 6, grass)
  fillRect(pc, 3, 6, 12, 6, grassD)
  fillRect(pc, 3, 7, 12, 12, dirt)
  fillRect(pc, 3, 12, 12, 12, dirtD)
  fillRect(pc, 3, 4, 3, 12, dirtD)
  fillRect(pc, 12, 4, 12, 12, dirtD)
}

let _coinUrl: string | null = null
let _carrotUrl: string | null = null
let _seedUrl: string | null = null
let _landUrl: string | null = null
let _marketUrl: string | null = null
let _shopUrl: string | null = null
let _marketFrame: string | null = null
let _shopFrame: string | null = null

export const coinIconUrl = (): string =>
  (_coinUrl ??= buildIconDataUrl(drawCoin))
export const carrotIconUrl = (): string =>
  (_carrotUrl ??= buildIconDataUrl(drawCarrotIcon))
export const seedIconUrl = (): string =>
  (_seedUrl ??= buildIconDataUrl(drawSeedIcon))

let _seedIconTex: THREE.CanvasTexture | null = null

/** 씨앗 아이콘 스프라이트 텍스처 (수확 시 씨앗 드랍 이펙트용) */
export const seedIconTexture = (): THREE.CanvasTexture => {
  if (!_seedIconTex) {
    const pc = makeCanvas(16, 8)
    drawSeedIcon(pc)
    _seedIconTex = toTexture(pc.canvas)
  }
  return _seedIconTex
}
export const landIconUrl = (): string =>
  (_landUrl ??= buildIconDataUrl(drawLandIcon))
export const marketIconUrl = (): string =>
  (_marketUrl ??= buildIconDataUrl(drawMarketIcon))
export const shopIconUrl = (): string =>
  (_shopUrl ??= buildIconDataUrl(drawShopIcon))
export const marketFrameUrl = (): string =>
  (_marketFrame ??= buildFrameDataUrl(MARKET_FRAME))
export const shopFrameUrl = (): string =>
  (_shopFrame ??= buildFrameDataUrl(SHOP_FRAME))

// ===================================================================
// 토끼 집 벽 텍스처 (3D 박스의 각 면에 입힘, 16x16 도트)
// ===================================================================
const HOUSE = {
  wall: '#f4e3bf',
  wallLine: '#d9c091',
  door: '#9c6b3a',
  doorDark: '#7a4f27',
  knob: '#ffd24a',
  window: '#bfe6f2',
  windowFrame: '#7a4f27',
  base: '#b89066',
}

/** 지붕/귀 색 (3D 머티리얼에서 사용) */
export const HOUSE_COLORS = {
  roof: '#e07a5f',
  ear: '#fdfdfd',
  earInner: '#ffb4c6',
}

/** 밋밋한 벽(판자 + 기초) */
function drawWallPlain(pc: PixelCanvas): void {
  fillRect(pc, 0, 0, 15, 15, HOUSE.wall)
  fillRect(pc, 0, 4, 15, 4, HOUSE.wallLine)
  fillRect(pc, 0, 9, 15, 9, HOUSE.wallLine)
  fillRect(pc, 0, 14, 15, 15, HOUSE.base)
}

/** 문간(어두운 구멍)이 있는 벽(정면). 실제 문은 별도 3D 메시로 여닫는다. */
function drawWallDoorway(pc: PixelCanvas): void {
  drawWallPlain(pc)
  const hole = '#3a2c2c'
  fillRect(pc, 6, 4, 9, 4, hole) // 둥근 윗부분
  fillRect(pc, 5, 5, 10, 15, hole)
}

/** 창문이 있는 벽(측면) */
function drawWallWindow(pc: PixelCanvas): void {
  drawWallPlain(pc)
  fillRect(pc, 5, 5, 10, 9, HOUSE.window)
  // 창틀 + 창살
  fillRect(pc, 5, 5, 10, 5, HOUSE.windowFrame)
  fillRect(pc, 5, 9, 10, 9, HOUSE.windowFrame)
  fillRect(pc, 5, 5, 5, 9, HOUSE.windowFrame)
  fillRect(pc, 10, 5, 10, 9, HOUSE.windowFrame)
  fillRect(pc, 7, 5, 8, 9, HOUSE.windowFrame)
  fillRect(pc, 5, 7, 10, 7, HOUSE.windowFrame)
}

let _wallPlain: THREE.CanvasTexture | null = null
let _wallDoorway: THREE.CanvasTexture | null = null
let _wallWindow: THREE.CanvasTexture | null = null

function buildWall(draw: (pc: PixelCanvas) => void): THREE.CanvasTexture {
  const pc = makeCanvas(16, 8)
  draw(pc)
  return toTexture(pc.canvas)
}

export const houseWallTexture = (): THREE.CanvasTexture =>
  (_wallPlain ??= buildWall(drawWallPlain))
export const houseDoorwayTexture = (): THREE.CanvasTexture =>
  (_wallDoorway ??= buildWall(drawWallDoorway))
export const houseWindowTexture = (): THREE.CanvasTexture =>
  (_wallWindow ??= buildWall(drawWallWindow))

// ===================================================================
// 토끼 얼굴 텍스처 (3D 토끼 머리 정면에 입힘)
// ===================================================================
/** 토끼 한 종의 도트 팔레트 (얼굴 텍스처·아이콘·3D 몸통 색 공용) */
interface RabbitPalette {
  body: string
  eye: string
  nose: string
  cheek: string
  ear: string
}

/** 흰 토끼 (수확 담당) */
const RABBIT: RabbitPalette = {
  body: '#fdfdfd',
  eye: '#5a4655',
  nose: '#ef8fa3',
  cheek: '#ffc7d5',
  ear: '#f7b5c4',
}

/** 검은 토끼 (씨앗 심기 담당). 어두운 몸이라 눈은 밝게 */
const BLACK_RABBIT: RabbitPalette = {
  body: '#464050',
  eye: '#f5f0f7',
  nose: '#ef8fa3',
  cheek: '#6d5f75',
  ear: '#8d7f9c',
}

/** 3D 토끼 몸/귀/귀안쪽 색 */
export const RABBIT_COLORS = {
  body: RABBIT.body,
  ear: RABBIT.ear,
}

/** 3D 검은 토끼 몸/귀안쪽 색 */
export const BLACK_RABBIT_COLORS = {
  body: BLACK_RABBIT.body,
  ear: BLACK_RABBIT.ear,
}

function drawRabbitFace(pc: PixelCanvas, c: RabbitPalette): void {
  fillRect(pc, 0, 0, 15, 15, c.body)
  // 눈
  fillRect(pc, 4, 6, 5, 8, c.eye)
  fillRect(pc, 10, 6, 11, 8, c.eye)
  // 코
  fillRect(pc, 7, 10, 8, 10, c.nose)
  dot(pc, 7, 11, c.nose)
  dot(pc, 8, 11, c.nose)
  // 볼 홍조
  fillRect(pc, 2, 10, 3, 11, c.cheek)
  fillRect(pc, 12, 10, 13, 11, c.cheek)
}

function buildRabbitFace(c: RabbitPalette): THREE.CanvasTexture {
  const pc = makeCanvas(16, 8)
  drawRabbitFace(pc, c)
  return toTexture(pc.canvas)
}

let _rabbitFace: THREE.CanvasTexture | null = null
let _blackRabbitFace: THREE.CanvasTexture | null = null

export const rabbitFaceTexture = (): THREE.CanvasTexture =>
  (_rabbitFace ??= buildRabbitFace(RABBIT))
export const blackRabbitFaceTexture = (): THREE.CanvasTexture =>
  (_blackRabbitFace ??= buildRabbitFace(BLACK_RABBIT))

/** 픽셀 트로피 (랭킹 버튼) */
function drawTrophyIcon(pc: PixelCanvas): void {
  const g = '#ffd24a'
  const gl = '#ffe89a'
  const gd = '#e0a92e'
  const base = '#a9761f'
  // 컵 테두리 + 몸통
  fillRect(pc, 5, 3, 10, 3, gd)
  fillRect(pc, 5, 4, 10, 7, g)
  // 손잡이
  dot(pc, 4, 4, g)
  dot(pc, 11, 4, g)
  dot(pc, 4, 5, gd)
  dot(pc, 11, 5, gd)
  // 하이라이트 / 음영
  dot(pc, 6, 4, gl)
  dot(pc, 6, 5, gl)
  dot(pc, 9, 7, gd)
  // 목 + 받침
  fillRect(pc, 6, 8, 9, 8, gd)
  fillRect(pc, 7, 9, 8, 10, gd)
  fillRect(pc, 5, 11, 10, 12, base)
}

let _trophyUrl: string | null = null

export const trophyIconUrl = (): string =>
  (_trophyUrl ??= buildIconDataUrl(drawTrophyIcon))

/** HUD용 픽셀 토끼 머리 아이콘 */
function drawRabbitIcon(pc: PixelCanvas, c: RabbitPalette): void {
  const body = c.body
  const ear = c.ear
  // 귀
  fillRect(pc, 4, 1, 5, 6, body)
  fillRect(pc, 10, 1, 11, 6, body)
  dot(pc, 5, 3, ear)
  dot(pc, 5, 4, ear)
  dot(pc, 10, 3, ear)
  dot(pc, 10, 4, ear)
  // 머리
  fillRect(pc, 4, 6, 11, 12, body)
  fillRect(pc, 5, 12, 10, 13, body)
  // 눈
  fillRect(pc, 6, 8, 6, 9, c.eye)
  fillRect(pc, 9, 8, 9, 9, c.eye)
  // 코
  dot(pc, 7, 10, c.nose)
  dot(pc, 8, 10, c.nose)
  // 볼
  dot(pc, 4, 10, c.cheek)
  dot(pc, 11, 10, c.cheek)
}

let _rabbitUrl: string | null = null
let _blackRabbitUrl: string | null = null

export const rabbitIconUrl = (): string =>
  (_rabbitUrl ??= buildIconDataUrl((pc) => drawRabbitIcon(pc, RABBIT)))
export const blackRabbitIconUrl = (): string =>
  (_blackRabbitUrl ??= buildIconDataUrl((pc) => drawRabbitIcon(pc, BLACK_RABBIT)))
