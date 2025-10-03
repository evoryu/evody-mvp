// Progress calculation unit tests (run with: npm run test:badges or ts-node)
import { calcConditionProgress } from './badge-progress'
import { type BadgeCondition } from './badges'

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error(`✗ ${name}`)
    process.exitCode = 1
  } else {
    console.log(`✓ ${name}`)
  }
}

const base = {
  streakDays: 5,
  backlogDrop: 12,
  retentionPct: 88,
  reactionImprovePct: 15, // 15%
  tailIndex: 1.3,
  flatten: 1.18
}

// forward metric (streak)
assert('streak partial', calcConditionProgress({ type: 'streak_days', op: '>=', value: 10 } as BadgeCondition, base)! > 0 && calcConditionProgress({ type: 'streak_days', op: '>=', value: 10 } as BadgeCondition, base)! < 1)
assert('streak full', calcConditionProgress({ type: 'streak_days', op: '>=', value: 5 } as BadgeCondition, base) === 1)

// backlog forward
assert('backlog ratio', Math.abs(calcConditionProgress({ type: 'backlog_drop', op: '>=', value: 24 } as BadgeCondition, base)! - 0.5) < 0.0001)

// reaction improvement (target 10% -> ratio 15/10=1 =>1)
assert('reaction improve full', calcConditionProgress({ type: 'reaction_p50_improve', op: '>=', value: 0.10 } as BadgeCondition, base) === 1)

// inverse tail index (target 1.2, current 1.3 => 1.2/1.3 ≈ 0.923)
const tailRatio = calcConditionProgress({ type: 'tail_index_low', op: '<=', value: 1.2 } as BadgeCondition, base)!
assert('tail index inverse ratio', tailRatio > 0.90 && tailRatio < 0.93)

// inverse flatten (target 1.15, current 1.18 => 1.15/1.18 ≈ 0.974)
const flatRatio = calcConditionProgress({ type: 'flatten_low', op: '<=', value: 1.15 } as BadgeCondition, base)!
assert('flatten inverse ratio', flatRatio > 0.96 && flatRatio < 0.99)

// retention (target 90, current 88 => 0.977)
const retRatio = calcConditionProgress({ type: 'retention_rate', op: '>=', value: 90 } as BadgeCondition, base)!
assert('retention forward partial', retRatio > 0.95 && retRatio < 0.99)

// null cases
assert('invalid flatten (null)', calcConditionProgress({ type: 'flatten_low', op: '<=', value: 1.2 } as BadgeCondition, { ...base, flatten: null }) === null)
assert('invalid tail (zero)', calcConditionProgress({ type: 'tail_index_low', op: '<=', value: 1.2 } as BadgeCondition, { ...base, tailIndex: 0 }) === null)

console.log('\nProgress calc tests complete.')
