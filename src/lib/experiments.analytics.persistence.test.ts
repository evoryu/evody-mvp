import { recordExposure, flushExposuresNow, _getBufferLength, _restoreForTest, _disableRetryForTest, _resetForTest } from './experiments-analytics'

function assert(name: string, cond: boolean) { if (!cond) { console.error(`✗ ${name}`); process.exitCode = 1 } else { console.log(`✓ ${name}`) } }

// Mock localStorage (if not in browser)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any
if (!g.window) g.window = {}
if (!g.window.localStorage) {
  const store: Record<string,string> = {}
  g.window.localStorage = {
    getItem: (k: string)=> (k in store ? store[k]: null),
    setItem: (k: string,v: string)=> { store[k]=v },
    removeItem: (k: string)=> { delete store[k] },
    clear: ()=> { for (const k in store) delete store[k] }
  }
}

_resetForTest(); _disableRetryForTest()

// 1. Add events and ensure persistence writes
recordExposure('exp_persist','A')
recordExposure('exp_persist','A')
assert('buffer >=2', _getBufferLength() === 2)

// Simulate reload: re-import restore (no real reload, just manual flush + restore)
flushExposuresNow() // attempt flush (will requeue if no beacon)
assert('after flush attempt buffer >=2', _getBufferLength() >= 2)

// Rebuild internal buffer from localStorage (should not shrink)
_restoreForTest()
assert('restore retains events', _getBufferLength() >= 2)

console.log('\nExperiment persistence tests complete.')
