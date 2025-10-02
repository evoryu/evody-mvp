// Analytics utilities (draft)
// Efficiency Score calculation
// Motivates balanced throughput vs time & retention quality

export interface EfficiencyInput {
  points: number            // 学習獲得ポイント (期間)
  timeMinutes: number       // 所要時間合計 (分)
  retentionPct?: number     // Good/Easy率 (0-100)
  smoothing?: number        // 平滑化係数 (default 0)
}

export interface EfficiencyResult {
  raw: number
  normalized: number    // 0..100 基準化
  components: {
    throughput: number  // points/time
    retentionFactor: number
    timePenalty: number
  }
}

// Heuristics:
// throughput = points / max(timeMinutes, eps)
// retentionFactor = 0.5 + (retentionPct/100)/2  (50% ->0.75, 100%->1.0, 未提供->0.75)
// timePenalty: 過剰時間抑制 (log curve)
// raw = throughput * retentionFactor * timePenalty
// normalized: logistic scaling into 0..100 (tunable)

export function calculateEfficiencyScore(inp: EfficiencyInput): EfficiencyResult {
  const eps = 0.001
  const t = Math.max(inp.timeMinutes, eps)
  const throughput = inp.points / t // points per minute
  const retentionFactor = inp.retentionPct != null
    ? 0.5 + (clamp(inp.retentionPct, 0, 100) / 100) / 2
    : 0.75
  const timePenalty = 1 / (1 + Math.log10(1 + t / 60)) // >1h で徐々に減衰
  const raw = throughput * retentionFactor * timePenalty
  const scale = logistic(raw, 0.8, 10) * 100
  return {
    raw,
    normalized: clamp(scale, 0, 100),
    components: { throughput, retentionFactor, timePenalty }
  }
}

function logistic(x: number, midpoint: number, k: number) {
  // 1 / (1 + e^{-k(x-midpoint)})
  return 1 / (1 + Math.exp(-k * (x - midpoint)))
}

function clamp(v: number, min: number, max: number) { return v < min ? min : v > max ? max : v }

// ---------------------------------------------------------------------------
// Reaction Metrics Snapshot (7日 p50 改善トレンド + Tail Index 平均)
// 用途: バッジ評価 / 進捗指標
//  定義:
//   - 直近7日 (今日含む) を日毎に reactionTimeMs を収集 (0<ms<60000)
//   - 各日 p50, p90 を計算 (サンプル < minSamplesPerDay の日は無視)
//   - baselineP50 = 過去6日 (今日除く) の p50 平均 (>=3日の有効日が必要)
//   - p50Trend7d = (baselineP50 - todayP50)/baselineP50  (改善=正、悪化=負)
//       -> baseline / today 比率ではなく差分率にすることで直感的 (20% 速くなった => 0.20)
//       -> baselineP50<=0 または today 無効なら 0
//   - TailIndex(day) = p90/p50 (両方有効時) 典型的に 1.2〜2.0
//   - tailIndex7dAvg = 有効日の TI 平均 (>=2日), 不足時 fallback = 1.6
// Fallbacks:
//   - データ不足 (today p50 無 or baseline 不足) => p50Trend7d=0
//   - tailIndex7dAvg 不足 => 1.6 (緩め平均)
//   - サーバサイド (window 無) => 即時 fallback
// 返却値はバッジコンテキストでそのまま利用可能。

import { getReviewLogs } from './reviews'

export interface ReactionMetricDailyRow {
  date: string
  p50: number | null
  p90: number | null
  samples: number
}

export interface ReactionMetricSnapshot {
  p50Trend7d: number
  tailIndex7dAvg: number
  debug?: {
    daily: ReactionMetricDailyRow[]
    baselineP50?: number
    todayP50?: number
    daysConsidered: number
  }
}

interface ReactionMetricOptions {
  now?: number
  days?: number // default 7 (固定想定)
  minSamplesPerDay?: number // default 5
  minBaselineDays?: number // baseline 有効日閾値 (default 3)
  minTailIndexDays?: number // TI 平均に必要な日数 (default 2)
  includeDebug?: boolean
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  return sorted[base]
}

export function getReactionMetricSnapshot(opts: ReactionMetricOptions = {}): ReactionMetricSnapshot {
  const {
    now = Date.now(),
    days = 7,
    minSamplesPerDay = 5,
    minBaselineDays = 3,
    minTailIndexDays = 2,
    includeDebug = false,
  } = opts

  if (typeof window === 'undefined') {
    return { p50Trend7d: 0, tailIndex7dAvg: 1.6 }
  }
  if (days < 2) {
    return { p50Trend7d: 0, tailIndex7dAvg: 1.6 }
  }
  const dayMs = 24 * 60 * 60 * 1000
  const baseDay = new Date(now); baseDay.setHours(0,0,0,0)
  const startTs = baseDay.getTime() - (days - 1) * dayMs
  const logs = getReviewLogs() // sorted desc (reviews.ts 実装参照)

  // 日次バケット Map<string, number[]>
  const byDate = new Map<string, number[]>()
  for (const l of logs) {
    if (l.reviewedAt < startTs) break // 以降はより古い
    if (typeof l.reactionTimeMs !== 'number' || l.reactionTimeMs <= 0 || l.reactionTimeMs >= 60000) continue
    const d = new Date(l.reviewedAt); d.setHours(0,0,0,0)
    const key = d.toISOString().slice(0,10)
    let arr = byDate.get(key)
    if (!arr) { arr = []; byDate.set(key, arr) }
    arr.push(l.reactionTimeMs / 1000) // 秒に変換
  }

  const daily: ReactionMetricDailyRow[] = []
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(baseDay); dt.setDate(baseDay.getDate() - i)
    const key = dt.toISOString().slice(0,10)
    const arr = byDate.get(key) || []
    if (arr.length >= minSamplesPerDay) {
      arr.sort((a,b)=>a-b)
      const p50 = quantile(arr, 0.5)
      const p90 = quantile(arr, 0.9)
      daily.push({ date: key, p50: parseFloat(p50.toFixed(2)), p90: parseFloat(p90.toFixed(2)), samples: arr.length })
    } else {
      daily.push({ date: key, p50: null, p90: null, samples: arr.length })
    }
  }

  const todayRow = daily[daily.length - 1]
  const pastRows = daily.slice(0, -1)
  const baselineSet = pastRows.filter(r => r.p50 != null)
  const baselineP50 = baselineSet.length >= minBaselineDays
    ? baselineSet.reduce((a,b)=> a + (b.p50 as number), 0) / baselineSet.length
    : undefined
  const todayP50 = todayRow?.p50 != null ? todayRow.p50 : undefined
  let p50Trend7d = 0
  if (baselineP50 && todayP50 && baselineP50 > 0) {
    p50Trend7d = (baselineP50 - todayP50) / baselineP50
    // clamp  -1 .. +1 (異常値防止)
    p50Trend7d = clamp(p50Trend7d, -1, 1)
  }

  // Tail Index 平均
  const tiValues = daily.map(r => (r.p50 && r.p50 > 0 && r.p90 && r.p90 > 0) ? r.p90 / r.p50 : null)
    .filter((v): v is number => typeof v === 'number')
  const tailIndex7dAvg = tiValues.length >= minTailIndexDays
    ? parseFloat((tiValues.reduce((a,b)=>a+b,0) / tiValues.length).toFixed(2))
    : 1.6

  if (includeDebug) {
    return {
      p50Trend7d,
      tailIndex7dAvg,
      debug: {
        daily,
        baselineP50,
        todayP50,
        daysConsidered: days
      }
    }
  }
  return { p50Trend7d, tailIndex7dAvg }
}
