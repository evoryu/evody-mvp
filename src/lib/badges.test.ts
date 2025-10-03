// Minimal badge evaluation tests (no Jest; simple node script)
// Run via: npm run test:badges

import { registerBadges, evaluateBadges, type BadgeDefinition, type MetricsCtx } from './badges'

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error(`✗ ${name}`)
    process.exitCode = 1
  } else {
    console.log(`✓ ${name}`)
  }
}

// Prepare sample badges
const defs: BadgeDefinition[] = [
  {
    id: 'streak_3',
    category: 'streak',
    title: { ja: '3日連続', en: '3-day streak' },
    description: { ja: '3日連続で学習', en: 'Study 3 consecutive days' },
    conditions: [ { type: 'streak_days', op: '>=', value: 3 } ],
    version: 1
  },
  {
    id: 'retention_90_or_alt',
    category: 'retention',
    title: { ja: '定着率90% or 代替', en: 'Retention 90% or alt' },
    description: { ja: '定着率90% もしくは Flatten<=1.2 & BacklogDrop>=5', en: 'Retention 90% or Flatten/backlog combo' },
    conditions: [],
    anyOf: [
      [ { type: 'retention_rate', op: '>=', value: 90 } ],
      [ { type: 'flatten_low', op: '<=', value: 1.2 }, { type: 'backlog_drop', op: '>=', value: 5 } ]
    ],
    version: 1
  },
  {
    id: 'reaction_combo',
    category: 'reaction',
    title: { ja: '反応向上', en: 'Reaction improve' },
    description: { ja: 'Median>=10% & Variability<=1.4', en: 'Median >=10% & variability <=1.4' },
    conditions: [
      { type: 'reaction_p50_improve', op: '>=', value: 0.10 },
      { type: 'tail_index_low', op: '<=', value: 1.4 }
    ],
    version: 1
  }
]

registerBadges(defs)

// Context helpers
function baseCtx(): MetricsCtx {
  return {
    streakDays: 0,
    backlog: { current: 10, previous: 20 },
    reaction: { p50Trend7d: 0, tailIndex7dAvg: 2 },
    flatten: { global: 1.5 },
    retention: { goodEasyPct: 50 },
    efficiency: { current: 0 },
    episodes: { last7d: 0, last30d: 0 },
    timestamp: Date.now()
  }
}

// 1. Streak not yet achieved
const ctx = baseCtx()
let awards = evaluateBadges(ctx, new Set())
assert('no awards initially', awards.length === 0)

// 2. Streak achieved
ctx.streakDays = 3
awards = evaluateBadges(ctx, new Set())
assert('streak_3 awarded', awards.some(a => a.id === 'streak_3'))

// 3. retention anyOf path A
ctx.retention!.goodEasyPct = 92
awards = evaluateBadges(ctx, new Set())
assert('retention_90_or_alt via retention', awards.some(a => a.id === 'retention_90_or_alt'))

// 4. retention anyOf path B (retention low but combo satisfied)
ctx.retention!.goodEasyPct = 80
ctx.flatten.global = 1.18
ctx.backlog.previous = 30
ctx.backlog.current = 20 // drop=10
awards = evaluateBadges(ctx, new Set())
assert('retention_90_or_alt via combo', awards.some(a => a.id === 'retention_90_or_alt'))

// 5. reaction combo satisfied
ctx.reaction.p50Trend7d = 0.11
ctx.reaction.tailIndex7dAvg = 1.35
awards = evaluateBadges(ctx, new Set())
assert('reaction_combo awarded', awards.some(a => a.id === 'reaction_combo'))

// 6. reaction variability fails
ctx.reaction.tailIndex7dAvg = 1.6
awards = evaluateBadges(ctx, new Set())
assert('reaction_combo not awarded when variability high', !awards.some(a => a.id === 'reaction_combo'))

// 7. backlog difference insufficient for combo
ctx.flatten.global = 1.18
ctx.backlog.previous = 25
ctx.backlog.current = 21 // drop=4
ctx.retention!.goodEasyPct = 80
awards = evaluateBadges(ctx, new Set())
assert('retention_90_or_alt not awarded when neither branch passes', !awards.some(a => a.id === 'retention_90_or_alt'))

// 8. episodes_total windowDays test (>=)
const epDef: BadgeDefinition = {
  id: 'episodes_7d_5',
  category: 'episodes',
  title: { ja: '7日5回', en: '5 sessions 7d' },
  description: { ja: '直近7日で5回', en: '5 sessions in last 7 days' },
  conditions: [ { type: 'episodes_total', op: '>=', value: 5, windowDays: 7 } ],
  version: 1
}
registerBadges([epDef])
ctx.episodes.last7d = 5
awards = evaluateBadges(ctx, new Set())
assert('episodes_7d_5 awarded', awards.some(a => a.id === 'episodes_7d_5'))

console.log('\nBadge tests complete.')
