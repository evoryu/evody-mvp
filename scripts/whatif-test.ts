/*
 * Quick manual verification script for What-if simulation edge cases (Phase 1.30A)
 * Run with: npx ts-node scripts/whatif-test.ts (or add a package script if desired)
 */

// NOTE: This script is intended for Node execution (ts-node). The SRS library
// expects `window` and `localStorage` to exist (browser). We provide a very
// small polyfill so the pure calculation functions can run in a headless
// environment for regression / sanity checks.
// These polyfills are intentionally minimal and only cover the calls used by
// the simulation utilities (getUpcomingReviewLoad*, computeRecentReactionStats,
// computeRecentAgainRate). If future functions need more Web APIs, extend here.

interface MinimalWindowPolyfill {
  dispatchEvent: (..._args: unknown[]) => void
  addEventListener: (..._args: unknown[]) => void
  removeEventListener: (..._args: unknown[]) => void
}

// Attach minimal window polyfill when running under Node.
// Use globalThis for universal reference.
const g = globalThis as unknown as { window?: MinimalWindowPolyfill; localStorage?: Storage }
if (typeof g.window === 'undefined') {
  g.window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }
}
if (typeof g.localStorage === 'undefined') {
  const store: Record<string,string> = {}
  const storageLike: Storage = {
    get length() { return Object.keys(store).length },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    getItem: (k: string) => (k in store ? store[k] : null),
    key: (index: number) => Object.keys(store)[index] ?? null,
    removeItem: (k: string) => { delete store[k] },
    setItem: (k: string, v: string) => { store[k] = v },
  }
  g.localStorage = storageLike
}

// Use createRequire to load the TS module under ts-node (works with bundler resolution config)
// This avoids ESM specifier issues with implicit extension under the current tsconfig.
import { createRequire } from 'module'
const req = createRequire(import.meta.url)
const reviews = req('../src/lib/reviews') as typeof import('../src/lib/reviews')
const { simulateNewCardsImpact, simulateNewCardsImpactChained, CHAIN_PRESETS } = reviews

interface Summary {
  add: number
  peakBefore: number | null
  peakAfter: number | null
  deltaPeak: number
  medianBefore: number
  medianAfter: number
  time: null | {
    peakMinBefore: number | undefined
    peakMinAfter: number | undefined
    deltaPeakMin: number | undefined
    w1Before: number | undefined
    w1After: number | undefined
    perCardMedianSec: number
    usedFallback: boolean
  }
  fails: {
    againRate: number | null | undefined
    fallback: boolean | undefined
    expW1: number | undefined
    peakWithFails: number | undefined
    peakDeltaFails: number | undefined
  }
}
function log(title: string, data: Summary){
  console.log(`\n=== ${title} ===`)
  console.log(JSON.stringify(data, null, 2))
}

// Helper to extract minimal fields for readability
function summarize(result: ReturnType<typeof simulateNewCardsImpact>): Summary {
  return {
    add: result.additional,
    peakBefore: result.original.peak?.count ?? null,
    peakAfter: result.simulated.peak?.count ?? null,
    deltaPeak: result.deltas.peak,
    medianBefore: result.original.median,
    medianAfter: result.simulated.median,
    time: result.timeLoad ? {
      peakMinBefore: result.timeLoad.peakTimeMinutesOriginal,
      peakMinAfter: result.timeLoad.peakTimeMinutesSimulated,
      deltaPeakMin: result.timeLoad.peakTimeDeltaMinutes,
      w1Before: result.timeLoad.week1TotalMinutesOriginal,
      w1After: result.timeLoad.week1TotalMinutesSimulated,
      perCardMedianSec: result.timeLoad.perCardMedianSec,
      usedFallback: result.timeLoad.usedFallback,
    } : null,
    fails: {
      againRate: result.againRateSampled,
      fallback: result.againRateFallbackUsed,
      expW1: result.expectedFailuresWeek1,
      peakWithFails: result.expectedPeakWithFailures,
      peakDeltaFails: result.expectedPeakDelta,
    }
  }
}

(function main(){
  const now = Date.now()

  // 1. additional=0 (non-chained)
  const zero = simulateNewCardsImpact(0, 7, now)
  log('additional=0', summarize(zero))

  // 2. horizon 2 days (chained) - offsets beyond horizon ignored
  const chainedH2 = simulateNewCardsImpactChained(10, 2, now, CHAIN_PRESETS.standard)
  log('chained horizon=2 (ignore 3/7)', summarize(chainedH2))

  // 3. standard chained horizon 7
  const chained7 = simulateNewCardsImpactChained(10, 7, now, CHAIN_PRESETS.standard)
  log('chained horizon=7', summarize(chained7))

  // 4. fast preset horizon 7
  const chainedFast = simulateNewCardsImpactChained(12, 7, now, CHAIN_PRESETS.fast)
  log('fast preset horizon=7', summarize(chainedFast))

  // 5. gentle preset horizon 14 (Week2 presence)
  const chainedGentle14 = simulateNewCardsImpactChained(8, 14, now, CHAIN_PRESETS.gentle)
  log('gentle preset horizon=14', summarize(chainedGentle14))

  // 6. minimal preset horizon 14
  const chainedMinimal14 = simulateNewCardsImpactChained(15, 14, now, CHAIN_PRESETS.minimal)
  log('minimal preset horizon=14', summarize(chainedMinimal14))

  // 7. single variant vs chained baseline comparison (sanity)
  const single = simulateNewCardsImpact(10, 7, now)
  log('single add=10 horizon=7', summarize(single))

  console.log('\nNOTE: Reaction time / again rate fallback flags depend on available localStorage review history. \nIf sample is insufficient you should see usedFallback or againRateFallbackUsed= true.')
})();
