import { defineExperiment, getAssignment } from './experiments'

function assert(name: string, cond: boolean) {
  if (!cond) { console.error(`✗ ${name}`); process.exitCode = 1 } else { console.log(`✓ ${name}`) }
}

// Local experiment (avoid interference with defaults)
defineExperiment({ key: 'deterministic_test', variants: ['control','A','B'], hashSalt: 'salt1' })

const subj = 'user_123'
const a1 = getAssignment('deterministic_test', subj)!
const a2 = getAssignment('deterministic_test', subj)!
assert('same subject deterministic', a1.variant === a2.variant && a1.index === a2.index)

const subj2 = 'user_456'
const b1 = getAssignment('deterministic_test', subj2)!
assert('different subject can differ', a1.variant !== b1.variant || a1.index !== b1.index)

// Disabled experiment scenario
import { defineExperiment as redefine } from './experiments'
redefine({ key: 'disabled_exp', variants: ['control','A'], enabled: false })
const disabled = getAssignment('disabled_exp', 'x')
assert('disabled returns null', disabled === null)

console.log('\nExperiment tests complete.')
