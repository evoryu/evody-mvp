import React from 'react'
import { WhatIfResult, CHAIN_PRESETS, ChainPresetKey } from '@/lib/reviews'
import { KpiBadge, decideDeltaTone } from '@/components/kpi-badge'
import { CollapsibleSection } from '@/components/collapsible-section'

// Summary badges (moved from profile page)
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
  badges.push(<KpiBadge key="added" label="Added" value={'+'+added} tone="neutral" />)
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
  if (chainW1) badges.push(<KpiBadge key="w1plus" label="W1+" value={chainW1} tone="neutral" title="Week1 offset cards (<=D6)" />)
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

interface AdaptiveDetailLite { final?: number }
interface UpcomingLoadExtLite { decks?: { deckId: string }[] }

export interface WhatIfDialogProps {
  open: boolean
  onClose: () => void
  horizon: number
  whatIfResult: WhatIfResult
  whatIfN: number
  setWhatIfN: (n: number) => void
  whatIfDeck: string
  setWhatIfDeck: (id: string) => void
  adaptiveDetail: AdaptiveDetailLite | null
  upcomingLoadExt: UpcomingLoadExtLite | null
  whatIfChained: boolean
  setWhatIfChained: (b: boolean) => void
  chainPreset: ChainPresetKey
  setChainPreset: (p: ChainPresetKey) => void
  collapseEarly: boolean
  setCollapseEarly: React.Dispatch<React.SetStateAction<boolean>>
  collapseTime: boolean
  setCollapseTime: React.Dispatch<React.SetStateAction<boolean>>
  collapseChain: boolean
  setCollapseChain: React.Dispatch<React.SetStateAction<boolean>>
  applying: boolean
  onApply: () => void
}

export function WhatIfDialog(props: WhatIfDialogProps) {
  const {
    open, onClose, horizon, whatIfResult,
    whatIfN, setWhatIfN, whatIfDeck, setWhatIfDeck, adaptiveDetail, upcomingLoadExt,
    whatIfChained, setWhatIfChained, chainPreset, setChainPreset,
    collapseEarly, setCollapseEarly, collapseTime, setCollapseTime, collapseChain, setCollapseChain,
    applying, onApply
  } = props

  if (!open) return null

  const adaptive = adaptiveDetail || undefined
  const ext = upcomingLoadExt || undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="What-if シミュレーションモーダル">
      <div className="w-full max-w-5xl h-[90vh] sm:h-[80vh] rounded-2xl border bg-[var(--c-surface)] shadow-xl text-sm flex flex-col" onClick={e=>e.stopPropagation()} tabIndex={-1}>
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b gap-4" role="heading" aria-level={2}>
          <h2 className="text-base font-semibold leading-snug" id="whatif-title">What-if: 新カード導入シミュレーション ({horizon}d)</h2>
          <button onClick={onClose} className="rounded-md px-3 py-1 text-xs font-medium border hover:bg-[var(--c-surface-alt)]" aria-label="What-if 閉じる (ESC)" title="閉じる">閉じる</button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
            <WhatIfSummaryBadges whatIfResult={whatIfResult} />
            <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
              {/* Left column */}
              <div className="flex flex-col gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-[var(--c-text-secondary)] flex items-center gap-2 flex-wrap">追加新カード数
                    <input type="number" aria-label="追加新カード数入力" value={whatIfN} min={0} max={Math.max(10, (adaptive?.final||5)*2)} onChange={e=>{
                      const v = parseInt(e.target.value,10); if (!Number.isNaN(v)) setWhatIfN(Math.max(0, Math.min(200, v)))
                    }} className="w-24 rounded border bg-transparent px-2 py-1 text-[12px]" />
                    <input type="range" aria-label="追加新カード数スライダー" value={whatIfN} min={0} max={Math.max(10, (adaptive?.final||5)*2)} onChange={e=> setWhatIfN(parseInt(e.target.value,10))} className="flex-1" />
                    <select aria-label="デッキ選択" value={whatIfDeck} onChange={e=> setWhatIfDeck(e.target.value)} className="ml-2 rounded border bg-transparent px-2 py-1 text-[11px]">
                      <option value="ALL">All Decks</option>
                      {ext?.decks?.map((d: { deckId: string })=> (
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
                      if (whatIfN<=0) return; onApply()
                    }}
                    className="rounded-md bg-[var(--c-accent)] text-[var(--c-text-inverse,#fff)] px-3 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                    title="実際に新カードを導入 (今日の残り枠に従い、余剰は無視)"
                  >Apply</button>
                  <button onClick={onClose} className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-[var(--c-surface-alt)]">閉じる</button>
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
                          {after-before !== 0 && (
                            <div className="absolute -top-0.5 left-0 right-0 text-[8px] text-center text-[var(--c-text-secondary)]/70 tabular-nums">{after-before>0?'+':''}{after-before}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 items-center text-[8px] text-[var(--c-text-muted)]">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--c-accent)]/35" />Before</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--c-accent)]" />After</span>
                    <span>数字=差分</span>
                  </div>
                </div>
                {/* Sparkline */}
                <div>
                  <div className="mb-1 text-[10px] font-medium text-[var(--c-text-secondary)]">Sparkline (Before→After)</div>
                  <div className="flex items-center gap-2" role="img" aria-label="ミニ折れ線差分">
                    {(() => {
                      const peak = Math.max(1, whatIfResult.simulated.peak?.count || 1)
                      return whatIfResult.simulated.days.map((d,i)=>{
                        const before = whatIfResult.original.days[i]?.count || 0
                        const after = d.count
                        return (
                          <div key={d.date} className="flex flex-col items-center gap-0.5">
                            <div className="w-[10px] h-8 relative">
                              <div className="absolute bottom-0 left-[2px] w-[3px] rounded-sm" style={{height: (before/peak)*32, background:'var(--c-accent)', opacity:0.35}} />
                              <div className="absolute bottom-0 left-[5px] w-[3px] rounded-sm" style={{height: (after/peak)*32, background:'var(--c-accent)'}} />
                            </div>
                            <div className="text-[7px] tabular-nums text-[var(--c-text-muted)]">{after-before>0?'+':''}{after-before}</div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
