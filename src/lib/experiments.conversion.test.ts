import { recordExposure, recordConversion, flushExposuresNow, _getBufferLength, _resetForTest, _disableRetryForTest } from './experiments-analytics'

function assert(name: string, cond: boolean) {
  if (!cond) { console.error(`✗ ${name}`); process.exitCode = 1 } else { console.log(`✓ ${name}`) }
}

_resetForTest()
_disableRetryForTest()

// 1. Exposure + conversion both buffer
recordExposure('exp_conv','A')
recordConversion('exp_conv','clicked_cta', { variant: 'A', value: 1 })
assert('buffer len 2', _getBufferLength() === 2)

// 2. Another conversion without variant
recordConversion('exp_conv','completed_flow')
assert('buffer len 3', _getBufferLength() === 3)

// 3. Flush retains (retry path)
flushExposuresNow()
assert('buffer retained after flush', _getBufferLength() === 3)

// 4. Reset clears
_resetForTest()
assert('buffer cleared by reset', _getBufferLength() === 0)

console.log('\nExperiment conversion tests complete.')
