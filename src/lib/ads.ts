// Simple local-only ad/view tracker utilities (prototype)

const K_VIEW_COUNT = 'evody:ads:viewCount'
const K_LAST_SHOWN = 'evody:ads:lastShownAt'

function hasLS() {
  try { return typeof window !== 'undefined' && !!window.localStorage } catch { return false }
}

export function getViewCount(): number {
  if (!hasLS()) return 0
  try {
    const v = localStorage.getItem(K_VIEW_COUNT)
    return v ? Math.max(0, parseInt(v, 10) || 0) : 0
  } catch { return 0 }
}

export function incrementViewCount(): number {
  const cur = getViewCount() + 1
  if (hasLS()) {
    try { localStorage.setItem(K_VIEW_COUNT, String(cur)) } catch {}
  }
  return cur
}

export function getLastShownAt(): number | null {
  if (!hasLS()) return null
  try {
    const v = localStorage.getItem(K_LAST_SHOWN)
    if (!v) return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
  } catch { return null }
}

export function setLastShownAt(ts: number) {
  if (!hasLS()) return
  try { localStorage.setItem(K_LAST_SHOWN, String(ts)) } catch {}
}

/**
 * 表示制御: 最低インターバル(ms)を空ける。初回は常にtrue。
 */
export function shouldShowAd(minIntervalMs = 10 * 60 * 1000): boolean {
  const last = getLastShownAt()
  if (last == null) return true
  return (Date.now() - last) >= minIntervalMs
}

export function markShownNow() {
  setLastShownAt(Date.now())
}

export function resetAdState() {
  if (!hasLS()) return
  try {
    localStorage.removeItem(K_VIEW_COUNT)
    localStorage.removeItem(K_LAST_SHOWN)
  } catch {}
}
