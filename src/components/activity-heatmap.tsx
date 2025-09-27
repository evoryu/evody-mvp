"use client"
import React from 'react'
import { getDailyActivity, DayActivity } from '@/lib/episodes'

// Color scale: 0 → surface-alt border, then 4 stronger steps using CSS vars / inline alpha.
// We derive intensity by points; fallback to episodes if all zero.

function computeLevels(data: DayActivity[]) {
  const maxPoints = Math.max(...data.map(d => d.points), 0)
  const maxEpisodes = Math.max(...data.map(d => d.episodes), 0)
  return data.map(d => {
    const base = maxPoints > 0 ? d.points / maxPoints : (maxEpisodes ? d.episodes / maxEpisodes : 0)
    // 5 buckets: 0,1,2,3,4
    const bucket = base === 0 ? 0 : base < 0.25 ? 1 : base < 0.5 ? 2 : base < 0.75 ? 3 : 4
    return { ...d, level: bucket }
  })
}

export default function ActivityHeatmap({ days = 30 }: { days?: number }) {
  const [data, setData] = React.useState<ReturnType<typeof computeLevels>>([])
  React.useEffect(() => {
    const refresh = () => setData(computeLevels(getDailyActivity(days)))
    refresh()
    window.addEventListener('evody:episodes:changed', refresh)
    return () => window.removeEventListener('evody:episodes:changed', refresh)
  }, [days])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--c-text-secondary)]">直近{days}日アクティビティ</h3>
        <span className="text-[11px] font-medium tracking-wide text-[var(--c-text-muted)]">Ep / Cards / Pts</span>
      </div>
      <div className="grid grid-cols-10 gap-1 sm:grid-cols-15 md:grid-cols-15">
        {data.map(d => {
          const palette = [
            'var(--c-surface-alt)',
            'linear-gradient(to bottom right,var(--c-accent-a) 0%,var(--c-accent-b) 100%)',
            'linear-gradient(to bottom right,var(--c-info-a) 0%,var(--c-info-b) 100%)',
            'linear-gradient(to bottom right,var(--c-success-a) 0%,var(--c-success-b) 100%)',
            'linear-gradient(to bottom right,var(--c-warning-a) 0%,var(--c-warning-b) 100%)',
          ]
          const bg = palette[d.level]
          return (
            <div
              key={d.date}
              className="group relative h-10 rounded-md border text-[10px] font-medium tabular-nums flex items-center justify-center overflow-hidden"
              style={{ background: bg, borderColor: 'var(--c-border)' }}
              title={`${d.date}\nEpisodes: ${d.episodes}\nCards: ${d.cards}\nPoints: ${d.points}`}
            >
              <span className="relative z-10 text-[10px] text-white drop-shadow-sm">
                {d.episodes > 0 ? d.episodes : ''}
              </span>
              <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-[var(--c-surface)]/70 backdrop-blur-sm flex flex-col items-center justify-center text-[9px] text-[var(--c-text-secondary)]">
                <span>{d.date.slice(5)}</span>
                <span>E{d.episodes} C{d.cards} P{d.points}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1 pt-1">
        <span className="text-[10px] text-[var(--c-text-muted)]">少</span>
        {[0,1,2,3,4].map(l => (
          <div key={l} className="h-3 w-6 rounded-sm border" style={{ background: computeLegend(l), borderColor: 'var(--c-border)' }} />
        ))}
        <span className="text-[10px] text-[var(--c-text-muted)]">多</span>
      </div>
    </div>
  )
}

function computeLegend(level: number) {
  switch(level) {
    case 0: return 'var(--c-surface-alt)'
    case 1: return 'linear-gradient(to bottom right,var(--c-accent-a),var(--c-accent-b))'
    case 2: return 'linear-gradient(to bottom right,var(--c-info-a),var(--c-info-b))'
    case 3: return 'linear-gradient(to bottom right,var(--c-success-a),var(--c-success-b))'
    case 4: return 'linear-gradient(to bottom right,var(--c-warning-a),var(--c-warning-b))'
    default: return 'var(--c-surface-alt)'
  }
}
