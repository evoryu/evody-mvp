// Episode logging utilities (local-only persistence)
// Data model keeps minimal fields needed for stats & future SRS extension.
import { getReviewLogs } from './reviews'

export type Episode = {
  id: string
  kind: 'quick' | 'deck' | 'review'
  deckId?: string
  startedAt: number
  finishedAt: number
  correct: number
  incorrect: number
  points: number
  // optional performance stats (mainly for review kind)
  retention?: number      // 0..1 (Good+Easy)/(Total-Again)
  againRate?: number      // Again/Total
  grades?: { again: number; hard: number; good: number; easy: number }
  avgTimeMs?: number      // 平均反応時間(ms) (Reveal→Grade)
  p50TimeMs?: number      // 反応時間中央値 (ms)
  p90TimeMs?: number      // 反応時間90百分位 (ms)
}

const KEY = 'evody:episodes'

function safeNow() {
  return Date.now()
}

function loadAll(): Episode[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Episode[]
  } catch {
    return []
  }
}

function saveAll(list: Episode[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // ignore quota errors
  }
}

export function saveEpisode(ep: Omit<Episode, 'id'> & { id?: string }): Episode {
  const list = loadAll()
  const full: Episode = { id: ep.id ?? crypto.randomUUID(), ...ep }
  list.push(full)
  saveAll(list)
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('evody:episodes:changed', { detail: { id: full.id } }))
    }
  } catch { /* ignore */ }
  return full
}

export function listEpisodes(): Episode[] {
  return loadAll().sort((a, b) => b.finishedAt - a.finishedAt)
}

function dateKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function listTodayEpisodes(now: number = safeNow()): Episode[] {
  const key = dateKey(now)
  return listEpisodes().filter(e => dateKey(e.finishedAt) === key)
}

export type TodayStats = {
  episodes: number
  cards: number
  correct: number
  incorrect: number
  accuracy: number // 0..1
  points: number
}

export function getStatsForToday(now: number = safeNow()): TodayStats {
  const eps = listTodayEpisodes(now)
  if (eps.length === 0) {
    return { episodes: 0, cards: 0, correct: 0, incorrect: 0, accuracy: 0, points: 0 }
  }
  const agg = eps.reduce((acc, e) => {
    acc.cards += e.correct + e.incorrect
    acc.correct += e.correct
    acc.incorrect += e.incorrect
    acc.points += e.points
    return acc
  }, { cards:0, correct:0, incorrect:0, points:0 })
  const accuracy = agg.cards ? agg.correct / agg.cards : 0
  return { episodes: eps.length, cards: agg.cards, correct: agg.correct, incorrect: agg.incorrect, accuracy, points: agg.points }
}

// --- Social Post Formatting ---
export function formatEpisodePost(ep: Episode): string {
  const total = ep.correct + ep.incorrect
  const acc = total ? Math.round((ep.correct / total) * 100) : 0
  let kindLabel: string
  switch (ep.kind) {
    case 'quick': kindLabel = 'Quick学習'; break
    case 'review': kindLabel = 'レビューセッション'; break
    default: kindLabel = `デッキ学習${ep.deckId ? '(' + ep.deckId + ')' : ''}`
  }
  if (ep.kind === 'review' && typeof ep.retention === 'number') {
    return `${kindLabel}を完了: カード ${total}枚 / 正答率 ${acc}% / Retention ${Math.round(ep.retention*100)}% / +${ep.points}pt #evody`
  }
  return `${kindLabel}を完了: カード ${total}枚 / 正答率 ${acc}% / +${ep.points}pt #evody`
}

// --- Streak Calculation ---
export type StreakInfo = { current: number; longest: number; lastActive: string | null }

export function getStreak(now: number = safeNow()): StreakInfo {
  const eps = listEpisodes()
  if (eps.length === 0) return { current: 0, longest: 0, lastActive: null }
  // Unique date keys (finishedAt basis)
  const set = new Set(eps.map(e => dateKey(e.finishedAt)))
  const dates = Array.from(set).sort().reverse() // descending YYYY-MM-DD
  const todayKey = dateKey(now)

  // current streak: start from today, go backwards day by day while date exists
  let current = 0
  // helper to dec one day
  const decDay = (d: Date) => { d.setDate(d.getDate() - 1); return d }
  // Create a fast lookup
  const has = (k: string) => set.has(k)
  const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  if (has(todayKey)) {
    current = 1
    const tmp = new Date(todayKey)
    while (true) {
      decDay(tmp)
      const k = toKey(tmp)
      if (has(k)) current += 1
      else break
    }
  } else {
    // if today has no activity, check yesterday backward only if yesterday active (current may still be a streak not reaching today)
    const tmp = new Date(todayKey)
    decDay(tmp) // yesterday
    if (has(toKey(tmp))) {
      current = 0 // still zero because not including today
      // count consecutive days ending yesterday
      while (has(toKey(tmp))) {
        current += 1
        decDay(tmp)
      }
    }
  }

  // longest streak: scan all date keys sorted ascending and count consecutive runs
  const asc = Array.from(set).sort() // ascending
  let longest = 1
  let run = 1
  for (let i = 1; i < asc.length; i++) {
    const prev = new Date(asc[i - 1])
    const cur = new Date(asc[i])
    // difference in days
    const diff = (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      run += 1
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  return { current, longest, lastActive: dates[0] || null }
}

// Convenience: current streak days only (badges evaluation用)
export function getCurrentStreakDays(now: number = safeNow()): number {
  return getStreak(now).current
}

// --- Daily Activity (for heatmap) ---
export type DayActivity = { date: string; episodes: number; cards: number; points: number }

export function getDailyActivity(days = 30, now: number = safeNow()): DayActivity[] {
  const eps = listEpisodes()
  if (days <= 0) return []
  // Pre-group by date
  const map = new Map<string, { episodes: number; cards: number; points: number }>()
  for (const e of eps) {
    const dk = dateKey(e.finishedAt)
    let cur = map.get(dk)
    if (!cur) { cur = { episodes: 0, cards: 0, points: 0 }; map.set(dk, cur) }
    cur.episodes += 1
    cur.cards += (e.correct + e.incorrect)
    cur.points += e.points
  }
  // Build range [today - (days-1) .. today]
  const out: DayActivity[] = []
  const d = new Date(now)
  d.setHours(0,0,0,0)
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(d)
    dt.setDate(d.getDate() - i)
    const key = dateKey(dt.getTime())
    const rec = map.get(key)
    out.push({ date: key, episodes: rec?.episodes ?? 0, cards: rec?.cards ?? 0, points: rec?.points ?? 0 })
  }
  return out
}

// --- Daily Review Retention Series (weighted) ---
export type DailyRetention = { date: string; retention: number | null }

// deckId 指定: reviewログを deckId でフィルタし日次集計 (grade集計→直接算出)
// deckId 未指定: 既存挙動 (reviewエピソードを (total-again) 加重平均)
export type RetentionWeightMode = 'effective' | 'cards' | 'goodEasy'

export function getDailyReviewRetention(days = 7, now: number = safeNow(), deckId?: string, mode: RetentionWeightMode = 'effective'): DailyRetention[] {
  if (days <= 0) return []

  // --- Deck 指定パス (ReviewLogs ベース) ---
  if (deckId) {
    const logs = getReviewLogs().filter(l => l.deckId === deckId)
    const byDate = new Map<string, { again: number; hard: number; good: number; easy: number; total: number }>()
    for (const l of logs) {
      const dk = dateKey(l.reviewedAt)
      let rec = byDate.get(dk)
      if (!rec) { rec = { again:0, hard:0, good:0, easy:0, total:0 }; byDate.set(dk, rec) }
      switch(l.grade) {
        case 'Again': rec.again++; break
        case 'Hard': rec.hard++; break
        case 'Good': rec.good++; break
        case 'Easy': rec.easy++; break
      }
      rec.total++
    }
    const out: DailyRetention[] = []
    const base = new Date(now); base.setHours(0,0,0,0)
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(base); dt.setDate(base.getDate() - i)
      const key = dateKey(dt.getTime())
      const rec = byDate.get(key)
      if (!rec || rec.total === 0) { out.push({ date: key, retention: null }); continue }
      const total = rec.total
      const denomEffective = total - rec.again
      const denom = mode === 'cards' ? total : (mode === 'goodEasy' ? (rec.good + rec.easy) : denomEffective)
      let retention: number
      if (denom <= 0) retention = 0
      else {
        // retention は常に (good+easy)/(effective denom) で定義し表示一貫性維持
        const baseDenom = denomEffective > 0 ? denomEffective : 1
        retention = (rec.good + rec.easy) / baseDenom
      }
      // weight モードが 'cards' や 'goodEasy' の場合も値自体は変えない（重みは aggregate 時に影響する設計）
      out.push({ date: key, retention })
    }
    return out
  }

  // --- 全体 (既存) パス ---
  const all = listEpisodes().filter(e => e.kind === 'review')
  // group by date
  const byDate = new Map<string, Episode[]>()
  for (const e of all) {
    const dk = dateKey(e.finishedAt)
    let arr = byDate.get(dk)
    if (!arr) { arr = []; byDate.set(dk, arr) }
    arr.push(e)
  }
  const out: DailyRetention[] = []
  const base = new Date(now)
  base.setHours(0,0,0,0)
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(base)
    dt.setDate(base.getDate() - i)
    const key = dateKey(dt.getTime())
    const eps = byDate.get(key) || []
    let weighted = 0
    let weightSum = 0
    for (const ep of eps) {
      if (typeof ep.retention !== 'number') continue
      // base retention is already (good+easy)/(total-again)
      let weight = ep.correct + ep.incorrect // fallback
      if (ep.grades) {
        const g = ep.grades
        const total = g.again + g.hard + g.good + g.easy
        const effective = total - g.again
        const goodEasy = g.good + g.easy
        switch (mode) {
          case 'cards': weight = total; break
          case 'goodEasy': weight = goodEasy > 0 ? goodEasy : 0; break
          case 'effective':
          default: weight = effective > 0 ? effective : (total); break
        }
      } else {
        // no grades: degrade weight choice to cards for all modes (cannot reconstruct)
        weight = ep.correct + ep.incorrect
      }
      if (weight <= 0) continue
      weighted += ep.retention * weight
      weightSum += weight
    }
    out.push({ date: key, retention: weightSum > 0 ? (weighted / weightSum) : null })
  }
  return out
}

// --- Daily Reaction Time Percentiles ---
export type DailyReaction = { date: string; p50: number | null; p90: number | null }

// セッション単位で保存された p50TimeMs / p90TimeMs を日次で加重平均 (weight = セッション回答総数 correct+incorrect)
export function getDailyReactionTimes(days = 7, now: number = safeNow()): DailyReaction[] {
  if (days <= 0) return []
  const all = listEpisodes().filter(e => e.kind === 'review')
  const byDate = new Map<string, { w: number; sumP50: number; sumP90: number; wP50: number; wP90: number }>()
  for (const e of all) {
    const dk = dateKey(e.finishedAt)
    const weight = e.correct + e.incorrect
    if (weight <= 0) continue
    let rec = byDate.get(dk)
    if (!rec) { rec = { w:0, sumP50:0, sumP90:0, wP50:0, wP90:0 }; byDate.set(dk, rec) }
    if (typeof e.p50TimeMs === 'number') { rec.sumP50 += e.p50TimeMs * weight; rec.wP50 += weight }
    if (typeof e.p90TimeMs === 'number') { rec.sumP90 += e.p90TimeMs * weight; rec.wP90 += weight }
  }
  const out: DailyReaction[] = []
  const base = new Date(now); base.setHours(0,0,0,0)
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(base); dt.setDate(base.getDate() - i)
    const key = dateKey(dt.getTime())
    const rec = byDate.get(key)
    out.push({ date: key, p50: rec && rec.wP50>0 ? Math.round(rec.sumP50/rec.wP50) : null, p90: rec && rec.wP90>0 ? Math.round(rec.sumP90/rec.wP90) : null })
  }
  return out
}

// Deck 指定リアクション日次 (ReviewLog ベース) p50/p90
export function getDailyDeckReactionTimes(deckId: string, days = 7, now: number = safeNow()): DailyReaction[] {
  if (!deckId || days <= 0) return []
  const logs = getReviewLogs().filter(l => l.deckId === deckId && typeof l.reactionTimeMs === 'number' && (l.reactionTimeMs as number) > 0)
  // 日別に reactionTimeMs 配列を収集
  const byDate = new Map<string, number[]>()
  for (const l of logs) {
    const dk = dateKey(l.reviewedAt)
    let arr = byDate.get(dk); if (!arr) { arr = []; byDate.set(dk, arr) }
    arr.push(l.reactionTimeMs as number)
  }
  const out: DailyReaction[] = []
  const base = new Date(now); base.setHours(0,0,0,0)
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(base); dt.setDate(base.getDate() - i)
    const key = dateKey(dt.getTime())
    const arr = byDate.get(key)
    if (!arr || arr.length === 0) { out.push({ date: key, p50: null, p90: null }); continue }
    arr.sort((a,b)=> a-b)
    const p50 = arr[Math.floor((arr.length - 1) * 0.5)]
    const p90 = arr[Math.floor((arr.length - 1) * 0.9)]
    out.push({ date: key, p50: Math.round(p50), p90: Math.round(p90) })
  }
  return out
}
