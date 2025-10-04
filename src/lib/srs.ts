// Simple SRS (local only) for prototype
// Stores per-card scheduling in localStorage: intervalDays, ease, dueMs

export type GradeLike = 'Again' | 'Hard' | 'Good' | 'Easy'

type SrsEntry = {
  intervalDays: number
  ease: number
  due: number // epoch ms
}

const LS_KEY = 'evody:srs:v1'

function hasLS() {
  try { return typeof window !== 'undefined' && !!window.localStorage } catch { return false }
}

function loadMap(): Record<string, SrsEntry> {
  if (!hasLS()) return {}
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    return (obj && typeof obj === 'object') ? obj as Record<string, SrsEntry> : {}
  } catch { return {} }
}

function saveMap(map: Record<string, SrsEntry>) {
  if (!hasLS()) return
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(map)) } catch { /* ignore */ }
}

function nowMs() { return Date.now() }

export function getEntry(cardId: string): SrsEntry {
  const map = loadMap()
  let e = map[cardId]
  if (!e) {
    e = { intervalDays: 0, ease: 2.5, due: nowMs() }
    map[cardId] = e
    saveMap(map)
  }
  return e
}

export function schedule(cardId: string, grade: GradeLike, now = nowMs()): SrsEntry {
  const map = loadMap()
  const cur: SrsEntry = map[cardId] ?? { intervalDays: 0, ease: 2.5, due: now }
  let intervalDays = cur.intervalDays
  const easeVal = cur.ease

  const dayMs = 86400000
  if (grade === 'Again') {
    intervalDays = 0
    // next in 5 minutes for a quick retry
    const due = now + 5 * 60 * 1000
  const out = { intervalDays, ease: Math.max(1.8, easeVal - 0.2), due }
    map[cardId] = out; saveMap(map); return out
  }
  if (grade === 'Hard') {
    intervalDays = Math.max(1, intervalDays > 0 ? Math.ceil(intervalDays * 1.2) : 1)
  const out = { intervalDays, ease: Math.max(1.9, easeVal - 0.05), due: now + intervalDays * dayMs }
    map[cardId] = out; saveMap(map); return out
  }
  if (grade === 'Good') {
  intervalDays = intervalDays === 0 ? 1 : Math.ceil(intervalDays * easeVal)
  const out = { intervalDays, ease: easeVal, due: now + intervalDays * dayMs }
    map[cardId] = out; saveMap(map); return out
  }
  // Easy
  intervalDays = Math.max(1, Math.ceil((intervalDays || 1) * (easeVal + 0.3)))
  const out = { intervalDays, ease: Math.min(3.0, easeVal + 0.05), due: now + intervalDays * dayMs }
  map[cardId] = out; saveMap(map); return out
}

export function getDueIds(ids: string[], now = nowMs()): string[] {
  const map = loadMap()
  const due = ids.filter(id => {
    const e = map[id]
    if (!e) return true // unseen -> due now
    return e.due <= now
  })
  // keep input order for stability
  return due
}

export function peekDueCount(ids: string[], now = nowMs()): number {
  return getDueIds(ids, now).length
}
