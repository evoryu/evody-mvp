import { recordExposure } from './experiments-analytics'
// A/B Experiments Skeleton (Phase: skeleton)
// TODO(skeleton): Persist assignments (e.g. localStorage) and add server bucketing if needed.

export type ExperimentKey = 'onboarding_copy_test' | 'progress_detail_format' | string
export type VariantKey = 'control' | 'variantA' | 'variantB' | string

interface ExperimentDef {
  key: ExperimentKey
  variants: VariantKey[] // first = control
  enabled?: boolean
  hashSalt?: string
  weights?: number[] // optional weights corresponding to variants
}

const registry: Map<ExperimentKey, ExperimentDef> = new Map()

// Narrow window localStorage availability without using 'any'
function hasLocalStorage(w: unknown): w is { localStorage: Storage } {
  return typeof w === 'object' && w !== null && 'localStorage' in (w as Record<string, unknown>)
}

export function defineExperiment(def: ExperimentDef) {
  if (!def.variants.length) throw new Error('Experiment must have ≥1 variant')
  if (def.weights) {
    if (def.weights.length !== def.variants.length) throw new Error('weights length mismatch variants length')
    if (def.weights.some(w => w < 0)) throw new Error('weights must be >= 0')
    const sum = def.weights.reduce((a,b)=> a+b, 0)
    if (sum <= 0) throw new Error('weights sum must be > 0')
  }
  registry.set(def.key, { enabled: true, ...def })
}

// Simple FNV-1a hash for deterministic assignment
function hashString(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h >>> 0
}

export interface AssignmentResult {
  key: ExperimentKey
  variant: VariantKey
  index: number
  def: ExperimentDef
}

export function getAssignment(key: ExperimentKey, subjectId: string): AssignmentResult | null {
  const def = registry.get(key)
  if (!def) return null

  // URL override (?exp.<key>=Variant) — dev/QA support
  // precedence: if present & variant valid -> always return that variant even if disabled
  if (typeof window !== 'undefined' && window.location) {
    const allowOverride = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ALLOW_EXP_OVERRIDE === 'true'
    try {
      if (allowOverride) {
        const params = new URLSearchParams(window.location.search || '')
        const overrideParam = 'exp.' + key
        let chosen: string | null = null
        if (window.location.search && params.has(overrideParam)) {
          const ov = params.get(overrideParam) || ''
          if (def.variants.includes(ov)) chosen = ov
        } else if (window.location.search) {
          // multi override style (?exp=<key>:<variant>,<key>:<variant>) fallback
          if (params.has('exp')) {
            const multi = params.getAll('exp') // allow repeated exp params
            for (const entry of multi) {
              // entry format: key:variant
              const [ek, ev] = entry.split(':')
              if (ek === key && ev && def.variants.includes(ev)) { chosen = ev; break }
            }
          }
        }
        // Persistence: if chosen store in localStorage for reuse when query absent
        if (chosen) {
          try { if (typeof window !== 'undefined' && hasLocalStorage(window)) window.localStorage.setItem('exp.override.' + key, chosen) } catch { /* ignore */ }
          return { key, variant: chosen, index: def.variants.indexOf(chosen), def }
        }
        // Query absent: check persisted override
        try {
          let persisted: string | null = null
          if (typeof window !== 'undefined' && hasLocalStorage(window)) {
            persisted = window.localStorage.getItem('exp.override.' + key)
          }
          if (persisted && def.variants.includes(persisted)) {
            return { key, variant: persisted, index: def.variants.indexOf(persisted), def }
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore parse errors */ }
  }

  if (def.enabled === false) return null
  const salt = def.hashSalt || key
  const h = hashString(salt + '::' + subjectId)
  // Weighted selection (if weights provided) using hash -> [0,1) range
  let idx: number
  if (def.weights) {
    const sum = def.weights.reduce((a,b)=> a+b,0)
    const r = h / 0xffffffff // 0..1 (approx)
    let acc = 0
    idx = 0
    for (let i=0;i<def.weights.length;i++) { acc += def.weights[i] / sum; if (r < acc) { idx = i; break } }
  } else {
    idx = h % def.variants.length
  }
  const variant = def.variants[idx]
  return { key, variant, index: idx, def }
}

// Exposure event dispatch (client only)
export function logExperimentExposure(res: AssignmentResult) {
  if (typeof window === 'undefined') return
  const evt = new CustomEvent('experiment:exposure', { detail: res })
  window.dispatchEvent(evt)
  // TODO(skeleton): integrate analytics pipeline
  recordExposure(res.key, res.variant)
}

// Default sample definitions (can be removed later)
defineExperiment({ key: 'onboarding_copy_test', variants: ['control', 'variantA'] })
defineExperiment({ key: 'progress_detail_format', variants: ['control', 'variantA', 'variantB'] })
