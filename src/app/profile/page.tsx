'use client'

import React, { useState, useEffect } from 'react'
import { KpiBadge, decideDeltaTone } from '@/components/kpi-badge'
import { CollapsibleSection } from '@/components/collapsible-section'
import { usePoints } from '../points-context'
import Avatar from '@/components/avatar'
import { getStatsForToday, TodayStats, getStreak, StreakInfo, listEpisodes, Episode, getDailyReviewRetention, DailyRetention, RetentionWeightMode, getDailyReactionTimes, getDailyDeckReactionTimes } from '@/lib/episodes'
import { DECKS } from '@/lib/decks'
import { getReviewStats, ReviewStats, getReviewPerformance, ReviewPerformance, getNewCardAvailability, getAdaptiveNewLimit, getUpcomingReviewLoad, UpcomingLoadSummary, simulateNewCardsImpact, WhatIfResult, introduceNewCards, getUpcomingReviewLoadExtended, simulateNewCardsImpactWithDeck, simulateNewCardsImpactChained, simulateNewCardsImpactChainedWithDeck, CHAIN_PRESETS, ChainPresetKey } from '@/lib/reviews'
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
  const [streak, setStreak] = React.useState<StreakInfo>({ current: 0, longest: 0, lastActive: null })
  const [reviewStats, setReviewStats] = React.useState<ReviewStats>({ today: 0, due: 0, newCards: 0 })
  const [reviewPerf, setReviewPerf] = React.useState<ReviewPerformance | null>(null)
  const [newAvail, setNewAvail] = React.useState(()=> getNewCardAvailability())
  const [adaptiveDetail, setAdaptiveDetail] = React.useState<ReturnType<typeof getAdaptiveNewLimit> | null>(null)
  const [adaptiveOverride, setAdaptiveOverride] = React.useState<string | null>(null) // 'fixed' | null

  // Load override state once
  React.useEffect(()=>{
    try { setAdaptiveOverride(localStorage.getItem('evody:adaptiveNew:override')) } catch {}
  }, [])
  const [recentRetention, setRecentRetention] = React.useState<number[]>([]) // 直近 review retention (最大5件)
  const [showReviewModal, setShowReviewModal] = React.useState(false)
  const [recentReviewEpisodes, setRecentReviewEpisodes] = React.useState<Episode[]>([])
  const [retention7d, setRetention7d] = React.useState<DailyRetention[]>([])
  const [selectedDeck, setSelectedDeck] = React.useState<string>('') // '' = 全体
  const [deckRetention7d, setDeckRetention7d] = React.useState<DailyRetention[]>([])
  const [retentionMode, setRetentionMode] = React.useState<RetentionWeightMode>('effective')
  const [focusAlert, setFocusAlert] = React.useState<string | null>(null)
  const [reaction7d, setReaction7d] = React.useState<{ date: string; p50: number | null; p90: number | null }[]>([])
  const [deckReaction7d, setDeckReaction7d] = React.useState<{ date: string; p50: number | null; p90: number | null }[]>([])
  const [deckTailIndex7d, setDeckTailIndex7d] = React.useState<{ date: string; ti: number | null }[]>([])
  const [tailIndex7d, setTailIndex7d] = React.useState<{ date: string; ti: number | null }[]>([])
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
      setStreak(getStreak())
      setReviewStats(getReviewStats())
      setReviewPerf(getReviewPerformance())
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
        const rr = listEpisodes()
          .filter(e => e.kind === 'review' && typeof e.retention === 'number')
          .slice(0, 5) // listEpisodes は finishedAt 降順
          .map(e => e.retention as number)
          .reverse()   // 古い -> 新しい 順に並べて視覚的に左→右時間経過
        setRecentRetention(rr)
        const eps = listEpisodes().filter(e => e.kind === 'review').slice(0, 20)
        setRecentReviewEpisodes(eps)
  setRetention7d(getDailyReviewRetention(7, undefined, undefined, retentionMode))
  const react7 = getDailyReactionTimes(7)
  setReaction7d(react7)
  // Tail Index (p90/p50) 日次。p50<=0 や null は無効。p90 null の場合 ti も null。
  let tiLocal: { date:string; ti: number | null }[] = []
  try {
    tiLocal = react7.map(r=>{
      if (r.p50==null || r.p50<=0 || r.p90==null) return { date: r.date, ti: null }
      return { date: r.date, ti: parseFloat((r.p90 / r.p50).toFixed(2)) }
    })
    setTailIndex7d(tiLocal)
  } catch { /* ignore */ }
        // Baseline Adaptive Focus / Variability Alert 判定
        try {
          const reactAll = getDailyReactionTimes(7) // 過去7日 (今日含む)
          const retentionAll = getDailyReviewRetention(7)
          const todayKey = reactAll.length ? reactAll[reactAll.length-1].date : null
          if (todayKey) {
            const suppressedKey = 'evody:focusAlert:' + todayKey
            if (!localStorage.getItem(suppressedKey)) {
              // Baseline: 過去6日 (当日除く) の有効値平均 (>=3日で確定)
              const pastReact = reactAll.slice(0, -1)
              const pastRet = retentionAll.slice(0, -1)
              const todayReact = reactAll[reactAll.length-1]
              const todayRet = retentionAll[retentionAll.length-1]
              const p50PastVals = pastReact.map(r=>r.p50).filter((v): v is number => typeof v==='number' && v>0)
              const tiPastVals = tiLocal.slice(0, -1).map(t=>t.ti).filter((v): v is number => typeof v==='number' && v>0)
              const retPastVals = pastRet.map(r=>r.retention).filter((v): v is number => typeof v==='number' && v>0)
              const mean = (arr:number[]) => arr.reduce((a,b)=>a+b,0)/arr.length
              const baselineP50: number | null = p50PastVals.length>=3? mean(p50PastVals) : null
              const baselineRet: number | null = retPastVals.length>=3? mean(retPastVals) : null
              const baselineTI: number | null = tiPastVals.length>=3? mean(tiPastVals) : null
              const p50Now = todayReact?.p50 ?? null
              const retNow = todayRet?.retention ?? null
              const tiNow = tiLocal.length? tiLocal[tiLocal.length-1].ti : null
              const messages: string[] = []
              if (baselineP50!=null && baselineRet!=null && p50Now!=null && retNow!=null) {
                const condSpeed = p50Now >= baselineP50 * 1.25 // 25% 悪化
                const condRetention = retNow <= baselineRet - 0.04 // 4pt 低下
                if (condSpeed && condRetention) {
                  messages.push(`集中度低下: p50 ${Math.round(p50Now)}ms (基準${Math.round(baselineP50)}ms) / Retention ${(retNow*100).toFixed(0)}% (基準 ${(baselineRet*100).toFixed(0)}%)`)
                }
              }
              if (baselineTI!=null && tiNow!=null) {
                const condTI = tiNow >= Math.max(1.6, baselineTI * 1.05)
                if (condTI) {
                  messages.push(`ばらつき増大: TI ${tiNow.toFixed(2)} (基準 ${(baselineTI).toFixed(2)})`) 
                }
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
  React.useEffect(()=> {
    if (selectedDeck) {
      setDeckRetention7d(getDailyReviewRetention(7, undefined, selectedDeck, retentionMode))
    } else {
      setDeckRetention7d([])
    }
  }, [selectedDeck, retentionMode])

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

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      {focusAlert && (
        <div className="relative overflow-hidden rounded-xl border border-[var(--c-warn,#d97706)]/50 bg-[var(--c-warn,#d97706)]/10 px-4 py-3 text-[13px] leading-relaxed group" data-focus-alert="1">
          <strong className="mr-2 text-[var(--c-warn,#d97706)]">Focus Alert:</strong>
          <span>{focusAlert} <span className="underline cursor-help text-[11px] opacity-80 group-hover:opacity-100" title="Baseline比較: p50>=+25% & Ret<=-4pt または TI>=1.6/ +5% over baseline">(詳細)</span></span>
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
              <select value={retentionMode} onChange={e=>{ const v=e.target.value as RetentionWeightMode; setRetentionMode(v); try{localStorage.setItem('evody:profile:retWeight', v)}catch{} }} className="rounded-md border bg-transparent px-2 py-1 text-[11px] focus:outline-none" title="Retention Weight Mode">
                <option value="effective">Eff</option>
                <option value="cards">Cards</option>
                <option value="goodEasy">G+E</option>
              </select>
              <select value={selectedDeck} onChange={e=>{ const v=e.target.value; setSelectedDeck(v); try{localStorage.setItem('evody:profile:selectedDeck', v)}catch{} }} className="rounded-md border bg-transparent px-2 py-1 text-[11px] focus:outline-none" title="Deck別 Retention トレンド (保存されます)">
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
              <div className="mt-1 text-2xl font-semibold tabular-nums">{todayStats?.points ?? 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">学習カード数</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{todayStats?.cards ?? 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">連続日数</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{streak.current}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">最長連続</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{streak.longest}</div>
            </div>
            <div className="col-span-2 h-px bg-[var(--c-border)]/60" />
            <div className="text-center">
              <div className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">今日レビュー</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{reviewStats.today}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">待ち( due )</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{reviewStats.due}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">新カード</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{reviewStats.newCards}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">Retention</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{reviewPerf ? Math.round(reviewPerf.retention*100) : 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">Again率</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{reviewPerf ? Math.round(reviewPerf.againRate*100) : 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)] flex items-center justify-center gap-1">新カード枠
                {adaptiveDetail && (
                  <span
                    className="inline-block cursor-help text-[9px] px-1 py-0.5 rounded bg-[var(--c-surface-alt)] text-[var(--c-text-secondary)]"
                    title={(() => {
                      const d = adaptiveDetail
                      const reasons = d.adjustments.length ? d.adjustments.map(a => `${a.delta>0?'+':''}${a.delta} ${a.reason}`).join(', ') : 'No adjustments'
                      return `Base ${d.base} -> Computed ${d.computed} => Final ${d.final}${d.overridden?' (override)':''}\n` + reasons
                    })()}
                  >i</span>
                )}
              </div>
              <div
                className="mt-1 text-xl font-semibold tabular-nums"
                suppressHydrationWarning
                title={adaptiveDetail ? (()=>{
                  const d = adaptiveDetail
                  const reasons = d.adjustments.length ? d.adjustments.map(a => `${a.delta>0?'+':''}${a.delta} ${a.reason}`).join(', ') : 'No adjustments'
                  return `Base ${d.base} -> Computed ${d.computed} => Final ${d.final}${d.overridden?' (override)':''}\n${reasons}`
                })() : ''}
              >{newAvail.remainingToday}/{newAvail.dailyLimit}</div>
              <div className="mt-2 flex items-center justify-center gap-1">
                <input
                  id="adaptiveOverride"
                  type="checkbox"
                  className="h-3 w-3 accent-blue-600"
                  checked={adaptiveOverride === 'fixed'}
                  onChange={e=>{
                    const val = e.target.checked ? 'fixed' : null
                    try {
                      if (val) localStorage.setItem('evody:adaptiveNew:override', val)
                      else localStorage.removeItem('evody:adaptiveNew:override')
                    } catch {}
                    setAdaptiveOverride(val)
                    // refresh details after change
                    setAdaptiveDetail(getAdaptiveNewLimit())
                    setNewAvail(getNewCardAvailability())
                  }}
                />
                <label htmlFor="adaptiveOverride" className="text-[9px] cursor-pointer text-[var(--c-text-secondary)]" title="ONにすると動的調整を一時停止しベース枠固定 (翌日も継続)。">固定</label>
              </div>
            </div>
            {recentRetention.length > 0 && (
              <div className="col-span-2 mt-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">Recent Retention</span>
                  <span className="text-[10px] text-[var(--c-text-muted)]">{Math.round(recentRetention[recentRetention.length-1]*100)}%</span>
                </div>
                <div className="flex h-8 items-end gap-1">
                  {recentRetention.map((r,i)=>{
                    const pct = r*100
                    const height = 8 + Math.round((pct/100)*24) // 8..32px
                    const color = pct >= 85 ? 'var(--c-accent)' : pct >= 70 ? 'var(--c-success)' : pct >= 50 ? 'var(--c-warn)' : 'var(--c-danger, #dc2626)'
                    return (
                      <div key={i} className="flex-1 relative rounded-sm overflow-hidden bg-[var(--c-border)]/40" style={{height: '32px'}}>
                        <div className="absolute bottom-0 left-0 w-full transition-all" style={{height, background: color}} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[9px] font-medium text-[var(--c-text-inverse,#fff)]" style={{mixBlendMode:'plus-lighter'}}>{Math.round(pct)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {reaction7d.length > 0 && (
              <div className="col-span-2 mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">7d Reaction Time (p50 / p90)</span>
                  {(() => {
                    const vals = reaction7d.map(r=>r.p50).filter((v): v is number => typeof v === 'number')
                    if (vals.length === 0) return <span className="text-[10px] text-[var(--c-text-muted)]">--</span>
                    const latest = vals[vals.length-1]
                    const first = vals[0]
                    const delta = latest - first
                    const rel = first > 0 ? (delta / first) : 0
                    const arrow = Math.abs(rel) < 0.10 ? '→' : (rel < 0 ? '↓' : '↑') // 反応時間は減る=改善
                    const cls = rel < 0 ? 'text-[var(--c-success)]' : rel > 0 ? 'text-[var(--c-danger,#dc2626)]' : 'text-[var(--c-text-muted)]'
                    return <span className={`text-[10px] font-medium ${cls}`}>{latest}ms {arrow} {Math.round(rel*100)}%</span>
                  })()}
                </div>
                <div className="flex h-12 items-end gap-1">
                  {reaction7d.map(d=>{
                    const p50 = d.p50
                    const p90 = d.p90
                    // スケーリング: 最大 400ms を想定 (必要なら動的計算検討)
                    const max = 400
                    const hP50 = p50==null ? 6 : 6 + Math.min(1, p50/max) * 40 // 6..46
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
            {tailIndex7d.length > 0 && (
              <div className="col-span-2 mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">7d Tail Index (p90/p50)</span>
                  {(() => {
                    const vals = tailIndex7d.map(r=>r.ti).filter((v): v is number => typeof v === 'number')
                    if (vals.length === 0) return <span className="text-[10px] text-[var(--c-text-muted)]">--</span>
                    const latest = vals[vals.length-1]
                    const first = vals[0]
                    const delta = latest - first
                    const rel = first>0 ? delta/first : 0
                    // Tail Index は低いほど集中度/一貫性良好 (裾が締まる)。
                    const arrow = Math.abs(rel) < 0.05 ? '→' : (rel < 0 ? '↓' : '↑')
                    const cls = rel < 0 ? 'text-[var(--c-success)]' : rel > 0 ? 'text-[var(--c-danger,#dc2626)]' : 'text-[var(--c-text-muted)]'
                    return <span className={`text-[10px] font-medium ${cls}`}>{latest.toFixed(2)} {arrow} {Math.round(rel*100)}%</span>
                  })()}
                </div>
                <div className="flex h-10 items-end gap-1">
                  {(() => {
                    // 動的最大 (上限 2.5) でスケール
                    const numbers = tailIndex7d.map(d=>d.ti).filter((v): v is number => typeof v === 'number')
                    const maxVal = Math.min(2.5, Math.max( ...(numbers.length?numbers:[1]) , 1)) // fallback 1
                    return tailIndex7d.map(d=>{
                      const ti = d.ti
                      const norm = ti==null ? 0 : Math.min(1, ti / maxVal)
                      const height = 6 + norm * 30 // 6..36
                      // カラー: 1.0~1.3 緑, 1.3~1.6 黄, >1.6 赤
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
            {retention7d.length > 0 && (
              <div className="col-span-2 mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">7d Retention Trend</span>
                  {(() => {
                    const vals = retention7d.map(r=>r.retention).filter((v): v is number => typeof v === 'number')
                    if (vals.length === 0) return <span className="text-[10px] text-[var(--c-text-muted)]">--</span>
                    const latest = vals[vals.length-1]
                    const first = vals[0]
                    const delta = latest - first
                    const arrow = Math.abs(delta) < 0.02 ? '→' : (delta > 0 ? '↑' : '↓')
                    const cls = delta > 0 ? 'text-[var(--c-success)]' : delta < 0 ? 'text-[var(--c-danger,#dc2626)]' : 'text-[var(--c-text-muted)]'
                    return <span className={`text-[10px] font-medium ${cls}`}>{Math.round(latest*100)}% {arrow} {Math.round(delta*100)}%</span>
                  })()}
                </div>
                <div className="flex h-10 items-end gap-1">
                  {retention7d.map(d=>{
                    const pct = d.retention == null ? null : Math.round(d.retention*100)
                    const height = pct==null ? 8 : 8 + Math.round((pct/100)*28) // 8..36px
                    const color = pct==null ? 'var(--c-border)' : (pct >= 85 ? 'var(--c-accent)' : pct >= 70 ? 'var(--c-success)' : pct >= 55 ? 'var(--c-warn)' : 'var(--c-danger,#dc2626)')
                    return (
                      <div key={d.date} className="flex-1 relative rounded-sm overflow-hidden bg-[var(--c-border)]/30" style={{height: '36px'}} title={`${d.date} : ${pct==null ? 'No data' : pct + '%'}`}>
                        <div className="absolute bottom-0 left-0 w-full transition-all" style={{height, background: color, opacity: pct==null ? 0.35 : 1}} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {selectedDeck && deckRetention7d.length > 0 && (
              <div className="col-span-2 mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium tracking-wide text-[var(--c-text-secondary)]">7d Retention ({selectedDeck})</span>
                  {(() => {
                    const vals = deckRetention7d.map(r=>r.retention).filter((v): v is number => typeof v === 'number')
                    if (vals.length === 0) return <span className="text-[10px] text-[var(--c-text-muted)]">--</span>
                    const latest = vals[vals.length-1]
                    const first = vals[0]
                    const delta = latest - first
                    const arrow = Math.abs(delta) < 0.02 ? '→' : (delta > 0 ? '↑' : '↓')
                    const cls = delta > 0 ? 'text-[var(--c-success)]' : delta < 0 ? 'text-[var(--c-danger,#dc2626)]' : 'text-[var(--c-text-muted)]'
                    return <span className={`text-[10px] font-medium ${cls}`}>{Math.round(latest*100)}% {arrow} {Math.round(delta*100)}%</span>
                  })()}
                </div>
                <div className="flex h-10 items-end gap-1">
                  {deckRetention7d.map(d=>{
                    const pct = d.retention == null ? null : Math.round(d.retention*100)
                    const height = pct==null ? 8 : 8 + Math.round((pct/100)*28)
                    const color = pct==null ? 'var(--c-border)' : (pct >= 85 ? 'var(--c-accent)' : pct >= 70 ? 'var(--c-success)' : pct >= 55 ? 'var(--c-warn)' : 'var(--c-danger,#dc2626)')
                    return (
                      <div key={d.date} className="flex-1 relative rounded-sm overflow-hidden bg-[var(--c-border)]/30" style={{height: '36px'}} title={`${d.date} : ${pct==null ? 'No data' : pct + '%'}`}>
                        <div className="absolute bottom-0 left-0 w-full transition-all" style={{height, background: color, opacity: pct==null ? 0.35 : 1}} />
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
              title="ポイントを0に戻します"
            >
              ポイントをリセット
            </button>
            <button
              onClick={resetDaily}
              className="btn-secondary flex-1"
              title="今日の達成数・連続記録をクリア（テスト用）"
            >
              連続記録をリセット
            </button>
            {hasMounted && newAvail.remainingToday > 0 && (
              <div className="flex-1 text-center text-[10px] text-[var(--c-text-secondary)]">空のとき /review で自動導入 ({newAvail.remainingToday} 枠)</div>
            )}
          </div>
        </div>
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
            <h2 className="text-sm font-semibold flex items-center gap-2">Upcoming Review Load ({horizon}d)
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${upcomingLoad.classification==='high'?
                'bg-[var(--c-danger,#dc2626)]/15 text-[var(--c-danger,#dc2626)]': upcomingLoad.classification==='medium'?
                'bg-[var(--c-warn,#d97706)]/20 text-[var(--c-warn,#d97706)]':'bg-[var(--c-success)]/15 text-[var(--c-success)]'}`}>{upcomingLoad.classification}</span>
              {horizon===14 && upcomingLoadExt?.secondWeekWarning && (
                <span title="Second Week Warning: 2週目に負荷集中傾向 (Peak Shift or Balance Ratio)" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--c-warn,#d97706)]/20 text-[var(--c-warn,#d97706)] text-[10px] font-bold">!</span>
              )}
            </h2>
            <div className="text-[10px] text-[var(--c-text-secondary)] flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={()=>{ setHorizon(7); try{localStorage.setItem('evody:profile:loadHorizon','7')}catch{} }}
                  className={`px-2 py-0.5 rounded text-[10px] border ${horizon===7?'bg-[var(--c-surface-alt)] font-semibold':''}`}>7d</button>
                <button
                  onClick={()=>{ setHorizon(14); try{localStorage.setItem('evody:profile:loadHorizon','14')}catch{} }}
                  className={`px-2 py-0.5 rounded text-[10px] border ${horizon===14?'bg-[var(--c-surface-alt)] font-semibold':''}`}>14d</button>
              </div>
              {horizon===14 && upcomingLoadExt?.decks && upcomingLoadExt.decks.length>0 && (
                <button
                  onClick={()=>{ const v=!deckStack14; setDeckStack14(v); try{localStorage.setItem('evody:profile:deckStack14', v?'1':'0')}catch{} }}
                  className={`px-2 py-0.5 rounded text-[10px] border ${deckStack14?'bg-[var(--c-surface-alt)] font-semibold':''}`}
                  title="デッキ別スタック表示トグル"
                >Stack</button>
              )}
              <span>Peak {upcomingLoad.peak?.count ?? 0}</span>
              <span>Median {upcomingLoad.median}</span>
              <span>Today {upcomingLoad.today.projected}</span>
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
              >What-if</button>
            </div>
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
              <div className="flex h-16 items-end gap-1" title="Deck stacked breakdown (14d)">
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
              {upcomingLoad.today.backlog>0 && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--c-danger,#dc2626)]" />Backlog</span>}
              <button
                onClick={()=>{ const v=!deckStack14; setDeckStack14(v); try{localStorage.setItem('evody:profile:deckStack14', v?'1':'0')}catch{} }}
                className={`ml-auto px-2 py-0.5 rounded text-[10px] border ${deckStack14?'bg-[var(--c-surface-alt)] font-semibold':''}`}
              >Raw</button>
            </div>
          )}
          {upcomingLoad.today.backlog>10 && (
            <div className="mt-2 text-[11px] text-[var(--c-danger,#dc2626)] font-medium">Backlog が多めです ({upcomingLoad.today.backlog}). 先に既存レビュー消化を推奨。</div>
          )}
          {horizon===14 && upcomingLoadExt && (
            <div className="mt-3 grid gap-2 text-[10px] sm:grid-cols-3">
              <div className="rounded border p-2 flex flex-col gap-0.5" title="Week1: 最初の7日間の予定レビュー負荷 (当日含む)。Peak=最大日件数, Total=合計件数。"><span className="text-[var(--c-text-secondary)] font-semibold">Week1</span><span>Peak {upcomingLoadExt.week1.peak}</span><span>Total {upcomingLoadExt.week1.total}</span></div>
              {upcomingLoadExt.week2 && (
                <div className="rounded border p-2 flex flex-col gap-0.5" title="Week2: 8〜14日目の予定レビュー。Week1 との比較で集中/偏りを把握。"><span className="text-[var(--c-text-secondary)] font-semibold">Week2</span><span>Peak {upcomingLoadExt.week2.peak}</span><span>Total {upcomingLoadExt.week2.total}</span></div>
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
                            <div className="rounded border p-2 flex flex-col gap-0.5" title="Balance: Peak Shift= (Week2Peak - Week1Peak)。W2/W1 = Week2Total / Week1Total。2週目偏重や負荷移動を検出。">
                              <span className="text-[var(--c-text-secondary)] font-semibold">Balance</span>
                              <span className={`flex items-center gap-1 ${shiftCls}`}>Shift {shift!=null? shift: '--'}</span>
                              <span className={ratioCls}>W2/W1 {ratio!=null? ratio: '--'}</span>
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
                            <div className="rounded border p-2 flex flex-col gap-0.5" title="Shape: Flatten = globalPeak / top3Avg (上位3日の平均と比較し尖り具合を測定)。値が1に近いほど平準化。Top3Avg=上位3日平均。">
                              <span className="text-[var(--c-text-secondary)] font-semibold">Shape</span>
                              <span className={fiCls}>Flatten {fi!=null? fi: '--'}</span>
                              <span>Top3Avg {upcomingLoadExt.top3Avg!=null? Math.round(upcomingLoadExt.top3Avg): '--'}</span>
                            </div>
                          )
                        })()}
              {upcomingLoadExt.secondWeekWarning && (
                <div className="rounded border p-2 flex flex-col gap-1 sm:col-span-2 bg-[var(--c-warn,#d97706)]/10 border-[var(--c-warn,#d97706)]/50" title="Second Week Warning: Week2ピークが Week1 を大きく超過 (>=1.25x かつ >=8) か W2/W1 >=1.4 の場合。">
                  <span className="font-semibold text-[var(--c-warn,#d97706)]">Second Week Warning</span>
                  <span className="leading-snug">2週目に負荷集中の兆候があります (Peak Shift または Balance Ratio)。新カード導入ペースを少し抑えるか既存レビュー優先を検討。</span>
                </div>
              )}
            </div>
          )}
          {horizon===14 && upcomingLoadExt?.decks && upcomingLoadExt.decks.length>0 && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-wide text-[var(--c-text-secondary)]">Deck Week Metrics (Top)</span>
                <span className="text-[9px] text-[var(--c-text-muted)]" title="並び: w2 Peak desc -> w1 Peak desc">sorted</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border border-[var(--c-border)]/60 rounded-sm min-w-[420px]">
                  <thead className="bg-[var(--c-surface-alt)]/40">
                    <tr className="text-[9px] text-left">
                      <th className="px-2 py-1 font-medium">Deck</th>
                      <th className="px-2 py-1 font-medium" title="Week1 Peak / Total">W1 P/T</th>
                      <th className="px-2 py-1 font-medium" title="Week2 Peak / Total">W2 P/T</th>
                      <th className="px-2 py-1 font-medium" title="Shift = W2Peak - W1Peak">Shift</th>
                      <th className="px-2 py-1 font-medium" title="Balance = W2Total / W1Total">Balance</th>
                      <th className="px-2 py-1 font-medium" title="Flatten = deckPeak / top3Avg (デッキ内尖り) 1に近いほど平準化">Flat</th>
                      <th className="px-2 py-1 font-medium" title="Backlog">Bkg</th>
                      <th className="px-2 py-1 font-medium" title="Backlog Ratio = backlog / (backlog + future counts). 高いほど滞留">Bkg%</th>
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
                            <td className="px-2 py-1 tabular-nums" title="Backlog">{d.backlog>0? d.backlog: ''}</td>
                            <td className={`px-2 py-1 tabular-nums ${bkrCls}`}>{typeof bkr==='number'? (bkr*100).toFixed(0)+'%': '--'}</td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
                <div className="mt-1 text-[8px] text-[var(--c-text-muted)]">W1/2: 7日単位ミニ指標 (Peak/Total)。Shift=W2Peak-W1Peak, Balance=W2Total/W1Total, Flat=deckPeak/top3Avg (1に近いほど尖り小)。Bkg% = backlog / (backlog + future) (≥40% 赤 / ≥25% 黄 / 他 緑)。</div>
              </div>
            </div>
          )}
          <div className="mt-2 text-[10px] text-[var(--c-text-secondary)] leading-relaxed">
            Peak は期間内最大日次予定レビュー数、Median は日次件数の中央値。赤=期限超過(backlog)、濃色=これから到来予定。Today=本日残+backlog。バー高さは Peak 基準。{horizon===14 && ' 14d では Week1/Week2 のピーク/合計と平準化指標(Flatten, Balance)・2週目集中警告を表示。What-if は 7d 前提。'}
          </div>
        </div>
      )}

      {showWhatIf && whatIfResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-6" onClick={()=>setShowWhatIf(false)} role="dialog" aria-modal="true" aria-label="What-if シミュレーションモーダル">
          <div className="w-full max-w-5xl h-[90vh] sm:h-[80vh] rounded-2xl border bg-[var(--c-surface)] shadow-xl text-sm flex flex-col" onClick={e=>e.stopPropagation()} tabIndex={-1}>
            <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b gap-4" role="heading" aria-level={2}>
              <h2 className="text-base font-semibold leading-snug" id="whatif-title">What-if: 新カード導入シミュレーション ({horizon}d)</h2>
              <button onClick={()=>setShowWhatIf(false)} className="rounded-md px-3 py-1 text-xs font-medium border hover:bg-[var(--c-surface-alt)]" aria-label="What-if 閉じる (ESC)" title="閉じる">閉じる</button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
                {/* Summary Panel (Phase 1.30A UI refinement: key KPIs at a glance) */}
                {whatIfResult && (
                  <WhatIfSummaryBadges whatIfResult={whatIfResult} />
                )}
                <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
                  {/* Left column */}
                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-[var(--c-text-secondary)] flex items-center gap-2 flex-wrap">追加新カード数
                        <input type="number" aria-label="追加新カード数入力" value={whatIfN} min={0} max={Math.max(10, (adaptiveDetail?.final||5)*2)} onChange={e=>{
                          const v = parseInt(e.target.value,10); if (!Number.isNaN(v)) setWhatIfN(Math.max(0, Math.min(200, v)))
                        }} className="w-24 rounded border bg-transparent px-2 py-1 text-[12px]" />
                        <input type="range" aria-label="追加新カード数スライダー" value={whatIfN} min={0} max={Math.max(10, (adaptiveDetail?.final||5)*2)} onChange={e=> setWhatIfN(parseInt(e.target.value,10))} className="flex-1" />
                        <select aria-label="デッキ選択" value={whatIfDeck} onChange={e=> setWhatIfDeck(e.target.value)} className="ml-2 rounded border bg-transparent px-2 py-1 text-[11px]">
                          <option value="ALL">All Decks</option>
                          {upcomingLoadExt?.decks?.map(d=> (
                            <option key={d.deckId} value={d.deckId}>{d.deckId}</option>
                          ))}
                        </select>
                      </label>
                      <div className="text-[10px] text-[var(--c-text-muted)] leading-snug">
                        {whatIfChained ? '仮定: プリセット初期間隔で初期再出現 (固定間隔近似)。失敗/ズレ未考慮。W1合計は Week1 内オフセット (<=6)。' : '仮定: Day1 のみ 1 回再出現 (初回復習)。失敗再注入未考慮。'}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
                          <input type="checkbox" aria-label="Chained モード切替" checked={whatIfChained} onChange={e=> setWhatIfChained(e.target.checked)} className="scale-90" />
                          <span>Chained ({chainPreset==='standard'?'1/3/7': chainPreset==='fast'?'1/2/5': chainPreset==='gentle'?'2/5/9':'3/7'})</span>
                          {whatIfChained && (
                            <div className="ml-2 flex items-center gap-1 flex-wrap">
                              <select
                                value={chainPreset}
                                onChange={e=> setChainPreset(e.target.value as ChainPresetKey)}
                                className="rounded-md border bg-transparent px-1 py-0.5 text-[10px]"
                                title="初期再出現プリセット"
                              >
                                <option value="standard">Std 1/3/7</option>
                                <option value="fast">Fast 1/2/5</option>
                                <option value="gentle">Gentle 2/5/9</option>
                                <option value="minimal">Mini 3/7</option>
                              </select>
                              <div className="flex items-center gap-1 text-[9px] ml-1">
                                {CHAIN_PRESETS[chainPreset].map(o=>{
                                  const disabled = o >= horizon
                                  return (
                                    <span key={o} className={`px-1 py-0.5 rounded border ${disabled? 'opacity-40 line-through' : 'opacity-90'} bg-[var(--c-surface-alt)]`}>{`D${o}`}</span>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </label>
                        {whatIfResult.chainDistribution && (
                          <div className="text-[9px] text-[var(--c-text-muted)]">
                            Dist: {whatIfResult.chainDistribution.map(c=>`D${c.dayOffset}:${c.added}`).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <div className="text-[10px] font-semibold text-[var(--c-text-secondary)] mb-1">Before</div>
                        <div className="space-y-1 text-[11px]">
                          <div>Peak <strong>{whatIfResult.original.peak?.count ?? 0}</strong></div>
                          <div>Median <strong>{whatIfResult.original.median}</strong></div>
                          <div>Class <strong className="capitalize">{whatIfResult.original.classification}</strong></div>
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-[10px] font-semibold text-[var(--c-text-secondary)] mb-1">After (+{whatIfResult.additional})</div>
                        <div className="space-y-1 text-[11px]">
                          <div>Peak <strong>{whatIfResult.simulated.peak?.count ?? 0}</strong> {whatIfResult.deltas.peak!==0 && (<span className={whatIfResult.deltas.peak>0? 'text-[var(--c-danger,#dc2626)]':'text-[var(--c-success)]'}>({whatIfResult.deltas.peak>0?'+':''}{whatIfResult.deltas.peak})</span>)}</div>
                          <div>Median <strong>{whatIfResult.simulated.median}</strong> {whatIfResult.deltas.median!==0 && (<span className={whatIfResult.deltas.median>0? 'text-[var(--c-danger,#dc2626)]':'text-[var(--c-success)]'}>({whatIfResult.deltas.median>0?'+':''}{whatIfResult.deltas.median})</span>)}</div>
                          <div>Class <strong className="capitalize">{whatIfResult.simulated.classification}</strong> {whatIfResult.deltas.classificationChanged && (<span className="ml-1 rounded bg-[var(--c-warn,#d97706)]/20 px-1">→</span>)}</div>
                          <div>Peak Δ% <strong>{whatIfResult.deltas.peakIncreasePct}</strong></div>
                          {whatIfResult.expectedPeakWithFailures !== undefined && (
                            <CollapsibleSection
                              id="wf-early"
                              title="Early Failures"
                              collapsed={collapseEarly}
                              onToggle={()=> setCollapseEarly(c=>!c)}
                              summary={whatIfResult.againRateSampled !== undefined && (
                                <>
                                  Rate: {whatIfResult.againRateSampled===null? '—' : Math.round((whatIfResult.againRateSampled||0)*100)}%{whatIfResult.againRateFallbackUsed && ' (fallback)'}{typeof whatIfResult.againSampleSize === 'number' && <span> n={whatIfResult.againSampleSize}</span>}
                                </>
                              )}
                              small
                            >
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {whatIfResult.expectedFailuresWeek1 !== undefined && <span>Expected W1 Again <strong>{whatIfResult.expectedFailuresWeek1}</strong></span>}
                                <span>Peak(+fails) <strong>{whatIfResult.expectedPeakWithFailures}</strong>{typeof whatIfResult.expectedPeakDelta==='number' && whatIfResult.expectedPeakDelta!==0 && (
                                  <span className={whatIfResult.expectedPeakDelta>0? 'text-[var(--c-danger,#dc2626)] ml-1':'text-[var(--c-success)] ml-1'}>({whatIfResult.expectedPeakDelta>0?'+':''}{whatIfResult.expectedPeakDelta})</span>
                                )}</span>
                              </div>
                              <div className="text-[8px] text-[var(--c-text-muted)]">簡易モデル: Week1 新規カード * Again率 (clamp 2%-55%)。全失敗は Day2 に集約。fallback=サンプル不足(min40)。</div>
                            </CollapsibleSection>
                          )}
                          {whatIfResult.timeLoad && (
                            <CollapsibleSection
                              id="wf-time"
                              title="Time Load"
                              collapsed={collapseTime}
                              onToggle={()=> setCollapseTime(c=>!c)}
                              summary={
                                <>per-card {whatIfResult.timeLoad.perCardMedianSec}s{whatIfResult.timeLoad.usedFallback && ' (fallback)'} n={whatIfResult.timeLoad.sampleSize}</>
                              }
                              small
                            >
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <span>Peak Min <strong>{whatIfResult.timeLoad.peakTimeMinutesSimulated}</strong>{whatIfResult.timeLoad.peakTimeDeltaMinutes!==0 && (
                                  <span className={whatIfResult.timeLoad.peakTimeDeltaMinutes>0? 'text-[var(--c-danger,#dc2626)] ml-1':'text-[var(--c-success)] ml-1'}>({whatIfResult.timeLoad.peakTimeDeltaMinutes>0?'+':''}{whatIfResult.timeLoad.peakTimeDeltaMinutes})</span>
                                )}</span>
                                {whatIfResult.timeLoad.week1TotalMinutesSimulated !== undefined && (
                                  <span>W1 Total <strong>{whatIfResult.timeLoad.week1TotalMinutesSimulated}</strong></span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1 text-[8px] items-center">
                                {whatIfResult.timeLoad.simulatedMinutesPerDay.map((m,i)=>(
                                  <span key={i} className="px-1 py-0.5 rounded bg-[var(--c-surface-alt)]/60 border">D{i}:{m}</span>
                                ))}
                              </div>
                              <div className="text-[8px] text-[var(--c-text-muted)]">Median秒 * 件数 / 60 を 0.1 分丸め。早期失敗増も反映。</div>
                            </CollapsibleSection>
                          )}
                          {whatIfChained && horizon>=8 && (whatIfResult.chainWeek1Added || whatIfResult.chainWeek2Added) && (
                            <CollapsibleSection
                              id="wf-chain"
                              title="Chain Summary"
                              collapsed={collapseChain}
                              onToggle={()=> setCollapseChain(c=>!c)}
                              summary={<>( {CHAIN_PRESETS[chainPreset].join('/')})</>}
                              small
                            >
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {whatIfResult.chainWeek1Added && <span>W1+ <strong>{whatIfResult.chainWeek1Added}</strong></span>}
                                {whatIfResult.chainWeek2Added && horizon>=14 && <span>W2+ <strong>{whatIfResult.chainWeek2Added}</strong></span>}
                              </div>
                              <div className="text-[8px] text-[var(--c-text-muted)]">W1+: Week1 内オフセット(≤6) 合計 / W2+: Week2 内 (7..13)。Unused(&gt;horizon) は除外。</div>
                            </CollapsibleSection>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={whatIfN<=0 || applying}
                        onClick={()=>{
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
                        className="rounded-md bg-[var(--c-accent)] text-[var(--c-text-inverse,#fff)] px-3 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                        title="実際に新カードを導入 (今日の残り枠に従い、余剰は無視)"
                      >Apply</button>
                      <button onClick={()=>setShowWhatIf(false)} className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-[var(--c-surface-alt)]">閉じる</button>
                    </div>
                  </div>
                  {/* Right column */}
                  <div className="flex flex-col gap-5">
                    <div>
                      <div className="mb-1 text-[10px] font-medium text-[var(--c-text-secondary)]">{horizon}d Bars (シミュレーション差分)</div>
                      <div className="flex h-24 sm:h-28 items-end gap-1" role="img" aria-label="日次レビュー件数のBefore/After比較バー">
                        {whatIfResult.simulated.days.map((d,i)=>{
                          const before = whatIfResult.original.days[i]?.count || 0
                          const after = d.count
                          const peak = Math.max(1, whatIfResult.simulated.peak?.count || 1)
                          const heightAfter = 6 + (after/peak)*76
                          const heightBefore = before>0? 6 + (before/peak)*76 : 0
                          return (
                            <div key={d.date} className="flex-1 relative rounded-sm bg-[var(--c-border)]/30 overflow-hidden" style={{height:'100%'}} title={`${d.date}\nBefore ${before} -> After ${after}`}>
                              {heightBefore>0 && (
                                <div className="absolute bottom-0 left-0 w-full" style={{height:heightBefore, background:'var(--c-accent)', opacity:0.35}} />
                              )}
                              {after>0 && (
                                <div className="absolute bottom-0 left-0 w-full" style={{height:heightAfter, background:'var(--c-accent)'}} />
                              )}
                              {after-before>0 && (
                                <div className="absolute inset-0 flex items-start justify-center pt-0.5">
                                  <span className="text-[8px] font-medium text-[var(--c-text-inverse,#fff)] mix-blend-difference">+{after-before}</span>
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-0.5 pointer-events-none">
                                <span className="text-[8px] font-medium text-[var(--c-text-inverse,#fff)] mix-blend-difference" style={{opacity: after>0?0.85:0}}>{after}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-1 text-[9px] text-[var(--c-text-secondary)]">淡色=Before, 濃色=After, +数値=追加分</div>
                      {/* Mini Sparklines (Before vs After counts) */}
                      <div className="mt-3 space-y-1" aria-label="スパークライン比較" role="group">
                        {(() => {
                          const beforeCounts = whatIfResult.original.days.map(d=> d.count)
                          const afterCounts = whatIfResult.simulated.days.map(d=> d.count)
                          const peak = Math.max(1, ...beforeCounts, ...afterCounts)
                          const Row = ({label, data, color, bg}:{label:string; data:number[]; color:string; bg:string}) => (
                            <div className="flex items-center gap-2" aria-label={`${label} sparkline`}>
                              <span className="w-10 text-[8px] font-medium text-[var(--c-text-secondary)]">{label}</span>
                              <div className="flex flex-1 h-4 gap-[2px]">
                                {data.map((v,i)=>{
                                  const h = (v/peak)
                                  const barH = Math.max(2, Math.round(h*16))
                                  return (
                                    <div key={i} className="flex-1 relative rounded-sm overflow-hidden" style={{background:bg}} title={`D${i}: ${v}`}>
                                      {v>0 && <div className="absolute bottom-0 left-0 w-full" style={{height:barH, background:color}} />}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                          return (
                            <div className="rounded-md border p-2 bg-[var(--c-surface-alt)]/30" aria-label="Before/After sparkline comparison">
                              <Row label="Before" data={beforeCounts} color="var(--c-border)" bg="var(--c-border)/20" />
                              <Row label="After" data={afterCounts} color="var(--c-accent)" bg="var(--c-border)/20" />
                              <div className="mt-1 text-[7px] text-[var(--c-text-muted)]">Compact sparkline: height = count/peak * 16px (min2). 0件はフラット。</div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                    {whatIfResult.deckChainImpact && (
                      <div className="rounded-lg border p-3 text-[10px] space-y-1">
                        <div className="text-[9px] font-semibold text-[var(--c-text-secondary)] mb-1">Deck Chain Impact ({whatIfResult.deckChainImpact.deckId})</div>
                        <div>Day1: {whatIfResult.deckChainImpact.day1Before} → {whatIfResult.deckChainImpact.day1After}</div>
                        <div>Day3: {whatIfResult.deckChainImpact.day3Before} → {whatIfResult.deckChainImpact.day3After}</div>
                        <div>Day7: {whatIfResult.deckChainImpact.day7Before} → {whatIfResult.deckChainImpact.day7After}</div>
                        <div>Deck Peak: {whatIfResult.deckChainImpact.deckPeakBefore} → {whatIfResult.deckChainImpact.deckPeakAfter}</div>
                        {whatIfResult.deckChainImpact.deckWeek1TotalBefore!=null && (
                          <div>W1 Total: {whatIfResult.deckChainImpact.deckWeek1TotalBefore} → {whatIfResult.deckChainImpact.deckWeek1TotalAfter}</div>
                        )}
                        <div className="text-[8px] text-[var(--c-text-muted)]">簡易チェーンモデル (Preset: {CHAIN_PRESETS[chainPreset].join('/')}). 将来: 個別安定性ベース動的化予定。</div>
                      </div>
                    )}
                    {!whatIfResult.deckChainImpact && whatIfResult.deckImpact && !whatIfChained && (
                      <div className="rounded-lg border p-3 text-[10px] space-y-1">
                        <div className="text-[9px] font-semibold text-[var(--c-text-secondary)] mb-1">Deck Impact ({whatIfResult.deckImpact.deckId})</div>
                        <div>Day1: {whatIfResult.deckImpact.day1Before} → {whatIfResult.deckImpact.day1After}</div>
                        <div>Deck Peak: {whatIfResult.deckImpact.deckPeakBefore} → {whatIfResult.deckImpact.deckPeakAfter}</div>
                        {whatIfResult.deckImpact.deckWeek1TotalBefore!=null && (
                          <div>W1 Total: {whatIfResult.deckImpact.deckWeek1TotalBefore} → {whatIfResult.deckImpact.deckWeek1TotalAfter}</div>
                        )}
                        <div className="text-[8px] text-[var(--c-text-muted)]">簡易モデル: Day1 のみ 1 回追加。複数日学習連鎖は未考慮。</div>
                      </div>
                    )}
                    <div className="rounded-lg border p-3 grid grid-cols-2 gap-y-1 gap-x-4 text-[10px]">
                      <div className="text-[var(--c-text-secondary)]">Peak</div><div>{whatIfResult.original.peak?.count ?? 0} → {whatIfResult.simulated.peak?.count ?? 0}</div>
                      <div className="text-[var(--c-text-secondary)]">Median</div><div>{whatIfResult.original.median} → {whatIfResult.simulated.median}</div>
                      <div className="text-[var(--c-text-secondary)]">Class</div><div>{whatIfResult.original.classification} {whatIfResult.deltas.classificationChanged && <span className="mx-1">→</span>} {whatIfResult.deltas.classificationChanged && <span className="capitalize">{whatIfResult.simulated.classification}</span>}</div>
                      <div className="text-[var(--c-text-secondary)]">Peak Δ</div><div className={whatIfResult.deltas.peak>0? 'text-[var(--c-danger,#dc2626)]':'text-[var(--c-success)]'}>{whatIfResult.deltas.peak>0?'+':''}{whatIfResult.deltas.peak} ({whatIfResult.deltas.peakIncreasePct})</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
function WhatIfSummaryBadges({ whatIfResult }: { whatIfResult: WhatIfResult }) {
  const peakBefore = whatIfResult.original.peak?.count ?? 0
  const peakAfter = whatIfResult.simulated.peak?.count ?? 0
  const peakDelta = peakAfter - peakBefore
  const peakDeltaPct = peakBefore>0 ? Math.round((peakDelta/peakBefore)*100) : 0
  const added = whatIfResult.additional
  const chainW1 = whatIfResult.chainWeek1Added
  const expFails = whatIfResult.expectedFailuresWeek1
  const againRate = whatIfResult.againRateSampled
  const peakWithFails = whatIfResult.expectedPeakWithFailures
  const peakWithFailsDelta = (peakWithFails ?? peakAfter) - peakAfter
  const tl = whatIfResult.timeLoad
  const peakMinBefore = tl?.peakTimeMinutesOriginal
  const peakMinAfter = tl?.peakTimeMinutesSimulated
  const peakMinDelta = (peakMinAfter ?? 0) - (peakMinBefore ?? 0)
  const w1MinBefore = tl?.week1TotalMinutesOriginal
  const w1MinAfter = tl?.week1TotalMinutesSimulated
  const w1MinDelta = (w1MinAfter ?? 0) - (w1MinBefore ?? 0)

  const badges: React.ReactNode[] = []
  badges.push(
    <KpiBadge key="added" label="Added" value={'+'+added} tone="neutral" />
  )
  badges.push(
    <KpiBadge
      key="peak"
      label="Peak"
      value={`${peakBefore}→${peakAfter}`}
      extra={peakDelta!==0 && <span className={`ml-0.5 text-[9px] ${peakDelta>0? 'text-[var(--c-danger,#dc2626)]':'text-[var(--c-success,#059669)]'}`}>{peakDelta>0?'+':''}{peakDelta} ({peakDeltaPct}%)</span>}
      tone={decideDeltaTone(peakDelta)}
    />
  )
  if (peakMinAfter!==undefined && peakMinBefore!==undefined) {
    badges.push(
      <KpiBadge
        key="peak-min"
        label="Peak Min"
        value={`${peakMinBefore}→${peakMinAfter}`}
        extra={peakMinDelta!==0 && <span className={`ml-0.5 text-[9px] ${peakMinDelta>0? 'text-[var(--c-danger,#dc2626)]':'text-[var(--c-success,#059669)]'}`}>{peakMinDelta>0?'+':''}{peakMinDelta}</span>}
        tone={decideDeltaTone(peakMinDelta)}
      />
    )
  }
  if (w1MinAfter!==undefined && w1MinBefore!==undefined) {
    badges.push(
      <KpiBadge
        key="w1-min"
        label="W1 Min"
        value={`${w1MinBefore}→${w1MinAfter}`}
        extra={w1MinDelta!==0 && <span className={`ml-0.5 text-[9px] ${w1MinDelta>0? 'text-[var(--c-danger,#dc2626)]':'text-[var(--c-success,#059669)]'}`}>{w1MinDelta>0?'+':''}{w1MinDelta}</span>}
        tone={decideDeltaTone(w1MinDelta)}
      />
    )
  }
  if (chainW1) {
    badges.push(<KpiBadge key="w1plus" label="W1+" value={chainW1} tone="neutral" title="Week1 offset cards (<=D6)" />)
  }
  if (expFails!==undefined) {
    badges.push(
      <KpiBadge
        key="exp-again"
        label="Exp Again"
        value={expFails}
        extra={againRate!=null && <span className="text-[8px] opacity-70">@{Math.round((againRate||0)*100)}%</span>}
        tone={expFails>0? 'warn':'muted'}
        title="Expected early Again count (Week1)"
      />
    )
  }
  if (peakWithFails!==undefined && peakWithFails !== peakAfter) {
    badges.push(
      <KpiBadge
        key="peak-fails"
        label="Peak(+fails)"
        value={`${peakAfter}→${peakWithFails}`}
        extra={peakWithFailsDelta!==0 && <span className={`ml-0.5 text-[9px] ${peakWithFailsDelta>0? 'text-[var(--c-danger,#dc2626)]':'text-[var(--c-success,#059669)]'}`}>{peakWithFailsDelta>0?'+':''}{peakWithFailsDelta}</span>}
        tone={decideDeltaTone(peakWithFailsDelta)}
      />
    )
  }

  return (
    <div className="mb-6" aria-label="What-if summary" role="group">
      <div className="flex flex-wrap gap-2" role="list">{badges}</div>
      <div className="mt-1 text-[8px] text-[var(--c-text-muted)] leading-snug flex flex-wrap gap-x-4 gap-y-1">
        <span>色: 赤=負荷増 / 緑=負荷減 / 灰=変化小</span>
        <span>Peak Min=ピーク日の推定所要分</span>
        {whatIfResult.timeLoad?.usedFallback && <span>Time Load: fallback median</span>}
      </div>
    </div>
  )
}
