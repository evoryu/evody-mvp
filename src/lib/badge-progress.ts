import { type BadgeCondition } from './badges'

export interface ProgressInputs {
  streakDays: number
  backlogDrop: number
  retentionPct: number // 0-100
  reactionImprovePct: number // % (e.g. 12 for 12%)
  tailIndex: number
  flatten: number | null
}

// Calculate condition progress ratio (0..1) or null if not trackable
export function calcConditionProgress(c: BadgeCondition, p: ProgressInputs | null): number | null {
  if (!p) return null
  const clamp = (v:number)=> v<0?0: v>1?1:v
  switch(c.type) {
    case 'streak_days':
      return clamp(p.streakDays / c.value)
    case 'backlog_drop':
      if (c.value <= 0) return null
      return clamp(p.backlogDrop / c.value)
    case 'retention_rate':
      return clamp(p.retentionPct / c.value)
    case 'reaction_p50_improve':
      return clamp(p.reactionImprovePct / Math.round(c.value * 100))
    case 'tail_index_low': {
      const current = p.tailIndex
      if (current <= 0) return null
      return clamp(c.value / current)
    }
    case 'flatten_low': {
      const current = p.flatten
      if (current == null || current <= 0) return null
      return clamp(c.value / current)
    }
    default:
      return null
  }
}
