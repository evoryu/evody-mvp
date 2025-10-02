// Badge evaluation engine (skeleton)
// Draft v0.1

export type LocaleText = { ja: string; en?: string }

export type ConditionOp = ">=" | ">" | "<=" | "<" | "==" | "diff>=" | "pct>="

export type ConditionType =
  | "streak_days"
  | "backlog_drop"
  | "reaction_p50_improve"
  | "tail_index_low"
  | "flatten_low"
  | "retention_rate"
  | "efficiency_score"
  | "episodes_total"

export interface BadgeCondition {
  type: ConditionType
  op: ConditionOp
  value: number
  windowDays?: number
  deckScope?: string
}

export interface BadgeDefinition {
  id: string
  category: string
  title: LocaleText
  description: LocaleText
  conditions: BadgeCondition[] // AND set (always evaluated)
  anyOf?: BadgeCondition[][]   // OR groups: at least one group (all conditions inside group) must pass
  tier?: number
  repeatable?: boolean
  version: number
  tags?: string[]
}

export interface Award {
  id: string
  tier?: number
  version: number
  awardedAt: number
}

export interface MetricsCtx {
  streakDays: number
  backlog: { current: number; previous?: number }
  reaction: { p50Trend7d: number; tailIndex7dAvg: number }
  flatten: { global: number }
  retention?: { goodEasyPct: number }
  efficiency?: { current: number }
  episodes: { last7d: number; last30d: number }
  timestamp: number
}

// Simple in-memory registry (could be replaced by dynamic import of JSON files)
const registry: BadgeDefinition[] = []

export function registerBadges(defs: BadgeDefinition[]) {
  // id 重複チェック (簡易)
  const existing = new Set(registry.map(b => b.id))
  for (const d of defs) {
    if (existing.has(d.id)) continue
    registry.push(d)
    existing.add(d.id)
  }
}

export function listBadges(): BadgeDefinition[] {
  return [...registry]
}

export function evaluateBadges(ctx: MetricsCtx, owned: Set<string>): Award[] {
  const awards: Award[] = []
  for (const def of registry) {
    if (!def.repeatable && owned.has(def.id)) continue
    const baseOk = def.conditions.every(c => checkCondition(c, ctx))
    if (!baseOk) continue
    let orOk = true
    if (def.anyOf && def.anyOf.length > 0) {
      // At least one group must have all conditions satisfied
      orOk = def.anyOf.some(group => group.every(c => checkCondition(c, ctx)))
    }
    if (!orOk) continue
    awards.push({ id: def.id, tier: def.tier, version: def.version, awardedAt: ctx.timestamp })
  }
  return awards
}

function checkCondition(c: BadgeCondition, ctx: MetricsCtx): boolean {
  switch (c.type) {
    case "streak_days":
      return compare(ctx.streakDays, c)
    case "backlog_drop": {
      if (ctx.backlog.previous == null) return false
      const diff = ctx.backlog.previous - ctx.backlog.current
      return compare(diff, c)
    }
    case "reaction_p50_improve": {
      // p50Trend7d > 0 を改善として扱う簡易版
      return compare(ctx.reaction.p50Trend7d, c)
    }
    case "tail_index_low":
      return compare(ctx.reaction.tailIndex7dAvg, c)
    case "flatten_low":
      return compare(ctx.flatten.global, c)
    case "retention_rate":
      return compare(ctx.retention?.goodEasyPct ?? 0, c)
    case "efficiency_score":
      return compare(ctx.efficiency?.current ?? 0, c)
    case "episodes_total": {
      const days = c.windowDays ?? 7
      const v = days <= 7 ? ctx.episodes.last7d : ctx.episodes.last30d
      return compare(v, c)
    }
    default:
      return false
  }
}

function compare(actual: number, cond: BadgeCondition): boolean {
  const target = cond.value
  switch (cond.op) {
    case ">=": return actual >= target
    case ">": return actual > target
    case "<=": return actual <= target
    case "<": return actual < target
    case "==": return actual === target
    // diff>=, pct>= は既に前処理で actual を差分や率として渡す想定
    case "diff>=":
    case "pct>=":
      return actual >= target
    default:
      return false
  }
}

// Loader for generated registry (scripts/generate-badges.ts)
// Optional import guarded in case generation not yet run.
let _loadedGenerated = false
export async function ensureGeneratedBadgesLoaded() {
  if (_loadedGenerated) return
  try {
    // Attempt TS first (file exists as .ts, Next handles transform). Fallback to .js if build pipeline changes.
    let mod: { BADGE_DEFINITIONS?: BadgeDefinition[] } | null = null
    try {
      mod = await import('./badges-registry.generated') as { BADGE_DEFINITIONS?: BadgeDefinition[] }
    } catch {
      try { mod = await import('./badges-registry.generated.js') as { BADGE_DEFINITIONS?: BadgeDefinition[] } } catch { /* ignore */ }
    }
    if (mod && mod.BADGE_DEFINITIONS && Array.isArray(mod.BADGE_DEFINITIONS)) {
      registerBadges(mod.BADGE_DEFINITIONS)
      _loadedGenerated = true
    }
  } catch {
    // silently ignore – generation step not executed yet
  }
}
