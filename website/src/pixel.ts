/**
 * 사이트의 모든 도트 그림 생성.
 * 게임 본체(src/game/textures.ts)와 같은 철학: 외부 이미지 없이
 * 캔버스에 한 픽셀씩 코드로 그려서 data URL 로 쓴다.
 */

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

function buildUrl(draw: (pc: PixelCanvas) => void, scale = 8): string {
  const pc = makeCanvas(16, scale)
  draw(pc)
  return pc.canvas.toDataURL()
}

// ===== 팔레트 (게임 본체와 동일) =====
const PLANT = {
  green: '#4caf50',
  greenDark: '#2e7d32',
  greenLight: '#81c784',
  orange: '#ff922b',
  orangeDark: '#e8590c',
}

const GRASS = {
  base: '#7cb342',
  dark: '#5e9331',
  light: '#8fc94e',
}

const SOIL = {
  base: '#8a5a34',
  dark: '#5c3a20',
  light: '#c08a5a',
}

interface RabbitPalette {
  body: string
  eye: string
  nose: string
  cheek: string
  ear: string
}

const RABBIT: RabbitPalette = {
  body: '#fdfdfd',
  eye: '#5a4655',
  nose: '#ef8fa3',
  cheek: '#ffc7d5',
  ear: '#f7b5c4',
}

const BLACK_RABBIT: RabbitPalette = {
  body: '#464050',
  eye: '#f5f0f7',
  nose: '#ef8fa3',
  cheek: '#6d5f75',
  ear: '#8d7f9c',
}

// ===== 그림들 =====

/** 완전한 당근 (잎 + 역삼각형 몸통) */
function drawCarrot(pc: PixelCanvas): void {
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
  dot(pc, 6, 6, PLANT.orangeDark)
  dot(pc, 8, 8, PLANT.orangeDark)
  dot(pc, 7, 10, PLANT.orangeDark)
  dot(pc, 7, 12, PLANT.orangeDark)
}

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
  dot(pc, 6, 4, rim)
  dot(pc, 9, 4, rim)
  dot(pc, 4, 6, rim)
  dot(pc, 11, 9, rim)
  dot(pc, 9, 11, rim)
  dot(pc, 5, 5, yl)
  dot(pc, 6, 5, yl)
  dot(pc, 10, 10, yd)
  dot(pc, 9, 10, yd)
}

/** 픽셀 씨앗 (초록 새싹 씨앗) */
function drawSeed(pc: PixelCanvas): void {
  const body: Array<[number, number, number]> = [
    [6, 7, 8],
    [7, 6, 9],
    [8, 5, 10],
    [9, 5, 10],
    [10, 6, 9],
    [11, 7, 8],
  ]
  for (const [y, x0, x1] of body) {
    for (let x = x0; x <= x1; x++) dot(pc, x, y, GRASS.base)
  }
  dot(pc, 9, 9, GRASS.dark)
  dot(pc, 9, 10, GRASS.dark)
  dot(pc, 6, 8, GRASS.light)
  dot(pc, 7, 7, GRASS.light)
  dot(pc, 7, 5, GRASS.light)
  dot(pc, 8, 4, GRASS.light)
  dot(pc, 8, 5, GRASS.base)
}

/** 픽셀 토끼 머리 (흰/검은 공용) */
function drawRabbit(pc: PixelCanvas, c: RabbitPalette): void {
  // 귀
  fillRect(pc, 4, 1, 5, 6, c.body)
  fillRect(pc, 10, 1, 11, 6, c.body)
  dot(pc, 5, 3, c.ear)
  dot(pc, 5, 4, c.ear)
  dot(pc, 10, 3, c.ear)
  dot(pc, 10, 4, c.ear)
  // 머리
  fillRect(pc, 4, 6, 11, 12, c.body)
  fillRect(pc, 5, 12, 10, 13, c.body)
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

/** 땅(밭) 블록: 잔디 덮인 흙 */
function drawLand(pc: PixelCanvas): void {
  // 잔디 윗면
  fillRect(pc, 2, 5, 13, 6, GRASS.base)
  dot(pc, 3, 5, GRASS.light)
  dot(pc, 7, 5, GRASS.light)
  dot(pc, 11, 5, GRASS.light)
  dot(pc, 5, 6, GRASS.dark)
  dot(pc, 9, 6, GRASS.dark)
  fillRect(pc, 2, 7, 13, 7, GRASS.dark)
  // 흙
  fillRect(pc, 2, 8, 13, 13, SOIL.base)
  dot(pc, 4, 9, SOIL.dark)
  dot(pc, 8, 10, SOIL.light)
  dot(pc, 11, 11, SOIL.dark)
  dot(pc, 5, 12, SOIL.light)
  dot(pc, 9, 12, SOIL.dark)
}

// ===== 지연 생성 싱글턴 data URL =====
let _carrot: string | null = null
let _coin: string | null = null
let _seed: string | null = null
let _rabbit: string | null = null
let _blackRabbit: string | null = null
let _land: string | null = null

export const carrotUrl = (): string => (_carrot ??= buildUrl(drawCarrot))
export const coinUrl = (): string => (_coin ??= buildUrl(drawCoin))
export const seedUrl = (): string => (_seed ??= buildUrl(drawSeed))
export const rabbitUrl = (): string =>
  (_rabbit ??= buildUrl((pc) => drawRabbit(pc, RABBIT)))
export const blackRabbitUrl = (): string =>
  (_blackRabbit ??= buildUrl((pc) => drawRabbit(pc, BLACK_RABBIT)))
export const landUrl = (): string => (_land ??= buildUrl(drawLand))
