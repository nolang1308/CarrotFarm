/**
 * 웹사이트 ↔ Firestore REST API (피드백·농부 수·랭킹).
 * SDK 없이 fetch 만 사용해 사이트 번들을 가볍게 유지한다.
 * 쓰기 가능 범위는 서버의 보안 규칙이 강제한다 (feedback 컬렉션 생성만 허용).
 */

const PROJECT = 'carrotfarm-game'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

/** 랭킹 한 줄 */
export interface RankEntry {
  uid: string
  name: string
  coins: number
  land: number
  rabbits: number
  blackRabbits: number
}

/** 코인 내림차순 상위 랭킹 */
export async function fetchTopRanking(limit = 10): Promise<RankEntry[]> {
  const res = await fetch(`${BASE}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'leaderboard' }],
        orderBy: [{ field: { fieldPath: 'coins' }, direction: 'DESCENDING' }],
        limit,
      },
    }),
  })
  if (!res.ok) throw new Error(`랭킹 조회 실패 (${res.status})`)

  interface Row {
    document?: {
      name?: string
      fields?: Record<string, { stringValue?: string; integerValue?: string }>
    }
  }
  const rows = (await res.json()) as Row[]
  return rows
    .filter((r) => r.document?.fields)
    .map((r) => {
      const f = r.document!.fields!
      const num = (k: string) => Number(f[k]?.integerValue ?? 0)
      return {
        uid: r.document!.name?.split('/').pop() ?? '',
        name: f.name?.stringValue ?? '농부',
        coins: num('coins'),
        land: num('land'),
        rabbits: num('rabbits'),
        blackRabbits: num('blackRabbits'),
      }
    })
}

/** 지금까지 가입한 농부(사용자) 수 — leaderboard 문서 개수 집계 */
export async function fetchFarmerCount(): Promise<number> {
  const res = await fetch(`${BASE}:runAggregationQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: 'leaderboard' }] },
        aggregations: [{ count: {}, alias: 'total' }],
      },
    }),
  })
  if (!res.ok) throw new Error(`농부 수 조회 실패 (${res.status})`)
  const rows = (await res.json()) as Array<{
    result?: { aggregateFields?: { total?: { integerValue?: string } } }
  }>
  return Number(rows[0]?.result?.aggregateFields?.total?.integerValue ?? 0)
}

export interface Feedback {
  name: string
  message: string
  createdAt: number
}

/** 피드백 등록 */
export async function submitFeedback(
  name: string,
  message: string,
): Promise<void> {
  const res = await fetch(`${BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        name: { stringValue: name },
        message: { stringValue: message },
        createdAt: { integerValue: String(Date.now()) },
      },
    }),
  })
  if (!res.ok) throw new Error(`피드백 저장 실패 (${res.status})`)
}

/** 최근 피드백 목록 (최신순) */
export async function fetchFeedback(limit = 30): Promise<Feedback[]> {
  const res = await fetch(`${BASE}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'feedback' }],
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit,
      },
    }),
  })
  if (!res.ok) throw new Error(`피드백 조회 실패 (${res.status})`)

  interface Row {
    document?: {
      fields?: {
        name?: { stringValue?: string }
        message?: { stringValue?: string }
        createdAt?: { integerValue?: string }
      }
    }
  }
  const rows = (await res.json()) as Row[]
  return rows
    .filter((r) => r.document?.fields)
    .map((r) => {
      const f = r.document!.fields!
      return {
        name: f.name?.stringValue ?? '익명 농부',
        message: f.message?.stringValue ?? '',
        createdAt: Number(f.createdAt?.integerValue ?? 0),
      }
    })
}
