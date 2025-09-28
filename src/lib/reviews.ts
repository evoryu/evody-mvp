// Simple SRS review logging + naive scheduling
// This is an intentionally lightweight first pass.

export type Grade = 'Again' | 'Hard' | 'Good' | 'Easy'

export type ReviewLog = {
  id: string
  cardId: string
  deckId?: string
  grade: Grade
  reviewedAt: number
  // scheduling snapshot
  interval: number // days
  ease: number     // ease factor *1000 (e.g., 2500 => 2.5)
  nextDue: number  // epoch ms
  reactionTimeMs?: number // 単一レビューの反応時間 (Reveal→Grade) ms (>=0 && <60000 の場合のみ)
  // --- FSRS準備プレースホルダ ---
  difficulty?: number // 1.0 = baseline (内部は 0.5~2.0 目安)
  stability?: number  // 予測保持日数 (簡易推定) 将来 FSRS の S に移行
}

const KEY = 'evody:review_logs'
const STATE_KEY = 'evody:review_state' // per-card state (interval,ease,nextDue)
const INTRO_KEY = 'evody:new_cards' // tracking introduction (date -> cardIds introduced)

export type CardState = { cardId: string; interval: number; ease: number; nextDue: number; difficulty?: number; stability?: number; deckId?: string }

function loadLogs(): ReviewLog[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map((l: unknown) => {
      if (typeof l !== 'object' || l === null) return null
      const o = l as Record<string, unknown>
      const rec: ReviewLog = {
        id: String(o.id || ''),
        cardId: String(o.cardId || ''),
        deckId: typeof o.deckId === 'string' ? o.deckId : undefined,
          grade: isGrade(o.grade) ? o.grade : 'Good',
        reviewedAt: typeof o.reviewedAt === 'number' ? o.reviewedAt : Date.now(),
        interval: typeof o.interval === 'number' ? o.interval : 0,
        ease: typeof o.ease === 'number' ? o.ease : DEFAULT_EASE,
        nextDue: typeof o.nextDue === 'number' ? o.nextDue : Date.now(),
        reactionTimeMs: typeof o.reactionTimeMs === 'number' ? o.reactionTimeMs : undefined,
        difficulty: typeof o.difficulty === 'number' ? o.difficulty : 1.0,
        stability: typeof o.stability === 'number' ? o.stability : undefined,
      }
      return rec
    }).filter((v): v is ReviewLog => !!v)
  } catch { return [] }
}
function saveLogs(list: ReviewLog[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

function loadState(): Record<string, CardState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw) || {}
    for (const k of Object.keys(obj)) {
      const s = obj[k]
      if (s && typeof s === 'object') {
        if (typeof s.difficulty !== 'number') s.difficulty = 1.0
        // stability は遅延評価; 未定義ならそのまま
      }
    }
    return obj
  } catch { return {} }
}
function saveState(map: Record<string, CardState>) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STATE_KEY, JSON.stringify(map)) } catch {}
}

function loadIntro(): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(INTRO_KEY)
    if (!raw) return {}
    return JSON.parse(raw) || {}
  } catch { return {} }
}
function saveIntro(map: Record<string, string[]>) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(INTRO_KEY, JSON.stringify(map)) } catch {}
}

// ---- Recent Daily Performance Helper (rolling retention / again trend) ----
export interface DailyPerformanceRow { date: string; total: number; again: number; hard: number; good: number; easy: number; retention: number | null; againRate: number | null }
export function getRecentDailyPerformance(days = 14, now = Date.now()): DailyPerformanceRow[] {
  if (typeof window === 'undefined' || days <= 0) return []
  const logs = loadLogs()
  const dayMs = 24*60*60*1000
  const baseDay = new Date(now); baseDay.setHours(0,0,0,0)
  const startTs = baseDay.getTime() - (days-1)*dayMs
  // aggregate by day key
  const agg = new Map<string, { again:number; hard:number; good:number; easy:number; total:number }>()
  for (const l of logs) {
    if (l.reviewedAt < startTs) continue
    const d = new Date(l.reviewedAt); d.setHours(0,0,0,0)
    const key = d.toISOString().slice(0,10)
    let rec = agg.get(key)
    if (!rec) { rec = { again:0, hard:0, good:0, easy:0, total:0 }; agg.set(key, rec) }
    switch(l.grade){
      case 'Again': rec.again++; break
      case 'Hard': rec.hard++; break
      case 'Good': rec.good++; break
      case 'Easy': rec.easy++; break
    }
    rec.total++
  }
  const rows: DailyPerformanceRow[] = []
  for (let i=days-1;i>=0;i--) {
    const dt = new Date(baseDay); dt.setDate(baseDay.getDate()-i)
    const key = dt.toISOString().slice(0,10)
    const r = agg.get(key)
    if (!r || r.total===0) {
      rows.push({ date:key, total:0, again:0, hard:0, good:0, easy:0, retention:null, againRate:null })
    } else {
      const denom = r.total - r.again
      const retention = denom>0 ? (r.good + r.easy) / denom : 0
      const againRate = r.total>0 ? r.again / r.total : 0
      rows.push({ date:key, total:r.total, again:r.again, hard:r.hard, good:r.good, easy:r.easy, retention, againRate })
    }
  }
  return rows
}

// Initial defaults
const DEFAULT_EASE = 2500 // 2.5
const DEFAULT_DIFFICULTY = 1.0 // baseline (低=易しい、高=難しい)
const MIN_DIFFICULTY = 0.5
const MAX_DIFFICULTY = 2.0
// stability 簡易初期値: 1日 (後で ease/grade から伸長)
const INITIAL_STABILITY = 1.0

function isGrade(v: unknown): v is Grade {
  return v === 'Again' || v === 'Hard' || v === 'Good' || v === 'Easy'
}

export function scheduleNext(prev: CardState | undefined, grade: Grade, now = Date.now()): CardState {
  // Very naive scheduling (placeholder):
  // Again: reset interval = 0 (next due now + 10m)
  // Hard: +25% of prev interval (min 10m -> 0.007d)
  // Good: *2 interval (min 1d) for early steps escalate
  // Easy: *2.5 interval
  let ease = prev?.ease ?? DEFAULT_EASE
  let intervalDays = prev?.interval ?? 0
  let difficulty = prev?.difficulty ?? DEFAULT_DIFFICULTY
  let stability = prev?.stability // 未定義なら後で初期化

  if (!prev) {
    // First exposure baseline
    intervalDays = 0
  }

  switch (grade) {
    case 'Again':
      ease = Math.max(1300, ease - 200)
      intervalDays = 0
      // Again → 難度微増 / 安定度リセット気味
      difficulty = Math.min(MAX_DIFFICULTY, difficulty + 0.05)
      stability = Math.max(0.5, (stability ?? INITIAL_STABILITY) * 0.6)
      break
    case 'Hard':
      ease = Math.max(1300, ease - 50)
      intervalDays = Math.max(0.007, intervalDays * 1.25 || 0.007)
      difficulty = Math.min(MAX_DIFFICULTY, difficulty + 0.02)
      stability = (stability ?? INITIAL_STABILITY) * 0.9
      break
    case 'Good':
      ease = ease + 20
      intervalDays = intervalDays > 0 ? intervalDays * 2 : 1
      difficulty = difficulty // 変化なし
      stability = (stability ?? INITIAL_STABILITY) * 1.25
      break
    case 'Easy':
      ease = ease + 40
      intervalDays = intervalDays > 0 ? intervalDays * 2.5 : 2
      difficulty = Math.max(MIN_DIFFICULTY, difficulty - 0.03)
      stability = (stability ?? INITIAL_STABILITY) * 1.4
      break
  }

  // nextDue = now + intervalDays
  const nextDue = intervalDays === 0 ? now + 10 * 60 * 1000 : now + intervalDays * 24 * 60 * 60 * 1000

  // stability を interval にある程度リンク (簡易): intervalDays が伸びたら stability も下限引き上げ
  if (intervalDays > 0) {
    const implied = Math.max(1, intervalDays * 0.8)
    stability = Math.max(stability ?? INITIAL_STABILITY, implied)
  }

  return {
    cardId: prev?.cardId || '',
    interval: intervalDays,
    ease,
    nextDue,
    difficulty: parseFloat(difficulty.toFixed(3)),
    stability: stability ? parseFloat(stability.toFixed(2)) : undefined,
  }
}

export function logReview(cardId: string, deckId: string | undefined, grade: Grade, now = Date.now(), reactionTimeMs?: number): ReviewLog | null {
  if (typeof window === 'undefined') return null
  const logs = loadLogs()
  const stateMap = loadState()
  const prev = stateMap[cardId]
  const scheduled = scheduleNext(prev ? { ...prev, cardId } : undefined, grade, now)
  scheduled.cardId = cardId
  // ---- Phase 1.22 FSRS基礎: difficulty / stability の漸進更新 (既存schedule結果とは独立に再計算) ----
  try {
    const updated = applyFsrsBaseline(prev, scheduled, grade)
    stateMap[cardId] = updated
  } catch {
    stateMap[cardId] = scheduled
  }

  const log: ReviewLog = {
    id: crypto.randomUUID(),
    cardId,
    deckId,
    grade,
    reviewedAt: now,
    interval: scheduled.interval,
    ease: scheduled.ease,
    nextDue: scheduled.nextDue,
    ...(typeof reactionTimeMs === 'number' && reactionTimeMs >=0 && reactionTimeMs < 60000 ? { reactionTimeMs: Math.round(reactionTimeMs) } : {}),
    difficulty: scheduled.difficulty,
    stability: scheduled.stability,
  }
  logs.push(log)
  saveLogs(logs)
  saveState(stateMap)

  try { window.dispatchEvent(new CustomEvent('evody:reviews:changed', { detail: { cardId } })) } catch {}
  return log
}

// --- Phase 1.22: FSRS基礎パラメータ更新ロジック ---
// 既存 scheduleNext に手を入れず、その出力(scheduled)をベースに平行して difficulty/stability を改良。
// 方針: scheduleNext が計算した tentative difficulty/stability を受け取り、簡易FSRS風式で再調整。
function applyFsrsBaseline(prev: CardState | undefined, scheduled: CardState, grade: Grade): CardState {
  let difficulty = prev?.difficulty ?? scheduled.difficulty ?? DEFAULT_DIFFICULTY
  let stability = prev?.stability ?? scheduled.stability ?? INITIAL_STABILITY
  // Difficulty shift (damped)
  const diffShift = (() => {
    switch (grade) {
      case 'Again': return +0.15
      case 'Hard': return +0.05
      case 'Good': return -0.02
      case 'Easy': return -0.06
    }
  })()
  difficulty = difficulty + diffShift * 0.6 // damping 0.6
  difficulty = Math.min(2.5, Math.max(0.8, parseFloat(difficulty.toFixed(3))))

  // Stability growth/decay
  switch (grade) {
    case 'Again':
      stability = stability * 0.4
      break
    case 'Hard':
      stability = stability * 1.05 + 0.2
      break
    case 'Good':
      stability = stability * 1.25 + 0.4
      break
    case 'Easy':
      stability = stability * 1.35 + 0.6
      break
  }
  stability = Math.min(120, Math.max(0.5, parseFloat(stability.toFixed(2))))

  // Proposed next interval (preview, not applied to scheduling yet)
  return {
    ...scheduled,
    difficulty,
    stability,
    // scheduleNext が返す interval/nextDue は変更しない (観察段階)
    // 将来: proposedInterval を nextDue 計算に組み込む。現段階では参考として保持しない。
  }
}

export function getReviewLogs(): ReviewLog[] { return loadLogs().sort((a,b)=> b.reviewedAt - a.reviewedAt) }

export function getCardState(cardId: string): CardState | null {
  const map = loadState()
  return map[cardId] || null
}

export function getDueReviews(now = Date.now()): string[] {
  const map = loadState()
  return Object.values(map)
    .filter(s => s.nextDue <= now)
    .map(s => s.cardId)
}

export type ReviewStats = {
  today: number
  due: number
  newCards: number
}

export function getReviewStats(now = Date.now()): ReviewStats {
  const dayStart = new Date(now); dayStart.setHours(0,0,0,0)
  const startMs = dayStart.getTime()
  const logs = loadLogs()
  const today = logs.filter(l => l.reviewedAt >= startMs).length
  const due = getDueReviews(now).length
  // naive: newCards = logs where interval==0 today
  const newCards = logs.filter(l => l.reviewedAt >= startMs && l.interval === 0).length
  return { today, due, newCards }
}

// Performance metrics for today: retention & again rate
export type ReviewPerformance = {
  count: number
  again: number
  hard: number
  good: number
  easy: number
  retention: number // (Good+Easy)/(total-Again) 0..1 (if denominator 0 => 0)
  againRate: number // Again/total 0..1
}

export function getReviewPerformance(now = Date.now()): ReviewPerformance {
  const dayStart = new Date(now); dayStart.setHours(0,0,0,0)
  const startMs = dayStart.getTime()
  const logs = loadLogs().filter(l => l.reviewedAt >= startMs)
  let again=0, hard=0, good=0, easy=0
  for (const l of logs) {
    switch (l.grade) {
      case 'Again': again++; break
      case 'Hard': hard++; break
      case 'Good': good++; break
      case 'Easy': easy++; break
    }
  }
  const total = logs.length
  const denom = total - again
  const retention = denom > 0 ? (good + easy) / denom : 0
  const againRate = total > 0 ? again / total : 0
  return { count: total, again, hard, good, easy, retention, againRate }
}

// ---------------- New Card Introduction (simple daily cap) ----------------
export type NewCardAvailability = {
  date: string
  introducedToday: number
  remainingToday: number
  dailyLimit: number
}

const DAILY_NEW_LIMIT = 5 // MVP default

function todayKey(now = Date.now()): string {
  const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString().slice(0,10)
}

// ---------------- Adaptive New Card Limit (Phase 1.19) ----------------
interface AdaptiveNewLimitDetail { base: number; final: number; computed: number; adjustments: { reason: string; delta: number }[]; overridden: boolean }

const ADAPTIVE_BASE_LIMIT = DAILY_NEW_LIMIT // reuse constant (5)
const ADAPTIVE_MAX_LIMIT = 8
const ADAPTIVE_KEY_PREFIX = 'evody:adaptiveNew:'
// override flags: 'off' (dynamic on), 'fixed' (use base only)

export function getAdaptiveNewLimit(now = Date.now()): AdaptiveNewLimitDetail {
  if (typeof window === 'undefined') return { base: ADAPTIVE_BASE_LIMIT, final: ADAPTIVE_BASE_LIMIT, computed: ADAPTIVE_BASE_LIMIT, adjustments: [], overridden: false }
  const override = localStorage.getItem(ADAPTIVE_KEY_PREFIX + 'override') // 'fixed' | null
  const base = ADAPTIVE_BASE_LIMIT
  if (override === 'fixed') {
    return { base, final: base, computed: base, adjustments: [], overridden: true }
  }
  const adjustments: { reason: string; delta: number }[] = []
  let limit = base
  try {
    // --- Compute last 7 days retention & reaction percentiles directly from ReviewLogs to avoid circular import ---
    const days = 7
    const logs = loadLogs()
    const dayMs = 24*60*60*1000
    const startRange = (() => { const d = new Date(now); d.setHours(0,0,0,0); return d.getTime() - (days-1)*dayMs })()
    const byDate = new Map<string, { again:number; hard:number; good:number; easy:number; total:number; reactions:number[] }>()
    function dk(ts:number){ const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
    for (const l of logs) {
      if (l.reviewedAt < startRange) break // logs are sorted desc when retrieved elsewhere; here unsorted so no guarantee; skip condition anyway
      const key = dk(l.reviewedAt)
      let rec = byDate.get(key)
      if (!rec) { rec = { again:0, hard:0, good:0, easy:0, total:0, reactions:[] }; byDate.set(key, rec) }
      switch(l.grade){
        case 'Again': rec.again++; break
        case 'Hard': rec.hard++; break
        case 'Good': rec.good++; break
        case 'Easy': rec.easy++; break
      }
      rec.total++
      if (typeof l.reactionTimeMs === 'number' && l.reactionTimeMs > 0) rec.reactions.push(l.reactionTimeMs)
    }
    // build chronological arrays
    const retention: { date:string; retention:number|null }[] = []
    const react: { date:string; p50:number|null; p90:number|null }[] = []
    const baseDay = new Date(now); baseDay.setHours(0,0,0,0)
    for (let i=days-1;i>=0;i--) {
      const dt = new Date(baseDay); dt.setDate(baseDay.getDate()-i)
      const key = dk(dt.getTime())
      const rec = byDate.get(key)
      if (!rec || rec.total===0) {
        retention.push({ date:key, retention:null })
        react.push({ date:key, p50:null, p90:null })
        continue
      }
      const denom = rec.total - rec.again
      const retVal = denom>0 ? (rec.good + rec.easy)/denom : 0
      retention.push({ date:key, retention: retVal })
      let p50:null|number=null, p90:null|number=null
      if (rec.reactions.length>0) {
        rec.reactions.sort((a,b)=>a-b)
        p50 = rec.reactions[Math.floor((rec.reactions.length-1)*0.5)]
        p90 = rec.reactions[Math.floor((rec.reactions.length-1)*0.9)]
      }
      react.push({ date:key, p50, p90 })
    }
    const todayRet = retention[retention.length-1]?.retention ?? null
    const pastRet = retention.slice(0,-1).map(r=>r.retention).filter((v): v is number => typeof v==='number')
    const baselineRet = pastRet.length>=3 ? pastRet.reduce((a,b)=>a+b,0)/pastRet.length : null
    const todayReact = react[react.length-1]
    // tail index derivation
    let tiToday: number | null = null
    if (todayReact && todayReact.p50 && todayReact.p50>0 && todayReact.p90 && todayReact.p90>0) tiToday = parseFloat((todayReact.p90 / todayReact.p50).toFixed(2))
    // baseline TI
    const pastTI = react.slice(0,-1).map(r=> (r.p50 && r.p50>0 && r.p90 && r.p90>0)? r.p90/r.p50 : null).filter((v): v is number => typeof v==='number')
    const baselineTI = pastTI.length>=3 ? pastTI.reduce((a,b)=>a+b,0)/pastTI.length : null
    // p50 baseline
    const p50Past = react.slice(0,-1).map(r=>r.p50).filter((v): v is number => typeof v==='number' && v>0)
    const baselineP50 = p50Past.length>=3 ? p50Past.reduce((a,b)=>a+b,0)/p50Past.length : null
    const p50Today = todayReact?.p50 ?? null
    // review performance today
    const perf = getReviewPerformance(now)
    const againRate = perf.againRate
    const struggleRate = (perf.again + perf.hard) / (perf.count || 1)
    // difficulty ratio
    const stateMap = loadState()
    const allStates = Object.values(stateMap)
    const diffRatio = allStates.length ? allStates.filter(s=> (s.difficulty ?? 1) >= 1.3).length / allStates.length : 0

    // Negative adjustments
    if (baselineRet!=null && todayRet!=null && todayRet <= baselineRet - 0.05) { limit -= 1; adjustments.push({ reason: 'retention drop', delta: -1 }) }
    if (tiToday!=null && baselineTI!=null && (tiToday >= 1.6 || tiToday >= baselineTI * 1.05)) { limit -= 1; adjustments.push({ reason: 'variability high', delta: -1 }) }
    if (againRate > 0.30) { limit -= 1; adjustments.push({ reason: 'againRate high', delta: -1 }) }
    if (struggleRate > 0.45) { limit -= 1; adjustments.push({ reason: 'struggle high', delta: -1 }) }
    if (p50Today!=null && baselineP50!=null && p50Today >= baselineP50 * 1.25) { limit -= 1; adjustments.push({ reason: 'slow reaction', delta: -1 }) }
    if (diffRatio > 0.25) { limit -= 1; adjustments.push({ reason: 'many difficult cards', delta: -1 }) }

    // Positive adjustments
    if (baselineRet!=null && todayRet!=null && todayRet >= baselineRet + 0.04) { limit += 1; adjustments.push({ reason: 'retention strong', delta: +1 }) }
    if (againRate < 0.10 && tiToday!=null && tiToday <= 1.30) { limit += 1; adjustments.push({ reason: 'stable & low again', delta: +1 }) }
    if (diffRatio < 0.10) { limit += 1; adjustments.push({ reason: 'few difficult cards', delta: +1 }) }
    // 14d second week warning (Phase 1.24 integration): proactively dampen new introductions
    try {
      const ext14 = getUpcomingReviewLoadExtended(14, now)
      if (ext14.secondWeekWarning) {
        limit -= 1; adjustments.push({ reason: 'second-week-warning', delta: -1 })
      // Deck backlog adaptive penalties (Phase 1.24+)
      if (ext14.decks && ext14.decks.length) {
        let maxRatio = 0
        for (const d of ext14.decks) {
          const r = (d as { backlogRatio?: number }).backlogRatio
          if (typeof r === 'number' && r > maxRatio) maxRatio = r
        }
        if (maxRatio >= 0.40) { limit -= 2; adjustments.push({ reason: 'deck-backlog-high', delta: -2 }) }
        else if (maxRatio >= 0.25) { limit -= 1; adjustments.push({ reason: 'deck-backlog-warn', delta: -1 }) }
      }
      }
    } catch { /* ignore forecast errors */ }
  } catch {/* ignore dynamic calc errors */}

  // ---- Phase 1.21: Workload-aware adjustments ----
  try {
    const stateMap = loadState()
    const totalCards = Object.keys(stateMap).length
    const logsCount = loadLogs().length
    // Early user guard: skip until some critical mass
    if (totalCards >= 50 && logsCount >= 50) {
      const load = getUpcomingReviewLoad(7, now)
      const peakCount = load.peak?.count ?? 0
      const backlog = load.today.backlog
      const avg = load.days.length ? (load.days.reduce((a,d)=>a+d.count,0) / load.days.length) : 0
      const classification = load.classification
      let workloadDelta = 0
      // Suppression for high/medium
      if (classification === 'high') {
        workloadDelta -= 2; adjustments.push({ reason: 'workload:high-peak', delta: -2 })
        if (backlog > 20) { workloadDelta -= 1; adjustments.push({ reason: 'workload:high-backlog', delta: -1 }) }
      } else if (classification === 'medium') {
        workloadDelta -= 1; adjustments.push({ reason: 'workload:medium', delta: -1 })
        if (backlog > 10) { workloadDelta -= 1; adjustments.push({ reason: 'workload:medium-backlog', delta: -1 }) }
      } else { // low
        if (backlog === 0 && peakCount <= 6) {
          workloadDelta += 1; adjustments.push({ reason: 'workload:low-recover', delta: +1 })
          // sustained low check: previous day classification stored
          try {
            const prevCls = localStorage.getItem(ADAPTIVE_KEY_PREFIX + 'prevLoadClass')
            if (prevCls === 'low') { workloadDelta += 1; adjustments.push({ reason: 'workload:low-sustained', delta: +1 }) }
          } catch {}
        }
        if (backlog === 0 && avg <= 3) {
          // avoid duplicate if already granted sustained (cap +2)
          const already = workloadDelta
          if (already < 2) { workloadDelta += 1; adjustments.push({ reason: 'workload:avg-low', delta: +1 }) }
        }
      }
      if (workloadDelta !== 0) limit += workloadDelta
      // store current for next day sustained check
      try { localStorage.setItem(ADAPTIVE_KEY_PREFIX + 'prevLoadClass', classification) } catch {}
      // Cooldown large swings
      try {
        const lastChangeRaw = localStorage.getItem(ADAPTIVE_KEY_PREFIX + 'lastChange')
        const lastChange = lastChangeRaw ? parseInt(lastChangeRaw,10) : null
        const lastDeltaRaw = localStorage.getItem(ADAPTIVE_KEY_PREFIX + 'lastDelta')
        const lastDelta = lastDeltaRaw ? parseInt(lastDeltaRaw,10) : null
        const todayKeyStr = todayKey(now)
        if (lastChange !== null && lastDelta !== null) {
          const lastKey = lastChange
          // If same day already processed we do nothing; if consecutive large in same direction reduce amplitude
          if (todayKeyStr !== String(lastKey) && Math.abs(lastDelta) >= 2) {
            const latestDelta = limit - base
            if (Math.sign(latestDelta) === Math.sign(lastDelta) && Math.abs(latestDelta) >= 2) {
              // soften to ±1 from base
              const target = base + (latestDelta > 0 ? 1 : -1)
              if (limit !== target) {
                adjustments.push({ reason: 'workload:cooldown', delta: target - limit })
                limit = target
              }
            }
          }
        }
        localStorage.setItem(ADAPTIVE_KEY_PREFIX + 'lastChange', todayKeyStr)
        localStorage.setItem(ADAPTIVE_KEY_PREFIX + 'lastDelta', String(limit - base))
      } catch {}
    }
  } catch {/* ignore workload errors */}

  const computed = limit
  // clamp
  limit = Math.max(0, Math.min(ADAPTIVE_MAX_LIMIT, limit))
  // smoothing vs previous day
  try {
    const prev = localStorage.getItem(ADAPTIVE_KEY_PREFIX + 'lastLimit')
    if (prev) {
      const prevNum = parseInt(prev,10)
      if (!Number.isNaN(prevNum) && Math.abs(limit - prevNum) > 2) {
        limit = prevNum + (limit > prevNum ? 2 : -2)
      }
    }
    localStorage.setItem(ADAPTIVE_KEY_PREFIX + 'lastLimit', String(limit))
    localStorage.setItem(ADAPTIVE_KEY_PREFIX + 'limit:' + todayKey(now), String(limit))
  } catch {}
  return { base, final: limit, computed, adjustments, overridden: false }
}

export function getNewCardAvailability(now = Date.now()): NewCardAvailability {
  const key = todayKey(now)
  const intro = loadIntro()
  const introduced = intro[key]?.length || 0
  const detail = getAdaptiveNewLimit(now)
  const dailyLimit = detail.final
  const remaining = Math.max(0, dailyLimit - introduced)
  return { date: key, introducedToday: introduced, remainingToday: remaining, dailyLimit }
}

// Provide cardIds to introduce; they become active by assigning an immediate nextDue = now (so they show as due)
export function introduceNewCards(cardIds: string[], deckId?: string, now = Date.now()): string[] {
  if (typeof window === 'undefined' || cardIds.length === 0) return []
  const stateMap = loadState()
  const intro = loadIntro()
  const key = todayKey(now)
  const current = intro[key] || []
  const availability = getNewCardAvailability(now)
  if (availability.remainingToday <= 0) return []
  const accepted: string[] = []
  for (const id of cardIds) {
    if (accepted.length >= availability.remainingToday) break
    if (stateMap[id]) continue // already introduced
    // initial state: interval=0 (10m placeholder), but mark nextDue = now so it appears immediately for first learning
  stateMap[id] = { cardId: id, interval: 0, ease: 2500, nextDue: now, difficulty: 1.0, stability: 1.0, ...(deckId? { deckId }: {}) }
    accepted.push(id)
  }
  if (accepted.length === 0) return []
  intro[key] = [...current, ...accepted]
  saveState(stateMap)
  saveIntro(intro)
  try { window.dispatchEvent(new CustomEvent('evody:reviews:changed', { detail: { introduced: accepted } })) } catch {}
  return accepted
}

// Undo support: remove last log and recompute all card states from scratch.
export function undoLastReview(): ReviewLog | null {
  if (typeof window === 'undefined') return null
  const logs = loadLogs().sort((a,b)=> a.reviewedAt - b.reviewedAt) // oldest -> newest
  if (logs.length === 0) return null
  const removed = logs.pop()!
  // Recompute state map
  const stateMap: Record<string, CardState> = {}
  for (const log of logs) {
    const prev = stateMap[log.cardId]
    // Re-run schedule using historical grade/time sequence to approximate state.
    const scheduled = scheduleNext(prev ? { ...prev, cardId: log.cardId } : undefined, log.grade, log.reviewedAt)
    scheduled.cardId = log.cardId
    stateMap[log.cardId] = scheduled
    // override with snapshot from log (interval/ease/nextDue) to stay consistent with original record
    stateMap[log.cardId] = { cardId: log.cardId, interval: log.interval, ease: log.ease, nextDue: log.nextDue }
  }
  saveLogs(logs)
  saveState(stateMap)
  try { window.dispatchEvent(new CustomEvent('evody:reviews:changed', { detail: { undo: removed.id } })) } catch {}
  return removed
}

// ---------------- Extended API (FSRS prep) ----------------
export function getCardExtendedState(cardId: string): CardState | null {
  return getCardState(cardId)
}

export function getCardDifficulty(cardId: string): number | null {
  const s = getCardState(cardId)
  return s?.difficulty ?? null
}

export function listDifficultCards(threshold = 1.3): { cardId: string; difficulty: number; stability?: number }[] {
  const map = loadState()
  return Object.values(map)
    .filter(s => typeof s.difficulty === 'number' && (s.difficulty as number) >= threshold)
    .map(s => ({ cardId: s.cardId, difficulty: s.difficulty as number, stability: s.stability }))
    .sort((a,b)=> b.difficulty - a.difficulty)
}

// ---------------- Upcoming Review Load (Phase 1.20) ----------------
export type UpcomingLoadDay = { date: string; count: number; backlog?: number }
export type UpcomingLoadSummary = {
  days: UpcomingLoadDay[]
  total: number
  peak: { date: string; count: number } | null
  median: number
  classification: 'low' | 'medium' | 'high'
  today: { dueToday: number; backlog: number; projected: number }
}

// ---- Extended 7d/14d Horizon (Phase 1.24) ----
export interface UpcomingLoadSummaryExtended extends UpcomingLoadSummary {
  horizon: number
  week1: { peak: number; total: number }
  week2?: { peak: number; total: number }
  globalPeak: number
  peakShift?: number
  loadBalanceRatio?: number | null
  flattenIndex?: number | null
  top3Avg?: number | null
  secondWeekWarning?: boolean
  // Optional deck breakdown (Phase 1.24 deck extension)
  decks?: {
    deckId: string
    // per-day counts aligned with days[] (index0=Today). backlog is represented in day0CountsBacklog if needed
    counts: number[]
    backlog: number // backlog portion attributable to this deck (day0)
    // mini-metrics (computed when horizon>=7) for deck-level week analysis
    w1?: { peak: number; total: number }
    w2?: { peak: number; total: number }
    flatten?: number | null
    top3Avg?: number | null
    backlogRatio?: number | null // backlog / (backlog + future counts sum over horizon) (null if denom 0)
  }[]
}

function computeBaseUpcoming(days: number, now: number): { base: UpcomingLoadSummary; counts: number[]; deckMatrix?: Map<string, { counts: number[]; backlog: number }> } {
  if (days <= 0 || typeof window === 'undefined') {
    return { base: { days: [], total: 0, peak: null, median: 0, classification: 'low', today: { dueToday: 0, backlog: 0, projected: 0 } }, counts: [] }
  }
  const map = loadState()
  const stateList = Object.values(map)
  const baseDay = new Date(now); baseDay.setHours(0,0,0,0)
  const dayStart = baseDay.getTime()
  const dayMs = 24*60*60*1000
  const buckets: { count: number; backlog?: number }[] = Array.from({length: days}, () => ({ count: 0 }))
  // Deck breakdown structures only when days <=14 (limit overhead)
  const enableDecks = days <= 14
  const deckMatrix: Map<string, { counts: number[]; backlog: number }> | undefined = enableDecks ? new Map() : undefined
  let backlog = 0
  const getDeckId = (state: CardState): string => {
    // We opportunistically read a deckId field if present on the stored object.
    // Some older entries may not have it; fall back to 'default'.
    return (state as unknown as { deckId?: string }).deckId || 'default'
  }

  for (const s of stateList) {
    const due = s.nextDue
    if (due < dayStart) { backlog++; continue }
    const diff = Math.floor((due - dayStart) / dayMs)
    if (diff < 0) { backlog++; continue }
    if (diff >= days) continue
    buckets[diff].count++
    if (enableDecks) {
      const deckId = getDeckId(s)
      let rec = deckMatrix!.get(deckId)
      if (!rec) { rec = { counts: Array.from({length: days}, ()=>0), backlog: 0 }; deckMatrix!.set(deckId, rec) }
      rec.counts[diff]++
    }
  }
  if (buckets[0]) {
    buckets[0].backlog = backlog
    if (enableDecks && deckMatrix) {
      // second pass to attribute backlog by deck (cards whose due<dayStart)
      for (const s of stateList) {
        if (s.nextDue < dayStart) {
          const deckId = getDeckId(s)
          let rec = deckMatrix.get(deckId)
          if (!rec) { rec = { counts: Array.from({length: days}, ()=>0), backlog: 0 }; deckMatrix.set(deckId, rec) }
          rec.backlog++
        }
      }
    }
  }
  const daysOut: UpcomingLoadDay[] = buckets.map((b,i)=>{
    const d = new Date(dayStart + i*dayMs)
    const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return { date, count: b.count, ...(i===0 && backlog>0? { backlog }: {}) }
  })
  const counts = buckets.map(b=>b.count)
  const total = counts.reduce((a,b)=>a+b,0) + backlog
  let peak: { date: string; count: number } | null = null
  counts.forEach((c,i)=>{ if (peak===null || c>peak.count) peak = { date: daysOut[i].date, count: c } })
  const sorted = [...counts].sort((a,b)=>a-b)
  const medianRaw = sorted.length ? (sorted.length%2? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2) : 0
  const median = Math.round(medianRaw*100)/100
  const avg = counts.length ? counts.reduce((a,b)=>a+b,0)/counts.length : 0
  let classification: 'low' | 'medium' | 'high'
  const peakCountTmp = peak ? (peak as { date:string; count:number }).count : 0
  if ((peak !== null && peakCountTmp >= 15) || avg >= 10) classification = 'high'
  else if ((peak !== null && peakCountTmp >= 8) || avg >= 5) classification = 'medium'
  else classification = 'low'
  const today = { dueToday: counts[0] || 0, backlog, projected: (counts[0]||0) + backlog }
  return { base: { days: daysOut, total, peak, median, classification, today }, counts, deckMatrix }
}

export function getUpcomingReviewLoadExtended(days = 7, now = Date.now()): UpcomingLoadSummaryExtended {
  const { base, counts, deckMatrix } = computeBaseUpcoming(days, now)
  const horizon = days
  // week1 / week2 peaks & totals
  const week1Counts = counts.slice(0, Math.min(7, counts.length))
  const week1Peak = week1Counts.length ? Math.max(...week1Counts) : 0
  const week1Total = week1Counts.reduce((a,b)=>a+b,0)
  let week2Peak = 0, week2Total = 0
  if (counts.length > 7) {
    const week2Counts = counts.slice(7, Math.min(14, counts.length))
    week2Peak = week2Counts.length ? Math.max(...week2Counts) : 0
    week2Total = week2Counts.reduce((a,b)=>a+b,0)
  }
  const globalPeak = base.peak?.count || 0
  // flatten index
  let flattenIndex: number | null = null
  let top3Avg: number | null = null
  if (counts.length >= 3) {
    const desc = [...counts].sort((a,b)=>b-a)
    const top3 = desc.slice(0,3)
    const sum3 = top3.reduce((a,b)=>a+b,0)
    top3Avg = sum3/ top3.length
    if (top3Avg > 0) flattenIndex = parseFloat((globalPeak / top3Avg).toFixed(2))
  }
  let peakShift: number | undefined
  let loadBalanceRatio: number | null | undefined
  let secondWeekWarning: boolean | undefined
  if (counts.length >= 14) {
    peakShift = week2Peak - week1Peak
    loadBalanceRatio = week1Total>0 ? parseFloat((week2Total / week1Total).toFixed(2)) : null
    const cond1 = week2Peak >= Math.max(8, week1Peak * 1.25)
    const cond2 = (loadBalanceRatio!=null) && loadBalanceRatio >= 1.4
    secondWeekWarning = cond1 || cond2
  }
  const extended: UpcomingLoadSummaryExtended = {
    ...base,
    horizon,
    week1: { peak: week1Peak, total: week1Total },
    ...(counts.length >= 8 ? { week2: { peak: week2Peak, total: week2Total } } : {}),
    globalPeak,
    peakShift,
    loadBalanceRatio,
    flattenIndex,
    top3Avg,
    secondWeekWarning
  }
  if (deckMatrix && deckMatrix.size) {
    const horizonDays = horizon
    extended.decks = Array.from(deckMatrix.entries()).map(([deckId, rec])=> {
      let w1: { peak:number; total:number } | undefined
      let w2: { peak:number; total:number } | undefined
      let flatten: number | null = null
      let top3AvgDeck: number | null = null
      let backlogRatio: number | null = null
      if (horizonDays >= 7) {
        const w1Counts = rec.counts.slice(0, Math.min(7, rec.counts.length))
        if (w1Counts.length) w1 = { peak: Math.max(...w1Counts), total: w1Counts.reduce((a,b)=>a+b,0) }
        if (horizonDays >= 14) {
          const w2Counts = rec.counts.slice(7, Math.min(14, rec.counts.length))
          if (w2Counts.length) w2 = { peak: Math.max(...w2Counts), total: w2Counts.reduce((a,b)=>a+b,0) }
        }
        // deck-level flatten: global deck peak vs deck top3 average (over horizon slice counts)
        const all = rec.counts.slice(0, Math.min(horizonDays, rec.counts.length))
        if (all.length >= 3) {
          const desc = [...all].sort((a,b)=>b-a)
            const top3 = desc.slice(0,3)
            const sum3 = top3.reduce((a,b)=>a+b,0)
            top3AvgDeck = sum3 / top3.length
            const deckPeak = desc[0] || 0
            if (top3AvgDeck > 0) flatten = parseFloat((deckPeak / top3AvgDeck).toFixed(2))
        }
        const futureSum = rec.counts.reduce((a,b)=>a+b,0)
        const denom = rec.backlog + futureSum
        if (denom > 0) backlogRatio = parseFloat((rec.backlog / denom).toFixed(2))
      }
      return { deckId, counts: rec.counts, backlog: rec.backlog, ...(w1?{ w1 }:{}), ...(w2?{ w2 }:{}), ...(flatten!==null? { flatten }: {}), ...(top3AvgDeck!==null? { top3Avg: parseFloat(top3AvgDeck.toFixed(2)) }: {}), ...(backlogRatio!==null? { backlogRatio }: {}) }
    })
  }
  return extended
}

// Backward compatible 7d API (unchanged signature)
export function getUpcomingReviewLoad(days = 7, now = Date.now()): UpcomingLoadSummary {
  const extended = getUpcomingReviewLoadExtended(days, now)
  // Strip extended-only fields to preserve original shape
  const { days: d, total, peak, median, classification, today } = extended
  return { days: d, total, peak, median, classification, today }
}

// ---------------- What-if Simulation (Phase 1.23) ----------------
export interface WhatIfResult {
  additional: number
  original: UpcomingLoadSummary
  simulated: UpcomingLoadSummary
  deltas: { peak: number; median: number; peakIncreasePct: number; classificationChanged: boolean }
  deckImpact?: {
    deckId: string
    day1Before: number
    day1After: number
    deckPeakBefore: number
    deckPeakAfter: number
    deckWeek1TotalBefore?: number
    deckWeek1TotalAfter?: number
  }
  // Phase 1.27 (optional) early interval chain distribution for the newly introduced cards.
  // Example: [{dayOffset:1, added:10}, {dayOffset:3, added:7}, {dayOffset:7, added:5}]
  chainDistribution?: { dayOffset: number; added: number }[]
  // Deck-level chained impact (mirrors deckImpact but includes day3/day7) when deckId provided
  deckChainImpact?: {
    deckId: string
    day1Before: number; day1After: number
    day3Before: number; day3After: number
    day7Before: number; day7After: number
    deckPeakBefore: number; deckPeakAfter: number
    deckWeek1TotalBefore?: number; deckWeek1TotalAfter?: number
  }
  // Phase 1.28 (optional aggregate for chained mode, horizon dependent)
  chainWeek1Added?: number // sum of added counts whose dayOffset <=6
  chainWeek2Added?: number // sum of added counts whose 7<=dayOffset<=13 (when horizon>=14)
}

// Simulate introducing `additional` new cards today (they first reappear tomorrow) and compute impact on 7-day (or horizon) load.
// Assumptions Phase 1.23:
//  - No immediate same-day reviews added (initial learning not counted in forecast bucket 0)
//  - Each new card adds exactly one review on Day1 only (no chaining / lapses)
//  - Backlog remains unchanged
//  - Future expansion: distribute across multiple days using early interval model / FSRS predicted intervals
export function simulateNewCardsImpact(additional: number, horizonDays = 7, now = Date.now()): WhatIfResult {
  if (additional < 0) additional = 0
  const original = getUpcomingReviewLoad(horizonDays, now)
  // If horizon < 2, we cannot show tomorrow bucket impact properly; just echo
  if (original.days.length < 2 || additional === 0) {
    return {
      additional,
      original,
      simulated: original,
      deltas: { peak: 0, median: 0, peakIncreasePct: 0, classificationChanged: false }
    }
  }

  // Clone days and add additional to day index 1 (tomorrow)
  const simulatedDays: UpcomingLoadDay[] = original.days.map((d,i)=> i===1 ? { ...d, count: d.count + additional } : { ...d })
  const counts = simulatedDays.map(d => d.count)
  // Recompute derived metrics
  let peak: { date: string; count: number } | null = null
  counts.forEach((c,i)=>{ const currentPeakCount = peak ? peak.count : -Infinity; if (peak === null || c > currentPeakCount) peak = { date: simulatedDays[i].date, count: c } })
  const sorted = [...counts].sort((a,b)=>a-b)
  const medianRaw = sorted.length ? (sorted.length%2? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2) : 0
  const median = Math.round(medianRaw*100)/100
  const avg = counts.length ? counts.reduce((a,b)=>a+b,0)/counts.length : 0
  let classification: 'low' | 'medium' | 'high'
  const peakCount = peak ? (peak as { date: string; count: number }).count : 0
  if ((peak !== null && peakCount >= 15) || avg >= 10) classification = 'high'
  else if ((peak !== null && peakCount >= 8) || avg >= 5) classification = 'medium'
  else classification = 'low'
  // today (index 0) reused from original but projected unaffected
  const today = original.today
  const backlog = today.backlog
  const total = counts.reduce((a,b)=>a+b,0) + backlog
  const simulated: UpcomingLoadSummary = { days: simulatedDays, total, peak, median, classification, today }
  const deltaPeak = (simulated.peak?.count || 0) - (original.peak?.count || 0)
  const deltaMedian = simulated.median - original.median
  const peakIncreasePct = (original.peak && original.peak.count > 0) ? (deltaPeak / original.peak.count) : 0
  return {
    additional,
    original,
    simulated,
    deltas: {
      peak: deltaPeak,
      median: parseFloat(deltaMedian.toFixed(2)),
      peakIncreasePct: parseFloat((peakIncreasePct*100).toFixed(2)),
      classificationChanged: original.classification !== simulated.classification
    }
  }
}

// Deck-specific variant (Phase 1.26): attaches deckImpact showing per-deck day1 & peak changes.
export function simulateNewCardsImpactWithDeck(additional: number, deckId: string, horizonDays = 7, now = Date.now()): WhatIfResult {
  // Reuse global simulation for aggregate numbers
  const base = simulateNewCardsImpact(additional, horizonDays, now)
  try {
    const ext = getUpcomingReviewLoadExtended(horizonDays, now)
    const target = ext.decks?.find(d => d.deckId === deckId)
    if (!target) return base
    // day index 1 (tomorrow) only
    const day1Before = target.counts[1] || 0
    const day1After = day1Before + (additional > 0 ? additional : 0)
    // deck peak before/after (only tomorrow bucket augmented)
    const deckCountsAfter = target.counts.map((c,i)=> i===1 ? c + additional : c)
    const deckPeakBefore = Math.max(...target.counts)
    const deckPeakAfter = Math.max(...deckCountsAfter)
    const w1Before = target.w1?.total
    let w1After: number | undefined = w1Before
    if (typeof w1Before === 'number') {
      // If day1 (index1) is within first 7 days, add additional once
      if (deckCountsAfter.length >= 2) w1After = w1Before + additional
    }
    return { ...base, deckImpact: { deckId, day1Before, day1After, deckPeakBefore, deckPeakAfter, deckWeek1TotalBefore: w1Before, deckWeek1TotalAfter: w1After } }
  } catch { return base }
}

// Phase 1.27: Chained simulation approximating early intervals (Day1/3/7) for new cards.
// Assumptions:
//  - All new cards have 3 early reviews scheduled at offsets 1,3,7 (typical conservative pattern)
//  - If additional < 0 -> treated as 0
//  - Horizon shorter than a dayOffset simply ignores that bucket
//  - Deck variant: assumes all additional belong to specified deckId
//  - Does not alter backlog; counts add exactly once per offset (no lapses)
export type ChainPresetKey = 'standard' | 'fast' | 'gentle' | 'minimal'
export const CHAIN_PRESETS: Record<ChainPresetKey, number[]> = {
  standard: [1,3,7],
  fast: [1,2,5],
  gentle: [2,5,9],
  minimal: [3,7],
}

function sanitizeOffsets(offsets?: number[]): number[] {
  const fallback = CHAIN_PRESETS.standard
  if (!offsets || !Array.isArray(offsets) || offsets.length === 0) return fallback
  return [...new Set(offsets.filter(o=> Number.isFinite(o) && o>0 && o<365).map(o=> Math.floor(o)))].sort((a,b)=>a-b) || fallback
}

// Added offsets param (Phase 1.29A): allows flexible early interval sets (default standard [1,3,7])
export function simulateNewCardsImpactChained(additional: number, horizonDays = 7, now = Date.now(), offsets?: number[]): WhatIfResult {
  if (additional < 0) additional = 0
  const original = getUpcomingReviewLoad(horizonDays, now)
  if (additional === 0) {
    return { additional, original, simulated: original, deltas: { peak:0, median:0, peakIncreasePct:0, classificationChanged:false }, chainDistribution: [] }
  }
  const chain = sanitizeOffsets(offsets)
  const distribution = chain.filter(d=> d < horizonDays).map(dayOffset => ({ dayOffset, added: additional }))
  // Clone days & apply additions
  const simulatedDays: UpcomingLoadDay[] = original.days.map((d,i)=>{
    const dayOffset = i // index 0 is today; we only add on matching offsets
    const dist = distribution.find(r=> r.dayOffset === dayOffset)
    if (dist) return { ...d, count: d.count + dist.added }
    return { ...d }
  })
  const counts = simulatedDays.map(d=>d.count)
  let peak: { date: string; count: number } | null = null
  counts.forEach((c,i)=>{ if (peak === null || c > peak.count) peak = { date: simulatedDays[i].date, count: c } })
  const sorted = [...counts].sort((a,b)=>a-b)
  const medianRaw = sorted.length ? (sorted.length%2? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2) : 0
  const median = Math.round(medianRaw*100)/100
  const avg = counts.length ? counts.reduce((a,b)=>a+b,0)/counts.length : 0
  let classification: 'low' | 'medium' | 'high'
  const peakCount = peak ? (peak as { date: string; count: number }).count : 0
  if (peakCount >= 15 || avg >= 10) classification = 'high'
  else if (peakCount >= 8 || avg >= 5) classification = 'medium'
  else classification = 'low'
  const today = original.today
  const backlog = today.backlog
  const total = counts.reduce((a,b)=>a+b,0) + backlog
  const simulated: UpcomingLoadSummary = { days: simulatedDays, total, peak, median, classification, today }
  const deltaPeak = (simulated.peak?.count || 0) - (original.peak?.count || 0)
  const deltaMedian = simulated.median - original.median
  const peakIncreasePct = (original.peak && original.peak.count > 0) ? (deltaPeak / original.peak.count) : 0
  const chainWeek1Added = distribution.filter(d=> d.dayOffset<=6).reduce((a,b)=>a+b.added,0) || undefined
  const chainWeek2Added = distribution.filter(d=> d.dayOffset>=7 && d.dayOffset<=13).reduce((a,b)=>a+b.added,0) || undefined
  return {
    additional,
    original,
    simulated,
    deltas: { peak: deltaPeak, median: parseFloat(deltaMedian.toFixed(2)), peakIncreasePct: parseFloat((peakIncreasePct*100).toFixed(2)), classificationChanged: original.classification !== simulated.classification },
    chainDistribution: distribution,
    ...(chainWeek1Added? { chainWeek1Added }: {}),
    ...(chainWeek2Added? { chainWeek2Added }: {})
  }
}

export function simulateNewCardsImpactChainedWithDeck(additional: number, deckId: string, horizonDays=7, now=Date.now(), offsets?: number[]): WhatIfResult {
  const chain = sanitizeOffsets(offsets)
  const base = simulateNewCardsImpactChained(additional, horizonDays, now, chain)
  try {
    const ext = getUpcomingReviewLoadExtended(horizonDays, now)
    const target = ext.decks?.find(d=> d.deckId === deckId)
    if (!target) return base
    const safe = (i:number)=> target.counts[i] || 0
    // Derive before/after for each early offset present in chain; keep legacy keys for 1/3/7 if they exist for backward compatibility in UI (undefined if absent)
    const day1Before = chain.includes(1)? safe(1): safe(1)
    const day3Before = chain.includes(3)? safe(3): safe(3)
    const day7Before = chain.includes(7)? safe(7): safe(7)
    const day1After = chain.includes(1)? day1Before + additional : day1Before
    const day3After = chain.includes(3)? day3Before + additional : day3Before
    const day7After = chain.includes(7)? day7Before + additional : day7Before
    const deckCountsAfter = target.counts.map((c,i)=> chain.includes(i)? c + additional : c)
    const deckPeakBefore = Math.max(...target.counts)
    const deckPeakAfter = Math.max(...deckCountsAfter)
    const w1Before = target.w1?.total
    let w1After: number | undefined = w1Before
    if (typeof w1Before === 'number') {
      // Week1 window offsets contribute if <=6
      let addW1 = 0
      for (const o of chain) if (o<=6 && target.counts.length > o) addW1 += additional
      w1After = w1Before + addW1
    }
    // Pass through aggregate fields from base (chainWeek1Added/chainWeek2Added already computed there)
    return { ...base, deckChainImpact: { deckId, day1Before, day1After, day3Before, day3After, day7Before, day7After, deckPeakBefore, deckPeakAfter, deckWeek1TotalBefore: w1Before, deckWeek1TotalAfter: w1After } }
  } catch { return base }
}
