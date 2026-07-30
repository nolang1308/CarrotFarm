import { create } from 'zustand'

/** 하나의 밭 타일 상태 */
export interface TileState {
  /** 그리드 좌표 */
  x: number
  z: number
  /**
   * 작물 성장 단계
   * 0 = 빈 흙
   * 1 초록색 씨앗 · 2 꽃 · 3 조금 올라온 당근 · 4 반정도 올라온 당근 (자라는 중)
   * 5 = 한 픽셀 더 올라온 당근 (수확 가능)
   */
  growth: 0 | 1 | 2 | 3 | 4 | 5
  /** 씨를 심은 시각(ms). 개별 성장 계산용. 빈 흙이면 undefined */
  plantedAt?: number
}

/** 밭 위에 놓인 건물 (좌상단 셀 origin + w×h 칸 점유) */
export interface Building {
  id: number
  x: number
  z: number
  w: number
  h: number
  type: 'rabbit'
}

/** (x,z) 칸이 어떤 건물에 점유돼 있는지 */
export function isCellOccupied(
  buildings: Building[],
  x: number,
  z: number,
): boolean {
  return buildings.some(
    (b) => x >= b.x && x < b.x + b.w && z >= b.z && z < b.z + b.h,
  )
}

/** 당근이 다 자란(수확 가능) 단계 */
export const RIPE_STAGE = 5

/** 씨앗(1단계)이 다 자랄 때까지(5단계) 걸리는 총 시간(ms) — 실제 게임 */
export const GROW_TOTAL_MS = 60_000

/** 튜토리얼 중 총 성장 시간(ms) — 기다림 없이 빠르게 배우도록 */
export const TUTORIAL_GROW_TOTAL_MS = 5_000

/** 성장 단계 전환 횟수 (1단계 → 5단계) */
const GROW_STEPS = RIPE_STAGE - 1

/** 지금 적용되는 총 성장 시간(ms). "어느 속도가 적용되는가"는 여기 한 곳만 안다 */
export function growTotalMs(tutorialDone: boolean): number {
  return tutorialDone ? GROW_TOTAL_MS : TUTORIAL_GROW_TOTAL_MS
}

/** 한 단계 자라는 데 걸리는 시간(ms) */
export function growMs(tutorialDone: boolean): number {
  return growTotalMs(tutorialDone) / GROW_STEPS
}

/** 시작 시 주어지는 타일 수 (3x3). 땅 가격 계산은 이걸 넘는 구매분 기준 */
export const INITIAL_TILE_COUNT = 9

/**
 * 영구 자산(땅·토끼·검은 토끼)은 살 때마다 가격이 지수적으로 오른다.
 * 무분별한 확장을 막는 완만한 제동: 땅 ×1.15, 토끼류 ×1.5
 */

/** 다음 땅 1칸 가격 (ownedTiles = 현재 보유 타일 수) */
export function tileCost(ownedTiles: number): number {
  const bought = Math.max(0, ownedTiles - INITIAL_TILE_COUNT)
  return Math.round(25 * 1.15 ** bought)
}

/** 다음 토끼 1마리 가격 (owned = 현재 보유 마리수) */
export function rabbitCost(owned: number): number {
  return Math.round(10000 * 1.5 ** owned)
}

/** 다음 검은 토끼 1마리 가격 (owned = 현재 보유 마리수) */
export function blackRabbitCost(owned: number): number {
  return Math.round(50000 * 1.5 ** owned)
}

/** 씨앗 한 묶음 가격과 개수 */
export const SEED_COST = 20
export const SEED_PACK = 10

/** 당근 시세 범위 (개당 코인) */
export const PRICE_MIN = 4
export const PRICE_MAX = 30

/** 타일을 Set/Map 키로 쓰기 위한 문자열 키 */
export const tileKey = (x: number, z: number) => `${x}-${z}`

/**
 * 현재 밭 전체를 하나의 사각형으로 봤을 때의 중심(그리드 좌표).
 * 이 값만큼 각 타일을 밀어서 배치하면, 땅이 어느 방향으로 넓어지든
 * 밭 전체의 바운딩 박스가 항상 월드 원점(=화면 중앙)에 오게 된다.
 */
export function getFarmCenter(tiles: TileState[]): { cx: number; cz: number } {
  if (tiles.length === 0) return { cx: 0, cz: 0 }
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
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 }
}

/**
 * 초기 밭 타일 생성: 집(2x2, (0,0)~(1,1)) 밑 4칸 + 심을 수 있는 5칸 = 3x3.
 * 집이 점유한 칸을 제외하면 농사 가능한 땅은 5개다.
 */
function createInitialTiles(): TileState[] {
  const tiles: TileState[] = []
  for (let x = 0; x < 3; x++) {
    for (let z = 0; z < 3; z++) {
      tiles.push({ x, z, growth: 0 })
    }
  }
  return tiles
}

/** Firestore 에 저장/복원하는 농장 데이터 (UI·일시 상태 제외) */
export interface FarmSave {
  coins: number
  carrots: number
  seeds: number
  rabbits: number
  blackRabbits: number
  carrotPrice: number
  priceHistory: number[]
  tiles: TileState[]
  buildings: Building[]
  /** 튜토리얼을 끝냈는지 (처음 로그인한 계정만 false) */
  tutorialDone: boolean
}

/** 새 계정의 초기 농장 */
export function initialFarm(): FarmSave {
  return {
    coins: 10000,
    carrots: 0,
    seeds: 0,
    rabbits: 0,
    blackRabbits: 0,
    carrotPrice: 12,
    priceHistory: [12],
    tiles: createInitialTiles(),
    buildings: [{ id: 0, x: 0, z: 0, w: 2, h: 2, type: 'rabbit' }],
    tutorialDone: false,
  }
}

/** 현재 상태에서 저장 대상 필드만 뽑기 (GameState 가 FarmSave 를 구조적으로 포함) */
export function snapshotFarm(s: FarmSave): FarmSave {
  return {
    coins: s.coins,
    carrots: s.carrots,
    seeds: s.seeds,
    rabbits: s.rabbits,
    blackRabbits: s.blackRabbits,
    carrotPrice: s.carrotPrice,
    priceHistory: s.priceHistory,
    tiles: s.tiles,
    buildings: s.buildings,
    tutorialDone: s.tutorialDone,
  }
}

/** 수확 순간 재생되는 일회성 이펙트 (그리드 좌표) */
export interface HarvestEffect {
  id: number
  x: number
  z: number
}

let nextFxId = 0

interface GameState {
  coins: number
  carrots: number
  /** 보유한 씨앗 수 (심을 때 1개 소모) */
  seeds: number
  /** 당근 현재 시세(개당 코인) */
  carrotPrice: number
  /** 최근 시세 이력 (미니 그래프용) */
  priceHistory: number[]
  /** 시장 UI 열림 여부 */
  marketOpen: boolean
  /** 상점 UI 열림 여부 */
  shopOpen: boolean
  /** 설정 UI 열림 여부 */
  settingsOpen: boolean
  /** 집 클릭으로 뜨는 농장 관리 패널 열림 여부 */
  panelOpen: boolean
  tiles: TileState[]
  /** 밭 위 건물 목록 */
  buildings: Building[]
  /** 보유한 토끼 마리수 (하나의 토끼집에서 이 수만큼 나온다) */
  rabbits: number
  /** 보유한 검은 토끼 마리수 (빈 밭을 찾아 알아서 씨앗을 심는다) */
  blackRabbits: number
  /** 튜토리얼을 끝냈는지 (false 면 튜토리얼 오버레이 표시) */
  tutorialDone: boolean
  /** 진행 중인 수확 이펙트 목록 */
  harvestEffects: HarvestEffect[]
  /** 저장된 농장을 불러와 적용했는지 (전까지는 게임 표시·자동 저장 안 함) */
  hydrated: boolean
  /** 땅 추가 모드 여부 */
  buildMode: boolean
  /** 드래그로 땅을 설치하는 중인지 (이 동안 밭 재중심 애니메이션은 멈춤) */
  isPlacing: boolean
  /** 불러오기 시작 (계정 전환 시 이전 농장 표시/저장 방지) */
  beginHydration: () => void
  /** 저장된 농장 적용 (null = 새 계정 → 초기 농장). 일시 상태는 초기화 */
  hydrate: (save: FarmSave | null) => void
  /** 튜토리얼 종료 (열려 있던 모달도 정리) */
  finishTutorial: () => void
  /** 땅 추가 모드 토글 */
  toggleBuildMode: () => void
  /** 드래그 설치 중 여부 설정 */
  setPlacing: (placing: boolean) => void
  /** 해당 위치에 새 땅 생성 (이미 있으면·코인 부족이면 무시). 성공 여부 반환 */
  addTile: (x: number, z: number) => boolean
  /** 토끼 한 마리 구매 (코인 부족이면 무시). 성공 여부 반환 */
  addRabbit: () => boolean
  /** 검은 토끼 한 마리 구매 (코인 부족이면 무시). 성공 여부 반환 */
  addBlackRabbit: () => boolean
  /** 씨앗 한 묶음 구매 (코인 부족이면 무시). 성공 여부 반환 */
  buySeeds: () => boolean
  /** 시장 UI 토글 */
  toggleMarket: () => void
  /** 상점 UI 토글 */
  toggleShop: () => void
  /** 설정 UI 토글 */
  toggleSettings: () => void
  /** 농장 관리 패널 토글 (집 클릭) */
  togglePanel: () => void
  /** 농장 관리 패널 닫기 */
  closePanel: () => void
  /** 당근 시세 갱신 (랜덤 워크) */
  tickPrice: () => void
  /** 보유 당근을 현재 시세로 전량 판매 */
  sellAllCarrots: () => void
  /** 타일 클릭: 빈 흙이면 심고, 다 자랐으면 수확 */
  interactTile: (x: number, z: number) => void
  /** 각 작물을 심은 시각 기준으로 현재 단계까지 성장시킴 (게임 루프에서 호출) */
  tickGrowth: (now: number) => void
  /** 끝난 수확 이펙트 제거 */
  removeHarvestEffect: (id: number) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialFarm(),
  marketOpen: false,
  shopOpen: false,
  settingsOpen: false,
  panelOpen: false,
  harvestEffects: [],
  hydrated: false,
  buildMode: false,
  isPlacing: false,

  beginHydration: () => set({ hydrated: false }),

  // 저장본 적용 + 모달/이펙트/모드 등 일시 상태 초기화
  hydrate: (save) =>
    set({
      ...(save ?? initialFarm()),
      marketOpen: false,
      shopOpen: false,
      panelOpen: false,
      harvestEffects: [],
      buildMode: false,
      isPlacing: false,
      hydrated: true,
    }),

  finishTutorial: () =>
    set({
      tutorialDone: true,
      marketOpen: false,
      shopOpen: false,
      settingsOpen: false,
      panelOpen: false,
    }),

  // 땅 추가 모드 진입 시 패널은 닫아 밭에 배치할 수 있게
  toggleBuildMode: () =>
    set((state) => ({ buildMode: !state.buildMode, panelOpen: false })),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),

  closePanel: () => set({ panelOpen: false }),

  setPlacing: (placing) => set({ isPlacing: placing }),

  // 토끼 한 마리 구매 (마리수 증가). 하나의 집에서 이 수만큼 나온다.
  addRabbit: () => {
    const state = get()
    const cost = rabbitCost(state.rabbits)
    if (state.coins < cost) return false
    set({ rabbits: state.rabbits + 1, coins: state.coins - cost })
    return true
  },

  // 검은 토끼 한 마리 구매 (빈 밭에 알아서 씨앗을 심는다)
  addBlackRabbit: () => {
    const state = get()
    const cost = blackRabbitCost(state.blackRabbits)
    if (state.coins < cost) return false
    set({
      blackRabbits: state.blackRabbits + 1,
      coins: state.coins - cost,
    })
    return true
  },

  // 씨앗 한 묶음 구매
  buySeeds: () => {
    const state = get()
    if (state.coins < SEED_COST) return false
    set({ seeds: state.seeds + SEED_PACK, coins: state.coins - SEED_COST })
    return true
  },

  // 시장/상점/설정 모달은 동시에 하나만 열림 (열면 관리 패널은 닫음)
  toggleMarket: () =>
    set((state) => ({
      marketOpen: !state.marketOpen,
      shopOpen: false,
      settingsOpen: false,
      panelOpen: false,
    })),

  toggleShop: () =>
    set((state) => ({
      shopOpen: !state.shopOpen,
      marketOpen: false,
      settingsOpen: false,
      panelOpen: false,
    })),

  toggleSettings: () =>
    set((state) => ({
      settingsOpen: !state.settingsOpen,
      marketOpen: false,
      shopOpen: false,
      panelOpen: false,
    })),

  // 시세 랜덤 워크 (±2, 범위 제한)
  tickPrice: () =>
    set((state) => {
      const step = Math.round((Math.random() - 0.5) * 4)
      const next = Math.max(
        PRICE_MIN,
        Math.min(PRICE_MAX, state.carrotPrice + step),
      )
      return {
        carrotPrice: next,
        priceHistory: [...state.priceHistory, next].slice(-40),
      }
    }),

  // 보유 당근 전량을 현재 시세로 판매
  sellAllCarrots: () =>
    set((state) => {
      if (state.carrots <= 0) return {}
      return {
        coins: state.coins + state.carrots * state.carrotPrice,
        carrots: 0,
      }
    }),

  addTile: (x, z) => {
    const state = get()
    const exists = state.tiles.some((t) => t.x === x && t.z === z)
    // 기존 밭과 상하좌우로 맞닿은 자리에만 추가 가능
    const adjacent = state.tiles.some(
      (t) =>
        (Math.abs(t.x - x) === 1 && t.z === z) ||
        (Math.abs(t.z - z) === 1 && t.x === x),
    )
    const cost = tileCost(state.tiles.length)
    if (exists || !adjacent || state.coins < cost) return false
    set({
      tiles: [...state.tiles, { x, z, growth: 0 }],
      coins: state.coins - cost,
    })
    return true
  },

  interactTile: (x, z) =>
    set((state) => {
      // 건물이 점유한 칸은 심기·수확 불가
      if (isCellOccupied(state.buildings, x, z)) return {}
      const target = state.tiles.find((t) => t.x === x && t.z === z)
      if (!target) return {}

      // 다 자란 당근 수확 → 당근 지급 + 이펙트 (돈은 시장에 팔아야 벌린다)
      if (target.growth === RIPE_STAGE) {
        const tiles = state.tiles.map((t) =>
          t.x === x && t.z === z
            ? { ...t, growth: 0 as const, plantedAt: undefined }
            : t,
        )
        return {
          tiles,
          carrots: state.carrots + 1,
          harvestEffects: [...state.harvestEffects, { id: nextFxId++, x, z }],
        }
      }

      // 빈 흙에 씨 심기 → 씨앗 1개 소모 (없으면 못 심음)
      if (target.growth === 0) {
        if (state.seeds <= 0) return {}
        const now = Date.now()
        const tiles = state.tiles.map((t) =>
          t.x === x && t.z === z
            ? { ...t, growth: 1 as const, plantedAt: now }
            : t,
        )
        return { tiles, seeds: state.seeds - 1 }
      }

      return {}
    }),

  tickGrowth: (now) => {
    const state = get()
    const perStage = growMs(state.tutorialDone)
    // 심은 시각 기준 현재 단계 (자라는 중인 작물만)
    const stageOf = (t: TileState): TileState['growth'] => {
      if (t.plantedAt == null || t.growth >= RIPE_STAGE) return t.growth
      return Math.min(
        RIPE_STAGE,
        1 + Math.floor((now - t.plantedAt) / perStage),
      ) as TileState['growth']
    }
    // 대부분의 틱은 변화가 없으므로, 배열 할당 전에 먼저 훑고 없으면 종료
    if (state.tiles.every((t) => stageOf(t) === t.growth)) return
    set({
      tiles: state.tiles.map((t) => {
        const stage = stageOf(t)
        return stage === t.growth ? t : { ...t, growth: stage }
      }),
    })
  },

  removeHarvestEffect: (id) =>
    set((state) => ({
      harvestEffects: state.harvestEffects.filter((e) => e.id !== id),
    })),
}))
