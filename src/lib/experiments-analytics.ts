// Lightweight exposure analytics buffer (Phase: prototype)
// Buffers experiment exposure events and flushes periodically.
// For now, flush uses navigator.sendBeacon if available, else console.info.

export type ExperimentEvent =
  | { type: 'exposure'; key: string; variant: string; ts: number }
  | { type: 'conversion'; key: string; variant?: string; metric: string; value?: number; ts: number }

const buffer: ExperimentEvent[] = []
let scheduled = false
const FLUSH_INTERVAL_MS = 5000
const MAX_BUFFER = 50
const LS_KEY = 'exp.events.buffer.v1'
const RETRY_BASE_DELAYS = [8000, 30000, 120000, 300000, 600000] // 8s,30s,2m,5m,10m
const MAX_RETRY_ATTEMPTS = RETRY_BASE_DELAYS.length
const EVENT_TTL_MS = 1000 * 60 * 60 * 24 // 24h
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryAttempt = 0
let allowRetry = true
let forceSuccess = false
let clearChecked = false

function markSuccess() {
  // 成功したフラッシュ後はバックオフ状態をリセット
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  if (retryAttempt !== 0) retryAttempt = 0
}

function hasLocalStorage(): boolean {
  try { return typeof window !== 'undefined' && !!window.localStorage } catch { return false }
}

function persistBuffer() {
  if (!hasLocalStorage()) return
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(buffer)) } catch { /* ignore */ }
}

function pruneOldEvents(now = Date.now()) {
  if (!buffer.length) return
  const cutoff = now - EVENT_TTL_MS
  if (buffer.some(ev => ev.ts < cutoff)) {
    for (let i = buffer.length - 1; i >= 0; i--) {
      if (buffer[i].ts < cutoff) buffer.splice(i,1)
    }
  }
}

function restoreBuffer() {
  if (!hasLocalStorage()) return
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return
    const arr: unknown = JSON.parse(raw)
    if (Array.isArray(arr)) {
      for (const ev of arr) {
        if (ev && typeof ev === 'object' && 'type' in ev) {
          buffer.push(ev as ExperimentEvent)
        }
      }
    }
  } catch { /* ignore */ }
  pruneOldEvents()
}
restoreBuffer()

function maybeClearFromQuery() {
  if (typeof window === 'undefined' || clearChecked) return
  clearChecked = true
  try {
    const qp = new URLSearchParams(window.location.search)
    if (qp.get('exp.clear') === '1') {
      buffer.splice(0, buffer.length)
      if (hasLocalStorage()) window.localStorage.removeItem(LS_KEY)
      console.info('[exp] buffer cleared via ?exp.clear=1')
    }
  } catch { /* ignore */ }
}
maybeClearFromQuery()

function doFlush() {
  pruneOldEvents()
  if (!buffer.length) { scheduled = false; return }
  const batch = buffer.splice(0, buffer.length)
  scheduled = false
  const payload = JSON.stringify({ type: 'experiment_events', events: batch })
  persistBuffer()
  try {
    if (forceSuccess) {
      // Simulated成功: バックオフ状態をリセット
      persistBuffer()
      markSuccess()
      return
    }
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const ok = (navigator as Navigator & { sendBeacon?: (url: string, data: BodyInit | null | undefined) => boolean }).sendBeacon?.('/__exp_exposure', payload)
      if (!ok) {
        console.info('[exp][flush:fallback] beacon rejected, re-queue for retry', batch)
        buffer.unshift(...batch)
        persistBuffer()
  if (retryAttempt < MAX_RETRY_ATTEMPTS) { retryAttempt++; scheduleRetry() }
      }
      else {
        // beacon成功
        markSuccess()
      }
    } else {
      console.info('[exp][flush] (no beacon) logging batch + keeping for retry', batch)
      buffer.unshift(...batch) // put back so page navigation keeps them if soon
      persistBuffer()
  if (retryAttempt < MAX_RETRY_ATTEMPTS) { retryAttempt++; scheduleRetry() }
    }
  } catch (e) {
    console.warn('[exp][flush:error]', e)
    buffer.unshift(...batch)
    persistBuffer()
  if (retryAttempt < MAX_RETRY_ATTEMPTS) { retryAttempt++; scheduleRetry() }
  }
}

function schedule() {
  if (scheduled) return
  scheduled = true
  setTimeout(doFlush, FLUSH_INTERVAL_MS)
}

function scheduleRetry() {
  if (!allowRetry) return
  if (retryTimer) return
  const delay = RETRY_BASE_DELAYS[Math.min(retryAttempt - 1, RETRY_BASE_DELAYS.length - 1)]
  retryTimer = setTimeout(()=> {
    retryTimer = null
    if (buffer.length) doFlush()
  }, delay)
}

export function recordExposure(key: string, variant: string) {
  pruneOldEvents()
  buffer.push({ type: 'exposure', key, variant, ts: Date.now() })
  persistBuffer()
  if (buffer.length >= MAX_BUFFER) {
    doFlush()
    return
  }
  schedule()
}

export function recordConversion(key: string, metric: string, options?: { variant?: string; value?: number }) {
  pruneOldEvents()
  buffer.push({ type: 'conversion', key, metric, value: options?.value, variant: options?.variant, ts: Date.now() })
  persistBuffer()
  if (buffer.length >= MAX_BUFFER) {
    doFlush(); return
  }
  schedule()
}

export function flushExposuresNow() {
  doFlush()
}

// For testing
export function _getBufferLength() { return buffer.length }
export function _restoreForTest() { restoreBuffer() }
export function _resetForTest() {
  buffer.splice(0, buffer.length)
  scheduled = false
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  retryAttempt = 0
  try { if (hasLocalStorage()) window.localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}
export function _disableRetryForTest() { allowRetry = false; if (retryTimer) { clearTimeout(retryTimer); retryTimer = null } }
export function _forceFlushSuccessForTest(v: boolean) { forceSuccess = v }
export function _maybeClearFromQueryForTest() { clearChecked = false; maybeClearFromQuery() }
export function _pruneForTest() { pruneOldEvents() }
export function _getRetryAttempt() { return retryAttempt }
export function _computeBackoffDelayForTest(a: number) { return RETRY_BASE_DELAYS[Math.min(a, RETRY_BASE_DELAYS.length-1)] }
