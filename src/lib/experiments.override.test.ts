// Tests for URL override behavior in experiments
import { defineExperiment, getAssignment } from './experiments'

function assert(name: string, cond: boolean) {
  if (!cond) { console.error(`✗ ${name}`); process.exitCode = 1 } else { console.log(`✓ ${name}`) }
}

// Define a deterministic experiment
defineExperiment({ key: 'override_test', variants: ['control','A','B'], hashSalt: 'ov1' })

// Monkey patch window + location for override simulation
// We guard in case tests run in Node without DOM
// Minimal global typing to avoid any (partial window mock)
interface MockWindow { location: { search: string } }
// Use loose typing for global window mock to avoid DOM Location structural requirements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobalWithWindow = typeof globalThis & { window?: any }
const g: GlobalWithWindow = globalThis as GlobalWithWindow
if (typeof window === 'undefined') {
  // minimal localStorage mock for persistence test
  const store: Record<string,string> = {}
  g.window = { location: { search: '' }, localStorage: {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k in store) delete store[k] }
  } } as MockWindow
}

// Helper to set query
function setQuery(q: string) {
  window.location.search = q
}

// 1. No override
setQuery('')
const subj = 'user_alpha'
const base = getAssignment('override_test', subj)!
assert('base assignment exists', !!base)

// 2. Valid override to B
setQuery('?exp.override_test=B')
const ovB = getAssignment('override_test', subj)!
assert('override B applied', ovB.variant === 'B')

// 3. Invalid override ignored
setQuery('?exp.override_test=Z')
const invalid = getAssignment('override_test', subj)!
assert('invalid override ignored (variant unchanged or valid list)', ['control','A','B'].includes(invalid.variant))

// 4. Disabled experiment but override still forces
defineExperiment({ key: 'override_disabled', variants: ['control','A'], enabled: false })
setQuery('?exp.override_disabled=A')
const disabledForced = getAssignment('override_disabled', subj)
assert('override works even when disabled', disabledForced?.variant === 'A')

// 5. Multi override style (?exp=override_test:A)
setQuery('?exp=override_test:A')
const multiSingle = getAssignment('override_test', subj)!
assert('multi single style applied', multiSingle.variant === 'A')

// 6. Multi override with list (?exp=override_test:B&exp=override_disabled:control)
setQuery('?exp=override_test:B&exp=override_disabled:control')
const multiB = getAssignment('override_test', subj)!
assert('multi repeated param applied', multiB.variant === 'B')

// 7. Persistence: clear query, expect last stored value (B)
setQuery('')
const persisted = getAssignment('override_test', subj)!
assert('persisted override reused', persisted.variant === 'B')

console.log('\nExperiment override tests complete.')