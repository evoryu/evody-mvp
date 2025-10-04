import { recordExposure, flushExposuresNow, _resetForTest, _disableRetryForTest, _getBufferLength } from './experiments-analytics'

function logAssert(name:string, cond:boolean){ if(cond){ console.log('✓ '+name) } else { console.error('✗ '+name); process.exitCode=1 } }

// This test simulates an exit-like flush by invoking flushExposuresNow() and checking buffer behavior
_resetForTest()
_disableRetryForTest()

recordExposure('exp_exit','A')
recordExposure('exp_exit','A')
logAssert('buffer >=2', _getBufferLength() >= 2)

// On node (no beacon), doFlush re-queues the batch for retry, so buffer remains >=2
flushExposuresNow()
logAssert('buffer retained after node flush', _getBufferLength() >= 2)

console.log('\nExperiment exit-flush tests complete.')
