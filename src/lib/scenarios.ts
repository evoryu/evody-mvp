// Multi-scenario simulation scaffold (draft)
// Allows comparing alternative parameter configurations quickly.

export interface ScenarioConfig {
  id: string
  label?: string
  // Hypothetical adjustments
  dailyNewEpisodes?: number
  reviewFocusRatio?: number // 0..1 fraction of session time on reviews
  maxSessionMinutes?: number
}

export interface ScenarioResultMetrics {
  peak?: number
  median?: number
  backlog?: number
  timeLoadMinutes?: number
}

export interface ScenarioResult {
  id: string
  label?: string
  metrics: ScenarioResultMetrics
}

export function runScenarios(configs: ScenarioConfig[]): ScenarioResult[] {
  // Placeholder deterministic mock until real simulation ported.
  return configs.map(c => {
    const factor = (c.dailyNewEpisodes ?? 10) * (c.reviewFocusRatio ?? 0.5)
    return {
      id: c.id,
      label: c.label,
      metrics: {
        peak: Math.round(factor * 1.8),
        median: Math.round(factor * 0.9),
        backlog: Math.max(0, 100 - factor * 2),
        timeLoadMinutes: Math.round((c.maxSessionMinutes ?? 30) * (0.6 + (c.reviewFocusRatio ?? 0.5) * 0.4))
      }
    }
  })
}
