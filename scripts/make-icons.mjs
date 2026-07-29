/**
 * 앱 아이콘 생성 스크립트 (외부 이미지·의존성 없음)
 *
 * 게임의 철학대로 아이콘도 코드로 도트를 그린다:
 * 16x16 논리 픽셀(크림색 픽셀 라운드 판 + 당근)을 정수배로 확대해
 * PNG 를 직접 인코딩하고, macOS .icns(iconutil)와 Windows .ico 로 묶는다.
 *
 * 사용법: node scripts/make-icons.mjs   →  build/icon.icns, build/icon.ico, build/icon.png
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'build')

// ===== 16x16 도트 그리기 =====
const SIZE = 16

/** 색 팔레트 (게임 본체와 동일) */
const C = {
  plate: '#fffdf7',
  border: '#7a5320',
  green: '#4caf50',
  greenDark: '#2e7d32',
  greenLight: '#81c784',
  orange: '#ff922b',
  orangeDark: '#e8590c',
}

/** 바탕판 판정: 모서리 3단 계단 라운딩 (가장 가까운 두 변까지의 거리 합 > 2) */
function inPlate(x, y) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return false
  return Math.min(x, SIZE - 1 - x) + Math.min(y, SIZE - 1 - y) > 2
}

/** 16x16 그리드(색 문자열 | null) 생성 */
function drawIcon() {
  const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  const dot = (x, y, c) => {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) g[y][x] = c
  }

  // 바탕판 + 테두리 (판 안쪽인데 상하좌우 중 하나라도 판 밖이면 테두리)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!inPlate(x, y)) continue
      const edge =
        !inPlate(x - 1, y) ||
        !inPlate(x + 1, y) ||
        !inPlate(x, y - 1) ||
        !inPlate(x, y + 1)
      g[y][x] = edge ? C.border : C.plate
    }
  }

  // 당근 잎 (게임 carrotIcon 과 동일한 패턴)
  dot(7, 1, C.greenLight)
  dot(6, 2, C.green)
  dot(7, 2, C.green)
  dot(8, 2, C.green)
  dot(5, 3, C.greenLight)
  dot(6, 3, C.green)
  dot(7, 3, C.greenDark)
  dot(8, 3, C.green)
  dot(9, 3, C.greenLight)
  dot(6, 4, C.green)
  dot(7, 4, C.green)
  dot(8, 4, C.green)
  // 당근 몸통 (역삼각형)
  const rows = [
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
    for (let x = x0; x <= x1; x++) dot(x, y, C.orange)
  }
  // 결 (어두운 주황)
  dot(6, 6, C.orangeDark)
  dot(8, 8, C.orangeDark)
  dot(7, 10, C.orangeDark)
  dot(7, 12, C.orangeDark)

  return g
}

// ===== 그리드 → RGBA 버퍼 (정수배 확대, 니어리스트) =====
function hexToRgba(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255,
  ]
}

function renderRGBA(grid, scale) {
  const w = SIZE * scale
  const buf = Buffer.alloc(w * w * 4) // 기본 투명
  for (let gy = 0; gy < SIZE; gy++) {
    for (let gx = 0; gx < SIZE; gx++) {
      const c = grid[gy][gx]
      if (!c) continue
      const [r, g, b, a] = hexToRgba(c)
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = ((gy * scale + dy) * w + gx * scale + dx) * 4
          buf[i] = r
          buf[i + 1] = g
          buf[i + 2] = b
          buf[i + 3] = a
        }
      }
    }
  }
  return { width: w, data: buf }
}

// ===== 최소 PNG 인코더 =====
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG({ width, data }) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(width, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // 스캔라인마다 필터 바이트(0) 붙이기
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * width)
  for (let y = 0; y < width; y++) {
    raw[y * (stride + 1)] = 0
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ===== ICO (PNG 엔트리 방식) =====
function encodeICO(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // 아이콘 타입
  header.writeUInt16LE(pngs.length, 4)
  const entries = []
  let offset = 6 + 16 * pngs.length
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4) // planes
    e.writeUInt16LE(32, 6) // bpp
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    entries.push(e)
    offset += data.length
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

// ===== 생성 =====
const grid = drawIcon()
const png = (px) => encodePNG(renderRGBA(grid, px / SIZE))

mkdirSync(OUT, { recursive: true })

// macOS .icns (iconutil 은 mac 전용)
if (process.platform === 'darwin') {
  const iconset = join(OUT, 'icon.iconset')
  rmSync(iconset, { recursive: true, force: true })
  mkdirSync(iconset, { recursive: true })
  const specs = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024],
  ]
  for (const [name, px] of specs) writeFileSync(join(iconset, name), png(px))
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', join(OUT, 'icon.icns')])
  rmSync(iconset, { recursive: true, force: true })
  console.log('✅ build/icon.icns')
}

// Windows .ico
const icoSizes = [16, 32, 48, 64, 128, 256]
writeFileSync(
  join(OUT, 'icon.ico'),
  encodeICO(icoSizes.map((s) => ({ size: s, data: png(s) }))),
)
console.log('✅ build/icon.ico')

// 공용 PNG (리눅스/기타)
writeFileSync(join(OUT, 'icon.png'), png(512))
console.log('✅ build/icon.png')
