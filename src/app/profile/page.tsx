'use client'

import React, { useState, useEffect } from 'react'
import { InfoHint } from '@/components/info-hint'
import { classifyLoadTone, getLabel } from '@/lib/labels'
import { useLocale } from '../locale-context'
// Removed inline What-if UI pieces; dialog encapsulates KPI badges & sections.
import { WhatIfDialog } from '@/components/whatif-dialog'
import { usePoints } from '../points-context'
import Avatar from '@/components/avatar'
import { getStatsForToday, TodayStats, listEpisodes, Episode, getDailyReviewRetention, DailyRetention, RetentionWeightMode, getDailyDeckReactionTimes } from '@/lib/episodes'
import { DECKS } from '@/lib/decks'
import { getReviewStats, ReviewStats, getNewCardAvailability, getAdaptiveNewLimit, getUpcomingReviewLoad, UpcomingLoadSummary, simulateNewCardsImpact, WhatIfResult, introduceNewCards, getUpcomingReviewLoadExtended, simulateNewCardsImpactWithDeck, simulateNewCardsImpactChained, simulateNewCardsImpactChainedWithDeck, CHAIN_PRESETS, ChainPresetKey } from '@/lib/reviews'
import ActivityHeatmap from '@/components/activity-heatmap'


function useHasMounted(){
  const [m,setM] = useState(false)
  useEffect(()=>{ setM(true) },[])
  return m
}

export default function ProfilePage() {
  const { points, reset } = usePoints()

  // ユーザー名（localStorageに保存）
  const [name, setName] = React.useState('')

  // const [daily, setDaily] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    const raw = localStorage.getItem('evody:username')
    if (raw) setName(raw)
  }, [])

  React.useEffect(() => {
    localStorage.setItem('evody:username', name)
  }, [name])

  // const today = dateKey()

  // ▼ 連続記録を計算（今日を起点に過去へ遡って、0になったら停止）
  // （未使用のため削除しました）

  const level = Math.floor(points / 100) + 1 // 仮のレベル計算
  const [todayStats, setTodayStats] = React.useState<TodayStats | null>(null)
  const [autoPost, setAutoPost] = React.useState(false)
  // Removed unused: streak stats no longer displayed on Profile card after refactor.
  const [reviewStats, setReviewStats] = React.useState<ReviewStats>({ today: 0, due: 0, newCards: 0 })
  // Removed unused: review performance aggregate not shown in current UI.
  const [newAvail, setNewAvail] = React.useState(()=> getNewCardAvailability())
  const [adaptiveDetail, setAdaptiveDetail] = React.useState<ReturnType<typeof getAdaptiveNewLimit> | null>(null)
  // Removed unused: adaptive override toggle not surfaced in UI.

  // (Adaptive override loading removed)
  // Removed unused: recent retention sparkline not shown post-cleanup.
  const [showReviewModal, setShowReviewModal] = React.useState(false)
  const [recentReviewEpisodes, setRecentReviewEpisodes] = React.useState<Episode[]>([])
  const [retention7d, setRetention7d] = React.useState<DailyRetention[]>([])
  const [selectedDeck, setSelectedDeck] = React.useState<string>('') // '' = 全体
  // Removed unused: per-deck retention 7d view trimmed.
  const [retentionMode, setRetentionMode] = React.useState<RetentionWeightMode>('effective')
  const [focusAlert, setFocusAlert] = React.useState<string | null>(null)
  // Removed unused: global reaction7d trimmed (deck-specific retained).
  const [deckReaction7d, setDeckReaction7d] = React.useState<{ date: string; p50: number | null; p90: number | null }[]>([])
  const [deckTailIndex7d, setDeckTailIndex7d] = React.useState<{ date: string; ti: number | null }[]>([])
  // Removed unused: global tail index trimmed (deck-specific retained).
  const [upcomingLoad, setUpcomingLoad] = React.useState<UpcomingLoadSummary | null>(null)
  // Extended Horizon (Phase 1.24)
  const [horizon, setHorizon] = React.useState<number>(7)
  const [upcomingLoadExt, setUpcomingLoadExt] = React.useState<ReturnType<typeof getUpcomingReviewLoadExtended> | null>(null) // extended shape (Week2 metrics)
  // Deck stacked (14d only) toggle state
  const [deckStack14, setDeckStack14] = React.useState(false)
  // What-if Simulation state (Phase 1.23)
  const [showWhatIf, setShowWhatIf] = React.useState(false)
  // Collapse states for What-if detail sections (Phase 1.30A UI refinement)
  const [collapseEarly, setCollapseEarly] = React.useState(false)
  const [collapseTime, setCollapseTime] = React.useState(false)
  const [collapseChain, setCollapseChain] = React.useState(false)
  const [whatIfN, setWhatIfN] = React.useState(0)
  const [whatIfResult, setWhatIfResult] = React.useState<WhatIfResult | null>(null)
  const [whatIfChained, setWhatIfChained] = React.useState(false) // Phase 1.27 toggle
  const [chainPreset, setChainPreset] = React.useState<ChainPresetKey>('standard') // Phase 1.29A presets

  // Persist chain preset selection
  React.useEffect(()=>{
    try {
      const saved = localStorage.getItem('evody:whatif:chainPreset') as ChainPresetKey | null
      if (saved && ['standard','fast','gentle','minimal'].includes(saved)) setChainPreset(saved)
    } catch {/* ignore */}
  }, [])
  React.useEffect(()=>{
    try { localStorage.setItem('evody:whatif:chainPreset', chainPreset) } catch {/* ignore */}
  }, [chainPreset])
  const [applying, setApplying] = React.useState(false)
  // Quality Trend card local data (moved out of What-if modal). If reintroduced, re-enable below.
  // const [perfRows, setPerfRows] = React.useState<ReturnType<typeof getRecentDailyPerformance>>([])
  const [whatIfDeck, setWhatIfDeck] = React.useState<string>('ALL')

  // Recompute what-if when chained toggle changes (if modal open)
  React.useEffect(()=>{
    if (!showWhatIf) return
    try {
      if (whatIfChained) {
        const offsets = CHAIN_PRESETS[chainPreset]
        setWhatIfResult(whatIfDeck!=='ALL'? simulateNewCardsImpactChainedWithDeck(whatIfN, whatIfDeck, horizon, Date.now(), offsets): simulateNewCardsImpactChained(whatIfN, horizon, Date.now(), offsets))
      } else {
        setWhatIfResult(whatIfDeck!=='ALL'? simulateNewCardsImpactWithDeck(whatIfN, whatIfDeck, horizon): simulateNewCardsImpact(whatIfN, horizon))
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatIfChained, chainPreset])

  // Deck選択 永続化ロード
  React.useEffect(()=>{
    try {
      const stored = localStorage.getItem('evody:profile:selectedDeck') || ''
      // 有効な deckId か検証 ('' は許可)
      if (stored && !DECKS.some(d=>d.id === stored)) return
      if (stored) setSelectedDeck(stored)
      const m = localStorage.getItem('evody:profile:retWeight') as RetentionWeightMode | null
      if (m === 'cards' || m === 'goodEasy' || m === 'effective') setRetentionMode(m)
    } catch { /* ignore */ }
  }, [])

  React.useEffect(() => {
    // クライアントでのみ計算
    const refresh = () => {
      setTodayStats(getStatsForToday())
  setReviewStats(getReviewStats())
  setNewAvail(getNewCardAvailability())
  try { setAdaptiveDetail(getAdaptiveNewLimit()) } catch { /* ignore */ }
    try {
      // use selected horizon (7 or 14). For 7 keep legacy wrapper for shape compatibility in existing UI pieces.
      const h = horizon
      if (h === 7) {
        setUpcomingLoad(getUpcomingReviewLoad(7))
        try { setUpcomingLoadExt(getUpcomingReviewLoadExtended(7)) } catch { /* ignore */ }
      } else {
        // 14d: we still fill upcomingLoad (legacy basic fields) plus extended metrics in upcomingLoadExt
        const ext = getUpcomingReviewLoadExtended(h)
        setUpcomingLoad({ days: ext.days, total: ext.total, peak: ext.peak, median: ext.median, classification: ext.classification, today: ext.today })
        setUpcomingLoadExt(ext)
      }
    } catch { /* ignore */ }
  // Removed Quality Trend inline fetch (perfRows) after modal refactor.
      try {
        // Removed recentRetention collection (not displayed)
        const eps = listEpisodes().filter(e => e.kind === 'review').slice(0, 20)
        setRecentReviewEpisodes(eps)
  setRetention7d(getDailyReviewRetention(7, undefined, undefined, retentionMode))
  // Removed global reaction / tail index metrics
        // Baseline Adaptive Focus / Variability Alert 判定
        try {
          const retentionAll = getDailyReviewRetention(7)
          const todayKey = retentionAll.length ? retentionAll[retentionAll.length-1].date : null
          if (todayKey) {
            const suppressedKey = 'evody:focusAlert:' + todayKey
            if (!localStorage.getItem(suppressedKey)) {
              // Baseline: 過去6日 (当日除く) の有効値平均 (>=3日で確定)
              const pastRet = retentionAll.slice(0, -1)
              const todayRet = retentionAll[retentionAll.length-1]
              const retPastVals = pastRet.map(r=>r.retention).filter((v): v is number => typeof v==='number' && v>0)
              const mean = (arr:number[]) => arr.reduce((a,b)=>a+b,0)/arr.length
              const baselineRet: number | null = retPastVals.length>=3? mean(retPastVals) : null
              const retNow = todayRet?.retention ?? null
              const messages: string[] = []
              // Simplified: only retention-based alert retained post cleanup
              if (baselineRet!=null && retNow!=null && retNow <= baselineRet - 0.04) {
                messages.push(`Retention低下: ${(retNow*100).toFixed(0)}% (基準 ${(baselineRet*100).toFixed(0)}%)`)
              }
              if (messages.length) {
                setFocusAlert(messages.join(' / ')+ '。短い休憩や新カード導入抑制を検討。')
              } else {
                setFocusAlert(null)
              }
            }
          }
        } catch { /* ignore baseline calc errors */ }
      } catch { /* ignore */ }
    }
    refresh()
    const flag = localStorage.getItem('evody:autoPostEpisodes')
    setAutoPost(flag === '1')
    window.addEventListener('evody:episodes:changed', refresh)
    window.addEventListener('evody:reviews:changed', refresh)
    return () => {
      window.removeEventListener('evody:episodes:changed', refresh)
      window.removeEventListener('evody:reviews:changed', refresh)
    }
  }, [retentionMode, horizon])

  // Load stored horizon preference once
  React.useEffect(()=>{
    try {
      const raw = localStorage.getItem('evody:profile:loadHorizon')
      if (raw === '14') setHorizon(14)
      const stack = localStorage.getItem('evody:profile:deckStack14')
      if (stack === '1') setDeckStack14(true)
    } catch { /* ignore */ }
  }, [])

  // What-if simulation recompute
  React.useEffect(()=>{
    if (!showWhatIf) return
    try {
      if (whatIfChained) {
        const offsets = CHAIN_PRESETS[chainPreset]
        setWhatIfResult(whatIfDeck!=='ALL'? simulateNewCardsImpactChainedWithDeck(whatIfN, whatIfDeck, horizon, Date.now(), offsets): simulateNewCardsImpactChained(whatIfN, horizon, Date.now(), offsets))
      } else {
        if (whatIfDeck !== 'ALL') {
          try { setWhatIfResult(simulateNewCardsImpactWithDeck(whatIfN, whatIfDeck, horizon)) } catch { setWhatIfResult(simulateNewCardsImpact(whatIfN, horizon)) }
        } else {
          setWhatIfResult(simulateNewCardsImpact(whatIfN, horizon))
        }
      }
    } catch {/* ignore */}
  }, [showWhatIf, whatIfN, horizon, whatIfDeck, whatIfChained, chainPreset])

  // Deck変更時のみ個別再計算
  // Removed per-deck retention effect (not displayed)

  // Deck Reaction 7d (ログ変更イベントで自動更新)
  React.useEffect(()=>{
    if (!selectedDeck) { setDeckReaction7d([]); return }
    const update = () => {
      try { setDeckReaction7d(getDailyDeckReactionTimes(selectedDeck, 7)) } catch { /* ignore */ }
    }
    update()
    window.addEventListener('evody:reviews:changed', update)
    return () => { window.removeEventListener('evody:reviews:changed', update) }
  }, [selectedDeck])

  // Deck Tail Index 派生
  React.useEffect(()=>{
    if (!selectedDeck || deckReaction7d.length === 0) { setDeckTailIndex7d([]); return }
    try {
      const ti = deckReaction7d.map(r=>{
        if (r.p50==null || r.p50<=0 || r.p90==null) return { date: r.date, ti: null }
        return { date: r.date, ti: parseFloat((r.p90 / r.p50).toFixed(2)) }
      })
      setDeckTailIndex7d(ti)
    } catch { /* ignore */ }
  }, [deckReaction7d, selectedDeck])

  React.useEffect(() => {
    try {
      localStorage.setItem('evody:autoPostEpisodes', autoPost ? '1' : '0')
    } catch {}
  }, [autoPost])

    const resetDaily = () => {
    localStorage.removeItem('evody:daily')
    // setDaily({})
  }

  const hasMounted = useHasMounted()

  const locale = useLocale()
  return (
    <section className="space-y-6">
      {/* locale: {locale} (debug hidden via CSS if desired) */}
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      {focusAlert && (
        <div className="relative overflow-hidden rounded-xl border border-[var(--c-warn,#d97706)]/50 bg-[var(--c-warn,#d97706)]/10 px-4 py-3 text-[13px] leading-relaxed group" data-focus-alert="1">
          <strong className="mr-2 text-[var(--c-warn,#d97706)]">Focus Alert:</strong>
          <span>{focusAlert} <span className="underline cursor-help text-[11px] opacity-80 group-hover:opacity-100" title={getLabel('tooltipFocusBaseline', locale)}>(詳細)</span></span>
          <button
            onClick={()=>{ try{ localStorage.setItem('evody:focusAlert:'+ new Date().toISOString().slice(0,10), '1')}catch{}; setFocusAlert(null) }}
            className="absolute right-2 top-2 rounded-md px-2 py-0.5 text-[11px] border bg-[var(--c-surface)] hover:bg-[var(--c-surface-alt)]"
          >閉じる</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* プロフィールカード */}
        <div className="task-card rounded-xl border p-4 shadow-sm">
          <h2 className="text-lg font-semibold">ユーザー情報</h2>

          <div className="mt-3 flex items-start gap-4">
            {/* ← アバター */}
            <Avatar name={name || 'You'} size="md" />

            <div className="mt-3 space-y-3">
              <label className="block text-sm text-[var(--c-text-secondary)]">ユーザー名</label>
              <input
                className="form-field"
                placeholder="あなたの名前"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="mt-2 text-sm text-[var(--c-text-muted)]">
                保存先：localStorage（ブラウザ内だけに保存）
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-lg border p-3 text-sm flex items-start gap-3">
            <input
              id="autoPostEpisodes"
              type="checkbox"
              className="mt-1 h-4 w-4 accent-blue-600"
              checked={autoPost}
              onChange={e => setAutoPost(e.target.checked)}
            />
            <label htmlFor="autoPostEpisodes" className="leading-relaxed cursor-pointer">
              学習セッション完了時に自動でフィードへ投稿する
              <span className="block text-[12px] text-[var(--c-text-secondary)] mt-1">投稿本文: カード枚数 / 正答率 / 獲得ポイント (#evody)</span>
            </label>
          </div>
        </div>

        {/* ステータスカード */}
        <div className="task-card rounded-xl border p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-3">学習ステータス
            <span className="ml-auto inline-flex items-center gap-2">
              <select value={retentionMode} onChange={e=>{ const v=e.target.value as RetentionWeightMode; setRetentionMode(v); try{localStorage.setItem('evody:profile:retWeight', v)}catch{} }} className="rounded-md border bg-transparent px-2 py-1 text-[11px] focus:outline-none" title={getLabel('tooltipRetentionMode', locale)}>
                <option value="effective">Eff</option>
                <option value="cards">Cards</option>
                <option value="goodEasy">G+E</option>
              </select>
              <select value={selectedDeck} onChange={e=>{ const v=e.target.value; setSelectedDeck(v); try{localStorage.setItem('evody:profile:selectedDeck', v)}catch{} }} className="rounded-md border bg-transparent px-2 py-1 text-[11px] focus:outline-none" title={getLabel('tooltipDeckRetentionSelect', locale)}>
                <option value="">All Decks</option>
                {DECKS.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </span>
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-[var(--c-text-muted)]">ポイント</div>
              <div className="mt-1 text-3xl font-bold tabular-nums">{points}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-[var(--c-text-muted)]">レベル</div>
              <div className="mt-1 text-3xl font-bold tabular-nums">{level}</div>
            </div>
            <div className="col-span-2 h-px bg-[var(--c-border)]/60" />
            <div className="text-center">
              <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">今日のエピソード</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{todayStats?.episodes ?? 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">正答率</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{todayStats ? Math.round(todayStats.accuracy * 100) : 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">今日のポイント</div>
              {/* What-if Dialog (portal-like overlay) */}
              {showWhatIf && whatIfResult && (
                <WhatIfDialog
                  open={showWhatIf}
                  onClose={()=> setShowWhatIf(false)}
                  horizon={horizon}
                  whatIfResult={whatIfResult}
                  whatIfN={whatIfN}
                  setWhatIfN={setWhatIfN}
                  whatIfDeck={whatIfDeck}
                  setWhatIfDeck={setWhatIfDeck}
                  adaptiveDetail={adaptiveDetail}
                  upcomingLoadExt={upcomingLoadExt}
                  whatIfChained={whatIfChained}
                  setWhatIfChained={setWhatIfChained}
                  chainPreset={chainPreset}
                  setChainPreset={setChainPreset}
                  collapseEarly={collapseEarly}
                  setCollapseEarly={setCollapseEarly}
                  collapseTime={collapseTime}
                  setCollapseTime={setCollapseTime}
                  collapseChain={collapseChain}
                  setCollapseChain={setCollapseChain}
                  applying={applying}
                  onApply={()=>{
                    if (whatIfN<=0) return
                    setApplying(true)
                    try {
                      const ids = Array.from({length: whatIfN}, ()=> crypto.randomUUID())
                      if (whatIfDeck === 'ALL') introduceNewCards(ids)
                      else introduceNewCards(ids, whatIfDeck)
                      setShowWhatIf(false)
                    } catch {/* ignore */}
                    finally {
                      setApplying(false)
                      setTimeout(()=>{ try{ setUpcomingLoad(getUpcomingReviewLoad(7)) }catch{} }, 10)
                    }
                  }}
                />
              )}
              {/* 7d Retention mini bars */}
              {retention7d.length>0 && (
                <div className="mt-2">
                  <div className="mb-1 text-[10px] font-medium text-[var(--c-text-secondary)] flex items-center gap-2">
                    <span>7d Retention</span>
                    <span className="text-[8px] text-[var(--c-text-muted)]">(p=cards)</span>
                  </div>
                  <div className="flex h-9 items-end gap-1">
                    {retention7d.map(d=>{
                      const pct = d.retention==null? null : Math.round(d.retention*100)
                      const height = pct==null? 6 : 6 + Math.round((pct/100)*28)
                      const color = pct==null? 'var(--c-border)' : (pct >= 85 ? 'var(--c-accent)' : pct >= 70 ? 'var(--c-success)' : pct >= 55 ? 'var(--c-warn,#d97706)' : 'var(--c-danger,#dc2626)')
                      return (
                        <div key={d.date} className="flex-1 relative rounded-sm overflow-hidden bg-[var(--c-border)]/30" style={{height:'36px'}} title={`${d.date}: ${pct==null? 'No data' : pct+'%'}`}>
                          {pct==null ? (
                            <div className="absolute inset-0 flex items-center justify-center text-[8px] text-[var(--c-text-muted)] opacity-50">--</div>
                          ):(
                            <div className="absolute bottom-0 left-0 w-full transition-all" style={{height, background: color, opacity: pct==null?0.35:1}} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            {selectedDeck && deckReaction7d.length > 0 && (
              <div className="col-span-2 mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">7d Reaction ({selectedDeck}) p50/p90</span>
                  {(() => {
                    const vals = deckReaction7d.map(r=>r.p50).filter((v): v is number => typeof v === 'number')
                    if (vals.length === 0) return <span className="text-[10px] text-[var(--c-text-muted)]">--</span>
                    const latest = vals[vals.length-1]
                    const first = vals[0]
                    const delta = latest - first
                    const rel = first > 0 ? (delta / first) : 0
                    const arrow = Math.abs(rel) < 0.10 ? '→' : (rel < 0 ? '↓' : '↑')
                    const cls = rel < 0 ? 'text-[var(--c-success)]' : rel > 0 ? 'text-[var(--c-danger,#dc2626)]' : 'text-[var(--c-text-muted)]'
                    return <span className={`text-[10px] font-medium ${cls}`}>{latest}ms {arrow} {Math.round(rel*100)}%</span>
                  })()}
                </div>
                <div className="flex h-12 items-end gap-1">
                  {deckReaction7d.map(d=>{
                    const p50 = d.p50
                    const p90 = d.p90
                    const max = 400
                    const hP50 = p50==null ? 6 : 6 + Math.min(1, p50/max) * 40
                    const hP90 = p90==null ? 0 : Math.min(1, p90/max) * 40
                    return (
                      <div key={d.date} className="flex-1 relative rounded-sm overflow-hidden bg-[var(--c-border)]/30" style={{height:'46px'}} title={`${d.date} : ${p50==null?'No data':p50+'ms'}${p90!=null?' / p90 '+p90+'ms':''}`}>
                        {p50!=null && (
                          <div className="absolute bottom-0 left-0 w-full" style={{height: hP50, background:'linear-gradient(180deg,var(--c-accent) 0%,var(--c-accent) 100%)', opacity:0.85}} />
                        )}
                        {p90!=null && p50!=null && p90>p50 && (
                          <div className="absolute bottom-0 left-0 w-full" style={{height: 6 + hP90, background:'var(--c-danger,#dc2626)', opacity:0.35, mixBlendMode:'multiply'}} />
                        )}
                        {p50==null && (
                          <div className="absolute inset-0 flex items-center justify-center text-[8px] text-[var(--c-text-muted)] opacity-60">--</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {selectedDeck && deckTailIndex7d.length > 0 && (
              <div className="col-span-2 mt-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">7d Tail Index ({selectedDeck})</span>
                  {(() => {
                    const vals = deckTailIndex7d.map(r=>r.ti).filter((v): v is number => typeof v === 'number')
                    if (vals.length === 0) return <span className="text-[10px] text-[var(--c-text-muted)]">--</span>
                    const latest = vals[vals.length-1]
                    const first = vals[0]
                    const delta = latest - first
                    const rel = first>0 ? delta/first : 0
                    const arrow = Math.abs(rel) < 0.05 ? '→' : (rel < 0 ? '↓' : '↑')
                    const cls = rel < 0 ? 'text-[var(--c-success)]' : rel > 0 ? 'text-[var(--c-danger,#dc2626)]' : 'text-[var(--c-text-muted)]'
                    return <span className={`text-[10px] font-medium ${cls}`}>{latest?.toFixed(2)} {arrow} {Math.round(rel*100)}%</span>
                  })()}
                </div>
                <div className="flex h-10 items-end gap-1">
                  {(() => {
                    const numbers = deckTailIndex7d.map(d=>d.ti).filter((v): v is number => typeof v === 'number')
                    const maxVal = Math.min(2.5, Math.max( ...(numbers.length?numbers:[1]) , 1))
                    return deckTailIndex7d.map(d=>{
                      const ti = d.ti
                      const norm = ti==null ? 0 : Math.min(1, ti / maxVal)
                      const height = 6 + norm * 30
                      let color = 'var(--c-border)'
                      if (ti!=null) {
                        if (ti <= 1.3) color = 'var(--c-success)'
                        else if (ti <= 1.6) color = 'var(--c-warn,#d97706)'
                        else color = 'var(--c-danger,#dc2626)'
                      }
                      return (
                        <div key={d.date} className="flex-1 relative rounded-sm overflow-hidden bg-[var(--c-border)]/30" style={{height: '36px'}} title={`${d.date} : ${ti==null?'No data':'TI '+ti.toFixed(2)}`}>
                          {ti==null ? (
                            <div className="absolute inset-0 flex items-center justify-center text-[8px] text-[var(--c-text-muted)] opacity-50">--</div>
                          ) : (
                            <div className="absolute bottom-0 left-0 w-full transition-all" style={{height, background: color, opacity: ti==null?0.35:1}} />
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={reset}
              className="btn-secondary flex-1"
              title={getLabel('tooltipResetPoints')}
            >
              ポイントをリセット
            </button>
            <button
              onClick={resetDaily}
              className="btn-secondary flex-1"
              title={getLabel('tooltipClearToday')}
            >
              連続記録をリセット
            </button>
            {hasMounted && newAvail.remainingToday > 0 && (
              <div className="flex-1 text-center text-[10px] text-[var(--c-text-secondary)]">空のとき /review で自動導入 ({newAvail.remainingToday} 枠)</div>
            )}
          </div>
        </div>
      </div>
      {/* end grid cards */}
      </div>

      <a
        href="/tasks"
        className="action-button inline-block rounded-xl px-5 py-3 font-medium shadow-md transition-all hover:shadow-lg active:shadow-sm"
      >
        タスクを追加する
      </a>

      {reviewStats.due > 0 && (
        <a
          href="/review"
          className="ml-4 inline-block rounded-xl border px-5 py-3 text-sm font-medium shadow-sm hover:bg-[var(--c-surface-alt)] transition-colors"
        >
          レビューを開始 ({reviewStats.due})
        </a>
      )}

      <div className="mt-10">
        <ActivityHeatmap days={30} />
      </div>

      {upcomingLoad && (
        <div className="mt-10 rounded-xl border p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">{getLabel('upcomingLoadTitle', locale)} ({horizon}日)
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${classifyLoadTone(upcomingLoad.classification)}`}
                title={`分類 = ${upcomingLoad.classification}`}
              >{upcomingLoad.classification==='high'?'高': upcomingLoad.classification==='medium'?'中':'低'}</span>
              {horizon===14 && upcomingLoadExt?.secondWeekWarning && (
                <span title={getLabel('secondWeekWarningIconTitle', locale)} className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--c-warn,#d97706)]/20 text-[var(--c-warn,#d97706)] text-[10px] font-bold">!</span>
              )}
            </h2>
            <div className="text-[10px] text-[var(--c-text-secondary)] flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={()=>{ setHorizon(7); try{localStorage.setItem('evody:profile:loadHorizon','7')}catch{} }}
                  className={`px-2 py-0.5 rounded text-[10px] border ${horizon===7?'bg-[var(--c-surface-alt)] font-semibold':''}`}>7日</button>
                <button
                  onClick={()=>{ setHorizon(14); try{localStorage.setItem('evody:profile:loadHorizon','14')}catch{} }}
                  className={`px-2 py-0.5 rounded text-[10px] border ${horizon===14?'bg-[var(--c-surface-alt)] font-semibold':''}`}>14日</button>
              </div>
              {horizon===14 && upcomingLoadExt?.decks && upcomingLoadExt.decks.length>0 && (
                <button
                  onClick={()=>{ const v=!deckStack14; setDeckStack14(v); try{localStorage.setItem('evody:profile:deckStack14', v?'1':'0')}catch{} }}
                  className={`px-2 py-0.5 rounded text-[10px] border ${deckStack14?'bg-[var(--c-surface-alt)] font-semibold':''}`}
                  title={getLabel('tooltipDeckBreakdownToggle')}
                >内訳</button>
              )}
              <span>最大/日 (Peak) {upcomingLoad.peak?.count ?? 0}</span>
              <span>中央値/日 {upcomingLoad.median}</span>
              <span>今日 {upcomingLoad.today.projected}</span>
              <button
                onClick={()=>{ setShowWhatIf(true); setWhatIfN(0); try{ setWhatIfResult(()=>{
                  if (whatIfChained) {
                    if (whatIfDeck !== 'ALL') return simulateNewCardsImpactChainedWithDeck(0, whatIfDeck, horizon)
                    return simulateNewCardsImpactChained(0, horizon)
                  } else {
                    return whatIfDeck!=='ALL'? simulateNewCardsImpactWithDeck(0, whatIfDeck, horizon): simulateNewCardsImpact(0, horizon)
                  }
                }) }catch{} }}
                className="ml-2 rounded-md border px-2 py-1 text-[10px] font-medium hover:bg-[var(--c-surface-alt)]"
                title={`追加新カード導入時の${horizon}日レビュー負荷影響を試算`}
              >{getLabel('simulatorShort')}</button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap gap-3 text-[8px] text-[var(--c-text-muted)]">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[var(--c-danger,#dc2626)]/70" />高: 負荷が高め (再挑戦増や追加抑制検討)</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[var(--c-warn,#d97706)]/70" />中: 一部日で集中 (調整余地)</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[var(--c-success)]/70" />低: 余裕あり</span>
              <span className="flex items-center gap-1" title={getLabel('tooltipBacklog', locale)}><span className="inline-block h-2 w-2 rounded-sm bg-[var(--c-danger,#dc2626)]" />{getLabel('backlogLegend', locale)}</span>
          </div>
          {(() => {
            const showStack = horizon===14 && deckStack14 && upcomingLoadExt?.decks && upcomingLoadExt.decks.length>0
            if (!showStack) {
              return (
                <div className="flex h-16 items-end gap-1">
                  {upcomingLoad.days.map((d,i)=>{
                    const peak = upcomingLoad.peak?.count || 1
                    const total = d.count + (i===0 && d.backlog? d.backlog:0)
                    const norm = total>0 ? total / peak : 0
                    const height = 4 + norm * 56 // 4..60
                    const isToday = i===0
                    const backlog = d.backlog || 0
                    const remaining = d.count
                    const title = `${d.date}\nRemaining: ${remaining}${backlog?` / Backlog: ${backlog}`:''}\nTotal: ${total}`
                    return (
                      <div key={d.date} className="flex-1 relative rounded-sm bg-[var(--c-border)]/30 overflow-hidden" style={{height:'60px'}} title={title}>
                        {total===0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-[8px] text-[var(--c-text-muted)] opacity-50">--</div>
                        )}
                        {backlog>0 && (
                          <div className="absolute bottom-0 left-0 w-full" style={{height: Math.max(2, height * (backlog/ total)), background:'var(--c-danger,#dc2626)', opacity:0.55}} />
                        )}
                        {remaining>0 && (
                          <div className="absolute bottom-0 left-0 w-full" style={{
                            height: backlog>0? Math.max(2, height * (remaining/ total)): height,
                            background:'linear-gradient(180deg,var(--c-accent) 0%,var(--c-accent) 100%)',
                            opacity:0.9
                          }} />
                        )}
                        {isToday && total>0 && (
                          <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--c-accent)]/70" />
                        )}
                        <div className="absolute inset-0 flex items-end justify-center pb-0.5 pointer-events-none">
                          <span className="text-[8px] font-medium text-[var(--c-text-inverse,#fff)] mix-blend-difference" style={{opacity: total>0?0.85:0}}>{total}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
            // Stacked variant
            const decks = upcomingLoadExt!.decks!
            const dayTotals = upcomingLoad.days.map((d,i)=> d.count + (i===0 && d.backlog? d.backlog:0))
            const peakBase = upcomingLoad.peak?.count || 1
            const peakWithBacklog = Math.max(peakBase, ...dayTotals)
            return (
              <div className="flex h-16 items-end gap-1" title={getLabel('tooltipDeckStacked14d')}>
                {upcomingLoad.days.map((d,i)=>{
                  const total = dayTotals[i]
                  const isToday = i===0
                  const backlog = d.backlog || 0
                  const height = 4 + (total>0 ? (total/peakWithBacklog)*56 : 0)
                  const titleLines: string[] = [`${d.date}`, `Total ${total}`]
                  if (backlog>0) titleLines.push(`Backlog ${backlog}`)
                  const segs: { deckId: string; val: number; color: string }[] = []
                  decks.forEach((deck,di)=>{
                    const val = deck.counts[i] || 0
                    if (val>0) {
                      const color = `hsl(${(di*47)%360} 70% 55%)`
                      segs.push({ deckId: deck.deckId, val, color })
                      titleLines.push(`${deck.deckId}: ${val}`)
                    }
                  })
                  const scheduleTotal = total - backlog
                  let accumHeight = backlog>0 ? Math.max(2, height * (backlog/ total)) : 0
                  return (
                    <div key={d.date} className="flex-1 relative rounded-sm bg-[var(--c-border)]/30 overflow-hidden" style={{height:'60px'}} title={titleLines.join('\n')}>
                      {total===0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-[8px] text-[var(--c-text-muted)] opacity-50">--</div>
                      )}
                      {backlog>0 && (
                        <div className="absolute bottom-0 left-0 w-full" style={{height: accumHeight, background:'var(--c-danger,#dc2626)', opacity:0.55}} />
                      )}
                      {segs.map((s,si)=>{
                        const segHeight = scheduleTotal>0 ? Math.max(2, height * (s.val / total)) : 0
                        const hFrom = accumHeight
                        accumHeight += segHeight
                        return (
                          <div key={s.deckId+si} className="absolute left-0 w-full" style={{bottom: hFrom, height: segHeight, background: s.color, opacity:0.9}} />
                        )
                      })}
                      {isToday && total>0 && (
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--c-accent)]/70" />
                      )}
                      <div className="absolute inset-0 flex items-end justify-center pb-0.5 pointer-events-none">
                        <span className="text-[8px] font-medium text-[var(--c-text-inverse,#fff)] mix-blend-difference" style={{opacity: total>0?0.85:0}}>{total}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
          {horizon===14 && deckStack14 && upcomingLoadExt?.decks && upcomingLoadExt.decks.length>0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {upcomingLoadExt.decks.slice(0,12).map((d,i)=>{
                const color = `hsl(${(i*47)%360} 70% 55%)`
                const name = DECKS.find(dd=>dd.id===d.deckId)?.name || d.deckId
                return <span key={d.deckId} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{background:color}} />{name}</span>
              })}
              {upcomingLoad.today.backlog>0 && <span className="inline-flex items-center gap-1" title={getLabel('tooltipBacklog', locale)}><span className="h-2 w-2 rounded-sm bg-[var(--c-danger,#dc2626)]" />{getLabel('backlogLegend', locale)}</span>}
              <button
                onClick={()=>{ const v=!deckStack14; setDeckStack14(v); try{localStorage.setItem('evody:profile:deckStack14', v?'1':'0')}catch{} }}
                className={`ml-auto px-2 py-0.5 rounded text-[10px] border ${deckStack14?'bg-[var(--c-surface-alt)] font-semibold':''}`}
              >{getLabel('rawToggleLabel', locale)}</button>
            </div>
          )}
          {upcomingLoad.today.backlog>10 && (
            <div className="mt-2 text-[11px] text-[var(--c-danger,#dc2626)] font-medium">{getLabel('backlogWarning', locale)} ({upcomingLoad.today.backlog}). 先に既存レビュー消化を推奨。</div>
          )}
          {horizon===14 && upcomingLoadExt && (
            <div className="mt-3 grid gap-2 text-[10px] sm:grid-cols-3">
              <div className="rounded border p-2 flex flex-col gap-0.5" title={getLabel('tooltipWeek1Card', locale)}><span className="text-[var(--c-text-secondary)] font-semibold">1週目</span><span>最大/日 {upcomingLoadExt.week1.peak}</span><span>合計 {upcomingLoadExt.week1.total}</span></div>
              {upcomingLoadExt.week2 && (
                <div className="rounded border p-2 flex flex-col gap-0.5" title={getLabel('tooltipWeek2Card', locale)}><span className="text-[var(--c-text-secondary)] font-semibold">2週目</span><span>最大/日 {upcomingLoadExt.week2.peak}</span><span>合計 {upcomingLoadExt.week2.total}</span></div>
              )}
                        {(() => {
                          const ratio = upcomingLoadExt.loadBalanceRatio
                          let ratioCls = ''
                          if (typeof ratio === 'number') {
                            if (ratio <= 1.15) ratioCls = 'text-[var(--c-success)]'
                            else if (ratio <= 1.4) ratioCls = 'text-[var(--c-warn,#d97706)]'
                            else ratioCls = 'text-[var(--c-danger,#dc2626)]'
                          }
                          const shift = upcomingLoadExt.peakShift
                          let shiftCls = ''
                          if (typeof shift === 'number') {
                            if (shift <= 0) shiftCls = 'text-[var(--c-success)]'
                            else if (shift <= 3) shiftCls = 'text-[var(--c-warn,#d97706)]'
                            else shiftCls = 'text-[var(--c-danger,#dc2626)]'
                          }
                          return (
                            <div className="rounded border p-2 flex flex-col gap-0.5" title={getLabel('tooltipBalanceMetric', locale)}>
                              <span className="text-[var(--c-text-secondary)] font-semibold">{getLabel('balanceCardTitle', locale)}</span>
                              <span className={`flex items-center gap-1 ${shiftCls}`}>{getLabel('shiftLabel', locale)} {shift!=null? shift: '--'}</span>
                              <span className={ratioCls}>{getLabel('balanceLabelShort', locale)} {ratio!=null? ratio: '--'}</span>
                            </div>
                          )
                        })()}
                        {(() => {
                          const fi = upcomingLoadExt.flattenIndex
                          let fiCls = ''
                          if (typeof fi === 'number') {
                            if (fi >= 0.92) fiCls = 'text-[var(--c-success)]'
                            else if (fi >= 0.75) fiCls = 'text-[var(--c-warn,#d97706)]'
                            else fiCls = 'text-[var(--c-danger,#dc2626)]'
                          }
                          return (
                            <div className="rounded border p-2 flex flex-col gap-0.5" title={getLabel('infoShapeMetric', locale)}>
                              <span className="text-[var(--c-text-secondary)] font-semibold flex items-center gap-1">Shape <InfoHint labelKey="infoShapeMetric" portal tail iconSize={10} /></span>
                              <span className={fiCls}>{getLabel('flattenLabelShort', locale)} {fi!=null? fi: '--'}</span>
                              <span>Top3Avg {upcomingLoadExt.top3Avg!=null? Math.round(upcomingLoadExt.top3Avg): '--'}</span>
                            </div>
                          )
                        })()}
              {upcomingLoadExt.secondWeekWarning && (
                <div className="rounded border p-2 flex flex-col gap-1 sm:col-span-2 bg-[var(--c-warn,#d97706)]/10 border-[var(--c-warn,#d97706)]/50" title={getLabel('infoSecondWeekWarning', locale)}>
                  <span className="font-semibold text-[var(--c-warn,#d97706)] flex items-center gap-1">{getLabel('secondWeekWarningTitle', locale)} <InfoHint labelKey="infoSecondWeekWarning" portal tail iconSize={10} /></span>
                  <span className="leading-snug">{getLabel('secondWeekWarningBody', locale)}</span>
                </div>
              )}
            </div>
          )}
          {horizon===14 && upcomingLoadExt?.decks && upcomingLoadExt.decks.length>0 && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-wide text-[var(--c-text-secondary)]">{getLabel('deckWeekMetricsTitle', locale)}</span>
                <span className="text-[9px] text-[var(--c-text-muted)]" title={getLabel('tooltipDeckSortOrder', locale)}>sorted</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border border-[var(--c-border)]/60 rounded-sm min-w-[420px]">
                  <thead className="bg-[var(--c-surface-alt)]/40">
                    <tr className="text-[9px] text-left">
                      <th className="px-2 py-1 font-medium">Deck</th>
                      <th className="px-2 py-1 font-medium">
                        <div className="inline-flex items-center gap-1">
                          {getLabel('deckTableW1PT', locale)}
                          <InfoHint labelKey={'infoDeckW1PT'} placement="bottom" />
                        </div>
                      </th>
                      <th className="px-2 py-1 font-medium">
                        <div className="inline-flex items-center gap-1">
                          {getLabel('deckTableW2PT', locale)}
                          <InfoHint labelKey={'infoDeckW2PT'} placement="bottom" />
                        </div>
                      </th>
                      <th className="px-2 py-1 font-medium">
                        <div className="inline-flex items-center gap-1">
                          {getLabel('deckTableShift', locale)}
                          <InfoHint labelKey={'infoDeckShift'} placement="bottom" />
                        </div>
                      </th>
                      <th className="px-2 py-1 font-medium">
                        <div className="inline-flex items-center gap-1">
                          {getLabel('deckTableBalance', locale)}
                          <InfoHint labelKey={'infoDeckBalance'} placement="bottom" />
                        </div>
                      </th>
                      <th className="px-2 py-1 font-medium">
                        <div className="inline-flex items-center gap-1">
                          {getLabel('deckTableFlat', locale)}
                          <InfoHint labelKey={'infoDeckFlat'} placement="bottom" />
                        </div>
                      </th>
                      <th className="px-2 py-1 font-medium">
                        <div className="inline-flex items-center gap-1">
                          {getLabel('deckTableBacklog', locale)}
                          <InfoHint labelKey={'infoDeckBacklog'} placement="bottom" />
                        </div>
                      </th>
                      <th className="px-2 py-1 font-medium">
                        <div className="inline-flex items-center gap-1">
                          {getLabel('deckTableBacklogPct', locale)}
                          <InfoHint labelKey={'infoDeckBacklogPct'} placement="bottom" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const decks = [...upcomingLoadExt.decks]
                        .filter(d=> (d.w1 && d.w1.peak>0) || d.backlog>0)
                        .sort((a,b)=> {
                          const w2a = a.w2?.peak ?? 0, w2b = b.w2?.peak ?? 0
                          if (w2b !== w2a) return w2b - w2a
                          const w1a = a.w1?.peak ?? 0, w1b = b.w1?.peak ?? 0
                          if (w1b !== w1a) return w1b - w1a
                          return (b.backlog - a.backlog)
                        })
                        .slice(0, 12)
                      if (decks.length===0) return (
                        <tr><td colSpan={8} className="px-2 py-2 text-[9px] text-[var(--c-text-muted)]">No deck data</td></tr>
                      )
                      return decks.map(d=>{
                        const w1 = d.w1
                        const w2 = d.w2
                        const shift = (w1 && w2) ? (w2.peak - w1.peak) : null
                        const balance = (w1 && w2 && w1.total>0) ? parseFloat((w2.total / w1.total).toFixed(2)) : null
                        const deckName = DECKS.find(dd=>dd.id===d.deckId)?.name || d.deckId
                        const shiftCls = shift==null? '' : shift <=0 ? 'text-[var(--c-success)]' : shift <=3 ? 'text-[var(--c-warn,#d97706)]' : 'text-[var(--c-danger,#dc2626)]'
                        const balCls = balance==null? '' : balance <=1.15 ? 'text-[var(--c-success)]' : balance <=1.4 ? 'text-[var(--c-warn,#d97706)]' : 'text-[var(--c-danger,#dc2626)]'
                        const flat = d.flatten
                        let flatCls = ''
                        if (typeof flat === 'number') {
                          if (flat >= 0.92) flatCls = 'text-[var(--c-success)]'
                          else if (flat >= 0.75) flatCls = 'text-[var(--c-warn,#d97706)]'
                          else flatCls = 'text-[var(--c-danger,#dc2626)]'
                        }
                        const bkr = (d as { backlogRatio?: number }).backlogRatio
                        let bkrCls = ''
                        if (typeof bkr === 'number') {
                          if (bkr >= 0.4) bkrCls = 'text-[var(--c-danger,#dc2626)]'
                          else if (bkr >= 0.25) bkrCls = 'text-[var(--c-warn,#d97706)]'
                          else bkrCls = 'text-[var(--c-success)]'
                        }
                        return (
                          <tr key={d.deckId} className="border-t border-[var(--c-border)]/50 text-[9px] hover:bg-[var(--c-surface-alt)]/40">
                            <td className="px-2 py-1 whitespace-nowrap max-w-[120px] truncate" title={deckName}>{deckName}</td>
                            <td className="px-2 py-1 tabular-nums">{w1 ? `${w1.peak}/${w1.total}` : '--'}</td>
                            <td className="px-2 py-1 tabular-nums">{w2 ? `${w2.peak}/${w2.total}` : '--'}</td>
                            <td className={`px-2 py-1 tabular-nums ${shiftCls}`}>{shift!=null? shift: '--'}</td>
                            <td className={`px-2 py-1 tabular-nums ${balCls}`}>{balance!=null? balance: '--'}</td>
                            <td className={`px-2 py-1 tabular-nums ${flatCls}`}>{flat!=null? flat: '--'}</td>
                            <td className="px-2 py-1 tabular-nums" title={getLabel('deckTableBacklog', locale)}>{d.backlog>0? d.backlog: ''}</td>
                            <td className={`px-2 py-1 tabular-nums ${bkrCls}`}>{typeof bkr==='number'? (bkr*100).toFixed(0)+'%': '--'}</td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
                <div className="mt-1 text-[8px] text-[var(--c-text-muted)]">{getLabel('deckMetricsFooter', locale)}</div>
              </div>
            </div>
          )}
          <div className="mt-2 text-[10px] text-[var(--c-text-secondary)] leading-relaxed">
            {getLabel('upcomingLoadFooter', locale)}{horizon===14 && ' 14d では Week1/Week2 のピーク/合計と平準化指標(Flatten, Balance)・2週目集中警告を表示。What-if は 7d 前提。'}
          </div>
        </div>
      )}

      {/* (Old inline What-if modal removed; now using <WhatIfDialog /> above) */}

      <div>
        <button onClick={()=>setShowReviewModal(true)} className="mt-6 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm hover:bg-[var(--c-surface-alt)]">
          最近のレビューセッション一覧
        </button>
      </div>

      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={()=>setShowReviewModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl border bg-[var(--c-surface)] p-6 shadow-xl" onClick={e=>e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Review Episodes</h2>
              <button onClick={()=>setShowReviewModal(false)} className="rounded-md px-3 py-1 text-xs font-medium border hover:bg-[var(--c-surface-alt)]">閉じる</button>
            </div>
            <div className="max-h-[60vh] overflow-auto space-y-3 text-sm">
              {recentReviewEpisodes.length === 0 && (
                <div className="text-[var(--c-text-muted)]">レビューセッションがまだありません。</div>
              )}
              {recentReviewEpisodes.map(ep => {
                const total = ep.correct + ep.incorrect
                const acc = total ? Math.round((ep.correct/total)*100) : 0
                const ret = typeof ep.retention === 'number' ? Math.round(ep.retention*100) : null
                const againRate = typeof ep.againRate === 'number' ? Math.round(ep.againRate*100) : null
                const g = ep.grades || { again:0, hard:0, good:0, easy:0 }
                const started = new Date(ep.startedAt).toLocaleTimeString()
                const finished = new Date(ep.finishedAt).toLocaleTimeString()
                const avgT = typeof ep.avgTimeMs === 'number' ? ep.avgTimeMs : null
                const p50 = typeof ep.p50TimeMs === 'number' ? ep.p50TimeMs : null
                const p90 = typeof ep.p90TimeMs === 'number' ? ep.p90TimeMs : null
                return (
                  <div key={ep.id} className="rounded-lg border p-3 hover:bg-[var(--c-surface-alt)] transition-colors">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xs font-mono text-[var(--c-text-secondary)]">{started} - {finished}</div>
                      <div className="ml-auto flex gap-2 text-[10px]">
                        <span className="rounded bg-[var(--c-surface-alt)] px-2 py-1">Cards {total}</span>
                        <span className="rounded bg-[var(--c-surface-alt)] px-2 py-1">Acc {acc}%</span>
                        {ret !== null && <span className="rounded bg-[var(--c-surface-alt)] px-2 py-1">Ret {ret}%</span>}
                        {againRate !== null && <span className="rounded bg-[var(--c-surface-alt)] px-2 py-1">Again {againRate}%</span>}
                        {avgT !== null && <span className="rounded bg-[var(--c-surface-alt)] px-2 py-1">Avg {avgT}ms</span>}
                        {p50 !== null && <span className="rounded bg-[var(--c-surface-alt)] px-2 py-1">p50 {p50}ms</span>}
                        {p90 !== null && <span className="rounded bg-[var(--c-surface-alt)] px-2 py-1">p90 {p90}ms</span>}
                        <span className="rounded bg-[var(--c-surface-alt)] px-2 py-1">Pt {ep.points}</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-medium">
                      {(['again','hard','good','easy'] as const).map(label => {
                        const value = g[label]
                        const pct = total ? Math.round((value/ total)*100) : 0
                        let color: string
                        switch(label){
                          case 'again': color='var(--c-danger, #dc2626)'; break
                          case 'hard': color='var(--c-warn, #d97706)'; break
                          case 'good': color='var(--c-success, #059669)'; break
                          default: color='var(--c-accent, #6366f1)';
                        }
                        return (
                          <div key={label} className="rounded-md border px-2 py-1 flex flex-col items-center">
                            <span className="uppercase tracking-wide text-[10px]" style={{color}}>{label}</span>
                            <span className="mt-0.5 tabular-nums text-[12px]">{value}</span>
                            <div className="mt-1 h-1 w-full overflow-hidden rounded bg-[var(--c-border)]/50">
                              <div className="h-full" style={{width: pct+'%', background: color}} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// --- Extracted helper component: WhatIf summary badge list ---
