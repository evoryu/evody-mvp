import { defineExperiment, getAssignment } from './experiments'

function assert(name: string, cond: boolean) {
  if (!cond) { console.error(`✗ ${name}`); process.exitCode = 1 } else { console.log(`✓ ${name}`) }
}

// 1. Validation errors
let errorCaught = false
try { defineExperiment({ key: 'w_err_len', variants: ['control','A'], weights: [1] }) } catch { errorCaught = true }
assert('weights length mismatch throws', errorCaught)

errorCaught = false
try { defineExperiment({ key: 'w_err_neg', variants: ['control','A'], weights: [1,-1] }) } catch { errorCaught = true }
assert('negative weight throws', errorCaught)

errorCaught = false
try { defineExperiment({ key: 'w_err_zero', variants: ['control','A'], weights: [0,0] }) } catch { errorCaught = true }
assert('zero sum weight throws', errorCaught)

// 2. Distribution approximation (deterministic hashing over synthetic subjects)
defineExperiment({ key: 'w_dist', variants: ['control','A','B'], weights: [0.6, 0.3, 0.1], hashSalt: 'wd' })

const counts = [0,0,0]
for (let i=0;i<5000;i++) {
  const subj = 'user_' + i
  const res = getAssignment('w_dist', subj)!
  counts[res.index]++
}
const total = counts.reduce((a,b)=>a+b,0)
const ratios = counts.map(c=> c/total)

// Allow 5% absolute deviation due to hash distribution
assert('control approx 0.6', Math.abs(ratios[0]-0.6) < 0.05)
assert('A approx 0.3', Math.abs(ratios[1]-0.3) < 0.05)
assert('B approx 0.1', Math.abs(ratios[2]-0.1) < 0.03)

console.log('\nExperiment weights tests complete.')
