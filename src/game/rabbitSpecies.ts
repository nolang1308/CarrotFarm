/**
 * 토끼 종 도감 데이터.
 * 역할은 두 가지(수확/심기)뿐이고, 종은 외형(도트 팔레트)·이름·희귀도가 다르다.
 * 상점에서 역할별 토끼를 사면 그 계열에서 가중치 랜덤으로 한 종이 나온다.
 */

/** 토끼 도트 팔레트 (+ 선택: 얼굴 점무늬) */
export interface RabbitPalette {
  body: string
  eye: string
  nose: string
  cheek: string
  ear: string
  /** 얼굴 점무늬 색 (spots 와 함께) */
  spotColor?: string
  /** 얼굴 텍스처(16x16) 기준 점 좌표 */
  spots?: Array<[number, number]>
}

export type RabbitRole = 'harvest' | 'plant'
export type RabbitRarity = 'common' | 'rare'

export interface RabbitSpecies {
  id: string
  name: string
  role: RabbitRole
  rarity: RabbitRarity
  desc: string
  /** 뽑기 가중치 (계열 안에서 비율) */
  weight: number
  palette: RabbitPalette
}

export const RABBIT_SPECIES: readonly RabbitSpecies[] = [
  // ===== 수확 계열 (흰토끼 가족) =====
  {
    id: 'white',
    name: '흰토끼',
    role: 'harvest',
    rarity: 'common',
    desc: '어디서나 볼 수 있는 성실한 일꾼. 다 자란 당근을 수확해요.',
    weight: 9,
    palette: {
      body: '#fdfdfd',
      eye: '#5a4655',
      nose: '#ef8fa3',
      cheek: '#ffc7d5',
      ear: '#f7b5c4',
    },
  },
  {
    id: 'brown',
    name: '갈색토끼',
    role: 'harvest',
    rarity: 'common',
    desc: '흙과 구분이 안 될 만큼 흙을 좋아해요.',
    weight: 9,
    palette: {
      body: '#b98a5e',
      eye: '#4a3220',
      nose: '#e8837a',
      cheek: '#d9a97e',
      ear: '#8a5a34',
    },
  },
  {
    id: 'spotted',
    name: '점박이토끼',
    role: 'harvest',
    rarity: 'common',
    desc: '점이 몇 개인지 세어 본 사람이 아직 없대요.',
    weight: 9,
    palette: {
      body: '#f0e6d8',
      eye: '#4a3a30',
      nose: '#ef8fa3',
      cheek: '#eac9b0',
      ear: '#c9a98a',
      spotColor: '#8a6a4a',
      spots: [
        [2, 3],
        [12, 3],
        [13, 12],
      ],
    },
  },
  {
    id: 'gray',
    name: '잿빛토끼',
    role: 'harvest',
    rarity: 'common',
    desc: '비 오는 날 태어나서 성격이 차분해요.',
    weight: 9,
    palette: {
      body: '#9aa0a8',
      eye: '#343a42',
      nose: '#e08a90',
      cheek: '#b8bec6',
      ear: '#767c86',
    },
  },
  {
    id: 'golden',
    name: '황금토끼',
    role: 'harvest',
    rarity: 'rare',
    desc: '밭에 행운을 부른다는 전설의 토끼.',
    weight: 4,
    palette: {
      body: '#ffd24a',
      eye: '#7a4f16',
      nose: '#f09a6a',
      cheek: '#ffe89a',
      ear: '#e0a92e',
    },
  },

  // ===== 심기 계열 (검은토끼 가족) =====
  {
    id: 'black',
    name: '검은토끼',
    role: 'plant',
    rarity: 'common',
    desc: '밤에도 부지런히 씨앗을 심는 일꾼이에요.',
    weight: 9,
    palette: {
      body: '#464050',
      eye: '#f5f0f7',
      nose: '#ef8fa3',
      cheek: '#6d5f75',
      ear: '#8d7f9c',
    },
  },
  {
    id: 'chestnut',
    name: '밤색토끼',
    role: 'plant',
    rarity: 'common',
    desc: '주머니에 항상 씨앗이 가득해요.',
    weight: 9,
    palette: {
      body: '#6b4a2f',
      eye: '#f0e4d4',
      nose: '#e8837a',
      cheek: '#8a6a4a',
      ear: '#4a3220',
    },
  },
  {
    id: 'ash',
    name: '재투성이토끼',
    role: 'plant',
    rarity: 'common',
    desc: '모닥불 옆에서 자는 걸 좋아해서 늘 재가 묻어 있어요.',
    weight: 9,
    palette: {
      body: '#5c5c5c',
      eye: '#eeeeee',
      nose: '#d08a80',
      cheek: '#787878',
      ear: '#3e3e3e',
      spotColor: '#8a8a8a',
      spots: [
        [3, 12],
        [12, 4],
      ],
    },
  },
  {
    id: 'violet',
    name: '보라토끼',
    role: 'plant',
    rarity: 'common',
    desc: '노을 질 무렵에만 기분이 좋아져요.',
    weight: 9,
    palette: {
      body: '#6a4a8a',
      eye: '#f2e8fa',
      nose: '#e88aa0',
      cheek: '#8a6aaa',
      ear: '#4a3260',
    },
  },
  {
    id: 'star',
    name: '별박이토끼',
    role: 'plant',
    rarity: 'rare',
    desc: '귀에 별가루가 묻어 있다는 소문이 있어요.',
    weight: 4,
    palette: {
      body: '#2c2c44',
      eye: '#ffe066',
      nose: '#e88aa0',
      cheek: '#44446a',
      ear: '#1c1c30',
      spotColor: '#ffe066',
      spots: [
        [3, 3],
        [12, 4],
        [2, 12],
      ],
    },
  },
]

/** 역할별 기본 종 (구버전 저장본 마이그레이션·기본 아이콘용) */
export const DEFAULT_SPECIES: Record<RabbitRole, string> = {
  harvest: 'white',
  plant: 'black',
}

const byId = new Map(RABBIT_SPECIES.map((s) => [s.id, s]))

/** id → 종 (모르는 id 는 흰토끼로 폴백) */
export function speciesById(id: string): RabbitSpecies {
  return byId.get(id) ?? byId.get('white')!
}

/** 보유 종 목록에서 역할별 마리수 */
export function countRole(types: string[], role: RabbitRole): number {
  let n = 0
  for (const id of types) if (speciesById(id).role === role) n++
  return n
}

/** 계열 안에서 가중치 랜덤 뽑기 */
export function rollSpecies(role: RabbitRole): RabbitSpecies {
  const pool = RABBIT_SPECIES.filter((s) => s.role === role)
  const total = pool.reduce((sum, s) => sum + s.weight, 0)
  let r = Math.random() * total
  for (const s of pool) {
    r -= s.weight
    if (r < 0) return s
  }
  return pool[0]
}
