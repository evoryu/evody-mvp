import { recordExposure, flushExposuresNow, _getBufferLength, _resetForTest, _disableRetryForTest, _forceFlushSuccessForTest } from './experiments-analytics'

function assert(name: string, cond: boolean) { if(!cond){ console.error(`✗ ${name}`); process.exitCode=1 } else { console.log(`✓ ${name}`) } }

_resetForTest(); _disableRetryForTest(); _forceFlushSuccessForTest(true)

recordExposure('exp_force','A')
recordExposure('exp_force','A')
assert('len 2 before flush', _getBufferLength() === 2)
flushExposuresNow()
assert('cleared after forced success', _getBufferLength() === 0)

// disable force -> events stick again (simulate fallback path)
_forceFlushSuccessForTest(false)
recordExposure('exp_force','A')
flushExposuresNow()
assert('retained after disabling force (no beacon env)', _getBufferLength() >= 1)

console.log('\nExperiment force-success tests complete.')
