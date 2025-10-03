"use client"
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { ensureGeneratedBadgesLoaded, listBadges, type BadgeDefinition, type BadgeCondition } from '@/lib/badges'
import { calcConditionProgress as calcConditionProgressUtil } from '@/lib/badge-progress'
import { getLabel } from '@/lib/labels'
import { InfoHint } from '@/components/info-hint'
import { ProgressBar } from '@/components/progress-bar'
import { useLocale } from '../locale-context'
import { useBadges } from '../badges-context'
import { getCurrentStreakDays } from '@/lib/episodes'
import { getBacklogSnapshot, getRetention7d30d, getUpcomingReviewLoadExtended } from '@/lib/reviews'
import { getReactionMetricSnapshot } from '@/lib/analytics'

type Locale = 'ja' | 'en'
// Label keys we reference here (must exist in labels.ts)
type ConditionLabelKey =
  | 'condition_streak_days'
  | 'condition_backlog_drop'
  | 'condition_reaction_p50_improve'
  | 'condition_tail_index_low'
  | 'condition_flatten_low'
  | 'condition_retention_rate'
  | 'condition_efficiency_score'
  | 'condition_episodes_total'
  | 'anyof_heading'
  | 'and_joiner'

function formatCondition(c: BadgeCondition, locale: Locale): string {
  const keyMap: Record<string,string> = {
    streak_days: 'condition_streak_days',
    backlog_drop: 'condition_backlog_drop',
    reaction_p50_improve: 'condition_reaction_p50_improve',
    tail_index_low: 'condition_tail_index_low',
    flatten_low: 'condition_flatten_low',
    retention_rate: 'condition_retention_rate',
    efficiency_score: 'condition_efficiency_score',
    episodes_total: 'condition_episodes_total'
  }
  const k = keyMap[c.type]
  if (!k) return `${c.type} ${c.op} ${c.value}`
  const template = getLabel(k as ConditionLabelKey, locale)
  const n = c.type === 'reaction_p50_improve' ? Math.round(c.value * 100) : c.value
  const d = ((): number | string => {
    if ('windowDays' in c) {
      const v = (c as { windowDays?: number }).windowDays
      return v ?? (c.type === 'episodes_total' ? 7 : '')
    }
    return c.type === 'episodes_total' ? 7 : ''
  })()
  return template
    .replace(/\$\{n\}/g, String(n))
    .replace(/\$\{d\}/g, String(d))
}

export default function AchievementsPage() {
  const { awardSet } = useBadges()
  const locale = useLocale() as Locale
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [defs, setDefs] = useState<BadgeDefinition[]>([])
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [hideEarned, setHideEarned] = useState(false)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  // Hydrate from URL query once (client side)
  useEffect(()=> {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const cat = sp.get('ac_cat'); if (cat) setCategoryFilter(cat)
    const q = sp.get('ac_q'); if (q) setQuery(q)
    const he = sp.get('ac_hide'); if (he === '1') setHideEarned(true)
    const tg = sp.get('ac_tag'); if (tg) setTagFilter(tg)
  }, [])

  // Sync to URL (shallow replace) when state changes
  useEffect(()=> {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const sp = url.searchParams
    const setOrDel = (k:string, v:string|undefined)=> { if (v && v.length) sp.set(k,v); else sp.delete(k) }
    setOrDel('ac_cat', categoryFilter !== 'all' ? categoryFilter : undefined)
    setOrDel('ac_q', query.trim() ? query.trim() : undefined)
    setOrDel('ac_hide', hideEarned ? '1' : undefined)
    setOrDel('ac_tag', tagFilter || undefined)
    // keep existing lang param, etc.
    window.history.replaceState(null,'', url.toString())
  }, [categoryFilter, query, hideEarned, tagFilter])

  useEffect(()=> {
    let mounted = true
    ;(async () => {
      await ensureGeneratedBadgesLoaded()
      if (!mounted) return
      setDefs(listBadges())
      setLoaded(true)
    })()
    return ()=> { mounted = false }
  }, [])

  const filtered = useMemo(()=> {
    let base = categoryFilter === 'all' ? defs : defs.filter(d => d.category === categoryFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      base = base.filter(d => {
        const title = (d.title[locale] || d.title.ja || '').toLowerCase()
        const desc = (d.description[locale] || d.description.ja || '').toLowerCase()
        return title.includes(q) || desc.includes(q) || d.id.includes(q)
      })
    }
    if (hideEarned) {
      base = base.filter(d => !awardSet.has(d.id))
    }
    if (tagFilter) {
      base = base.filter(d => d.tags && d.tags.includes(tagFilter))
    }
    return base
  }, [defs, categoryFilter, query, hideEarned, awardSet, locale, tagFilter])

  const sorted = useMemo(()=> {
    return [...filtered].sort((a,b)=> {
      const cat = a.category.localeCompare(b.category)
      if (cat !== 0) return cat
      const tierA = a.tier ?? 0
      const tierB = b.tier ?? 0
      if (tierA !== tierB) return tierA - tierB
      return a.id.localeCompare(b.id)
    })
  }, [filtered])

  // progress snapshot state (auto-refresh)
  type ProgressSnapshot = {
    streakDays: number
    backlogDrop: number
    retentionPct: number
    reactionImprovePct: number
    tailIndex: number
    flatten: number | null
    updatedAt: number
  } | null
  const [progressSnapshot, setProgressSnapshot] = useState<ProgressSnapshot>(null)

  const computeSnapshot = useCallback((): ProgressSnapshot => {
    if (typeof window === 'undefined') return null
    const now = Date.now()
    const backlog = getBacklogSnapshot(now)
    const retention = getRetention7d30d(now)
    const reaction = getReactionMetricSnapshot({ includeDebug: false })
    const upcoming = getUpcomingReviewLoadExtended(14, now)
    return {
      streakDays: getCurrentStreakDays(),
      backlogDrop: backlog.previous != null ? (backlog.previous - backlog.current) : 0,
      retentionPct: retention.r7d.retention != null ? Math.round(retention.r7d.retention * 100) : 0,
      reactionImprovePct: Math.round(reaction.p50Trend7d * 100),
      tailIndex: reaction.tailIndex7dAvg,
      flatten: upcoming.flattenIndex ?? null,
      updatedAt: now
    }
  }, [])

  // initial load
  useEffect(()=> { setProgressSnapshot(computeSnapshot()) }, [computeSnapshot])

  // periodic refresh (every 90s) to capture ongoing changes without heavy load
  useEffect(()=> {
    const id = setInterval(()=> {
      setProgressSnapshot(computeSnapshot())
    }, 90_000)
    return ()=> clearInterval(id)
  }, [computeSnapshot])

  // midnight rollover (approx) - schedule next day boundary update
  useEffect(()=> {
    if (typeof window === 'undefined') return
    const now = Date.now()
    const nextMidnight = new Date()
    nextMidnight.setHours(24,0,5,0) // +5s buffer
    const timeout = nextMidnight.getTime() - now
    const id = setTimeout(()=> setProgressSnapshot(computeSnapshot()), Math.max(5_000, timeout))
    return ()=> clearTimeout(id)
  }, [computeSnapshot])

  // custom event triggers (other parts of app can dispatch for immediate refresh)
  useEffect(()=> {
    function handler() { setProgressSnapshot(computeSnapshot()) }
    window.addEventListener('study:session', handler)
    window.addEventListener('reviews:completed', handler)
    window.addEventListener('cards:added', handler)
    window.addEventListener('backlog:updated', handler)
    return ()=> {
      window.removeEventListener('study:session', handler)
      window.removeEventListener('reviews:completed', handler)
      window.removeEventListener('cards:added', handler)
      window.removeEventListener('backlog:updated', handler)
    }
  }, [computeSnapshot])

  // developer hint (visible only in dev) - show last update timestamp for debugging
  const debugTimestamp = useMemo(()=> {
    if (process.env.NODE_ENV !== 'development') return null
    if (!progressSnapshot) return null
    const d = new Date(progressSnapshot.updatedAt)
    return d.toLocaleTimeString()
  }, [progressSnapshot])

  function calcConditionProgress(c: BadgeCondition): number | null {
    if (!progressSnapshot) return null
    return calcConditionProgressUtil(c, {
      streakDays: progressSnapshot.streakDays,
      backlogDrop: progressSnapshot.backlogDrop,
      retentionPct: progressSnapshot.retentionPct,
      reactionImprovePct: progressSnapshot.reactionImprovePct,
      tailIndex: progressSnapshot.tailIndex,
      flatten: progressSnapshot.flatten
    })
  }

  function renderProgressBar(c: BadgeCondition, ratio: number | null) {
    if (ratio == null) return null
    let inverse = false
    let tooltipKey: string | undefined
    switch(c.type) {
      case 'tail_index_low':
        inverse = true
        tooltipKey = 'tooltipTailIndexInverse'
        break
      case 'flatten_low':
        inverse = true
        tooltipKey = 'tooltipFlattenInverse'
        break
      default:
        // no-op
        break
    }
    return <ProgressBar ratio={ratio} inverse={inverse} tooltipKey={tooltipKey} />
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">実績</h1>
          <p className="mt-1 text-sm text-[var(--c-text-muted)]">獲得済み/未獲得バッジと条件を確認できます。</p>
          {debugTimestamp && (
            <span className="ml-2 inline-block align-middle rounded bg-[var(--c-border)]/50 px-1.5 py-0.5 text-[10px] text-[var(--c-text-secondary)]" title="progress snapshot last updated">{debugTimestamp}</span>
          )}
        </div>
        <div className="rounded-md border border-[var(--c-border)] bg-[var(--c-surface-alt,#f8f8f8)] p-3 text-[11px] leading-relaxed text-[var(--c-text-secondary)] space-y-2">
          <div className="flex items-start gap-2">
            <div>
              <div className="font-semibold mb-1">定着率とは?</div>
              <div className="flex items-start gap-1 flex-wrap">
                <p className="m-0 inline">直近7日分の学習結果で「Good / Easy」と判定された割合 (Again を除いたベース)。</p>
                <InfoHint labelKey="tooltipRetentionMetric" iconSize={12} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <div className="inline-flex items-center gap-1">
              <span className="font-semibold">反応時間中央値</span>
              <InfoHint labelKey="tooltipReactionMedian" iconSize={12} />
            </div>
            <div className="inline-flex items-center gap-1">
              <span className="font-semibold">反応ばらつき指数</span>
              <InfoHint labelKey="tooltipReactionVariability" iconSize={12} />
            </div>
          </div>
        </div>
      </header>
      {!loaded && <div className="text-sm text-[var(--c-text-muted)]">読み込み中...</div>}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 text-[11px]">
          {(['all','streak','backlog','reaction','retention'] as const).map(cat => {
            const labelMap: Record<string, {ja:string;en:string}> = {
              all: { ja: 'すべて', en: 'All' },
              streak: { ja: '連続', en: 'Streak' },
              backlog: { ja: '未処理', en: 'Backlog' },
              reaction: { ja: '反応', en: 'Reaction' },
              retention: { ja: '定着率', en: 'Retention' }
            }
            const l = labelMap[cat][locale]
            return (
              <button
                key={cat}
                onClick={()=> setCategoryFilter(cat)}
                className={`rounded px-2 py-1 border transition-colors ${categoryFilter===cat? 'bg-[var(--c-text)] text-white border-[var(--c-text)]':'border-[var(--c-border)] text-[var(--c-text-secondary)] hover:text-[var(--c-text)]'}`}
              >{l}</button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1">
            <input
              value={query}
              onChange={e=> setQuery(e.target.value)}
              placeholder={locale==='ja'? '検索 (タイトル / 説明 / ID)':'Search (title / desc / id)'}
              className="rounded border border-[var(--c-border)] bg-[var(--c-surface)] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label={locale==='ja'? 'バッジ検索':'Search badges'}
            />
          </div>
          <label className="flex items-center gap-1 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={hideEarned}
              onChange={e=> setHideEarned(e.target.checked)}
              className="accent-indigo-500"
            />
            <span>{locale==='ja'? '獲得済みを隠す':'Hide earned'}</span>
          </label>
          {tagFilter && (
            <div className="flex items-center gap-2 text-[10px] bg-[var(--c-surface-alt,#f2f2f2)] px-2 py-1 rounded">
              <span>{locale==='ja'? 'タグ:':'Tag:'} {tagFilter}</span>
              <button onClick={()=> setTagFilter(null)} className="underline hover:opacity-80">{locale==='ja'? '解除':'Clear'}</button>
            </div>
          )}
          {filtered.length === 0 && (
            <span className="text-[var(--c-text-muted)]">{locale==='ja'? '一致なし':'No matches'}</span>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map(def => {
          const earned = awardSet.has(def.id)
          return (
            <div key={def.id} className={`relative rounded-md border p-4 transition-shadow ${earned ? 'border-[var(--c-border-strong)] shadow-sm' : 'border-[var(--c-border)] opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium leading-snug flex items-center gap-2">
                    {def.title[locale] || def.title.ja}
                    {typeof def.tier === 'number' && (
                      <span className="rounded bg-[var(--c-accent-bg,#eef)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--c-accent-text,#336)]">T{def.tier}</span>
                    )}
                  </h2>
                  <p className="mt-1 line-clamp-3 text-xs text-[var(--c-text-secondary)]">{def.description[locale] || def.description.ja}</p>
                </div>
                <div className="shrink-0 text-lg">{earned ? '✅' : '🔒'}</div>
              </div>
              <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-[var(--c-text-muted)]">
                <div className="font-semibold text-[var(--c-text-secondary)]">条件</div>
                {def.conditions.length > 0 && (
                  <ul className="ml-4 list-disc space-y-1">
                    {def.conditions.map((c,i)=> {
                      const ratio = calcConditionProgress(c)
                      return (
                        <li key={i} className="space-y-0.5">
                          <div>{formatCondition(c, locale)}</div>
                          {renderProgressBar(c, ratio)}
                        </li>
                      )}
                    )}
                  </ul>
                )}
                {def.anyOf && def.anyOf.length > 0 && (
                  <div className="mt-1 rounded-sm bg-[var(--c-surface-alt,#f6f6f6)] p-2">
                    <div className="mb-1 text-[10px] font-semibold text-[var(--c-text-secondary)]">{getLabel('anyof_heading', locale)}</div>
                    <ul className="space-y-1">
                      {def.anyOf.map((group,gIdx)=> (
                        <li key={gIdx} className="ml-3 list-disc space-y-0.5">
                          <div>
                            {group.map(c=> formatCondition(c, locale)).join(locale==='ja'? getLabel('and_joiner','ja') : ` ${getLabel('and_joiner','en')} `)}
                          </div>
                          {(() => {
                            // For OR group progress: take max ratio among tracked conditions
                            const ratios = group.map(g=> calcConditionProgress(g)).filter((r): r is number => r!=null)
                            if (!ratios.length) return null
                            return renderProgressBar(group[0], Math.max(...ratios))
                          })()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {def.tags && def.tags.length > 0 && (
                  <div className="pt-1 text-[10px] flex flex-wrap gap-1">
                    {def.tags.map(t=> (
                      <button
                        key={t}
                        type="button"
                        onClick={()=> setTagFilter(prev => prev===t? null : t)}
                        className={`inline-flex items-center rounded px-1.5 py-0.5 border transition-colors ${tagFilter===t? 'bg-[var(--c-text)] text-white border-[var(--c-text)]':'border-[var(--c-border)] bg-[var(--c-border)]/30 hover:bg-[var(--c-border)]/50'}`}
                        aria-pressed={tagFilter===t}
                        aria-label={locale==='ja'? `タグフィルタ: ${t}`:`Tag filter: ${t}`}
                      >{t}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
