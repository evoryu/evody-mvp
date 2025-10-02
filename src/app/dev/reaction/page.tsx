"use client"
import React, { useMemo } from 'react'
import { getReactionMetricSnapshot } from '@/lib/analytics'

// Simple dev view for reaction metrics (7d)
// Shows daily p50/p90, tail index list, baseline vs today, and improvement rate.

function formatPct(v:number){ return (v*100).toFixed(1) + '%' }

export default function ReactionDevPage() {
  const snap = useMemo(()=> getReactionMetricSnapshot({ includeDebug: true }), [])
  const daily = snap.debug?.daily || []
  const today = daily[daily.length-1]
  const baselineP50 = snap.debug?.baselineP50
  const todayP50 = snap.debug?.todayP50
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reaction Metrics Debug</h1>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Summary</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
          <div className="p-3 rounded-lg border bg-white/60 dark:bg-zinc-900"><div className="font-medium">p50 Trend (7d)</div><div>{formatPct(snap.p50Trend7d)}</div></div>
          <div className="p-3 rounded-lg border bg-white/60 dark:bg-zinc-900"><div className="font-medium">Tail Index Avg</div><div>{snap.tailIndex7dAvg}</div></div>
          <div className="p-3 rounded-lg border bg-white/60 dark:bg-zinc-900"><div className="font-medium">Baseline p50</div><div>{baselineP50? baselineP50.toFixed(2)+'s':'-'}</div></div>
          <div className="p-3 rounded-lg border bg-white/60 dark:bg-zinc-900"><div className="font-medium">Today p50</div><div>{todayP50? todayP50.toFixed(2)+'s':'-'}</div></div>
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Daily (Last 7 Days)</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-zinc-800 text-left">
              <th className="p-2 font-medium">Date</th>
              <th className="p-2 font-medium">Samples</th>
              <th className="p-2 font-medium">p50 (s)</th>
              <th className="p-2 font-medium">p90 (s)</th>
              <th className="p-2 font-medium">Tail Index</th>
            </tr>
          </thead>
          <tbody>
            {daily.map(d=>{
              const ti = d.p50 && d.p90 ? (d.p90/d.p50) : null
              const isToday = d === today
              return (
                <tr key={d.date} className={isToday? 'bg-amber-50 dark:bg-zinc-700/40':''}>
                  <td className="p-2 font-mono text-xs">{d.date}</td>
                  <td className="p-2">{d.samples}</td>
                  <td className="p-2">{d.p50!=null? d.p50.toFixed(2): '-'}</td>
                  <td className="p-2">{d.p90!=null? d.p90.toFixed(2): '-'}</td>
                  <td className="p-2">{ti? ti.toFixed(2): '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Interpretation</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>p50 Trend = (Baseline − Today) / Baseline （正値=高速化 / 負値=悪化）</li>
          <li>Baseline: 過去6日で有効 (samples≥5) な日の p50 平均 (&gt;=3日必要)</li>
          <li>Tail Index = p90 / p50 （1.2〜1.5 安定 / 1.6+ ばらつき拡大）</li>
          <li>不足データ日: p50/p90 欠損扱い (表では &#39;-&#39;) / TI 平均計算から除外</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Raw JSON</h2>
        <pre className="text-xs p-3 rounded-lg border bg-white/50 dark:bg-zinc-900 overflow-x-auto max-h-64">{JSON.stringify(snap, null, 2)}</pre>
      </section>
      <footer className="text-xs text-gray-500 dark:text-zinc-400">Generated at {new Date().toLocaleTimeString()}</footer>
    </div>
  )
}
