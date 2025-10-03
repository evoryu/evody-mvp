import { recordExposure, flushExposuresNow, _getBufferLength, _resetForTest, _disableRetryForTest } from './experiments-analytics'

function assert(name: string, cond: boolean) {
  if (!cond) { console.error(`✗ ${name}`); process.exitCode = 1 } else { console.log(`✓ ${name}`) }
}

// Ensure clean state
_resetForTest()
_disableRetryForTest()

// 1. Buffer accumulates
recordExposure('exp_a','A')
recordExposure('exp_a','A')
assert('buffer length 2', _getBufferLength() === 2)

// 2. Flush does NOT clear (no beacon environment keeps for retry)
flushExposuresNow()
assert('buffer retained after flush (retry)', _getBufferLength() === 2)

// 3. Add more and flush again
for (let i=0;i<3;i++) recordExposure('exp_b','control')
assert('buffer len 5 total', _getBufferLength() === 5)
flushExposuresNow()
assert('buffer retained after second flush', _getBufferLength() === 5)

// 4. Reset clears
_resetForTest()
assert('buffer cleared by reset', _getBufferLength() === 0)

console.log('\nExperiment analytics tests complete.')
