import { recordExposure, flushExposuresNow, _resetForTest, _disableRetryForTest, _getRetryAttempt, _forceFlushSuccessForTest } from './experiments-analytics'

function logAssert(name:string, cond:boolean){ if(cond){ console.log('✓ '+name) } else { console.error('✗ '+name); process.exitCode=1 } }

// We can't fast-forward real timers easily without framework; emulate by calling flush repeatedly with failure path.
// Disable forceSuccess so flush requeues.
_resetForTest()
// keep retry enabled

// produce some events
recordExposure('exp_backoff','A')
recordExposure('exp_backoff','A')
flushExposuresNow() // attempt 1 -> retryAttempt becomes 1
logAssert('attempt 1', _getRetryAttempt() === 1)
flushExposuresNow() // attempt 2 -> retryAttempt 2
logAssert('attempt 2', _getRetryAttempt() === 2)
flushExposuresNow() // attempt 3
logAssert('attempt 3', _getRetryAttempt() === 3)
flushExposuresNow() // attempt 4
logAssert('attempt 4', _getRetryAttempt() === 4)
flushExposuresNow() // attempt 5 (cap)
logAssert('attempt 5', _getRetryAttempt() === 5)
flushExposuresNow() // attempt 6 shouldn't grow (cap at 5)
logAssert('attempt capped', _getRetryAttempt() === 5)

// Now simulate success to reset
_forceFlushSuccessForTest(true)
flushExposuresNow()
logAssert('reset after success', _getRetryAttempt() === 0)

// cleanup
_disableRetryForTest()
console.log('\nExperiment backoff tests complete.')
