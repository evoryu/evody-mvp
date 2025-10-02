"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listBadges, evaluateBadges, ensureGeneratedBadgesLoaded, type Award } from '@/lib/badges'
import { getCurrentStreakDays } from '@/lib/episodes'
import { getBacklogSnapshot, getRetention7d30d } from '@/lib/reviews'
import { getReactionMetricSnapshot } from '@/lib/analytics'
import { usePoints } from './points-context'
import { useToast } from './toast-context'

// 永続化キー
const STORAGE_KEY = 'evody:badges'

export type StoredBadgeAward = Award

interface BadgesContextValue {
  awards: StoredBadgeAward[]
  awardSet: Set<string>
  refresh: () => void
}

const BadgesContext = React.createContext<BadgesContextValue | null>(null)

function loadStored(): StoredBadgeAward[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as StoredBadgeAward[]
    return []
  } catch {
    return []
  }
}

function saveStored(list: StoredBadgeAward[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

export function BadgesProvider({ children }: { children: React.ReactNode }) {
  const [awards, setAwards] = useState<StoredBadgeAward[]>(() => loadStored())
  const awardSet = useMemo(() => new Set(awards.map(a => a.id)), [awards])
  const { points } = usePoints()
  const { showToast } = useToast()
  const evaluatingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (evaluatingRef.current) return
    evaluatingRef.current = true
    try {
      await ensureGeneratedBadgesLoaded()
      // MetricsCtx 構築: streakDays は episodes から実計算。backlog はレビュー未実装のため暫定スタブ。
      const now = Date.now()
      const backlog = getBacklogSnapshot(now)
      const reaction = getReactionMetricSnapshot({ includeDebug: false })
      const retention = getRetention7d30d(now)
      const ctx = {
        streakDays: getCurrentStreakDays(),
        backlog: { current: backlog.current, previous: backlog.previous ?? undefined },
        reaction,
        flatten: { global: 1.1 },
        retention: { goodEasyPct: retention.r7d.retention != null ? Math.round(retention.r7d.retention * 100) : 0 },
        efficiency: { current: Math.min(1, points / 100) * 80 },
        episodes: { last7d: 14, last30d: 40 },
        timestamp: now,
      }
      const newly = evaluateBadges(ctx, awardSet)
        .filter(a => !awardSet.has(a.id))
      if (newly.length) {
        const merged = [...awards, ...newly]
        setAwards(merged)
        saveStored(merged)
        newly.forEach(n => {
          const def = listBadges().find(d => d.id === n.id)
          if (def) showToast(`Badge獲得: ${def.title.ja}`)
        })
      }
    } finally {
      evaluatingRef.current = false
    }
  }, [awardSet, awards, points, showToast])

  // 初回 & points 変化時に再評価 (簡易)
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { const id = setTimeout(()=> { void refresh() }, 300); return ()=> clearTimeout(id) }, [points, refresh])

  const value: BadgesContextValue = { awards, awardSet, refresh }
  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>
}

export function useBadges() {
  const ctx = React.useContext(BadgesContext)
  if (!ctx) throw new Error('useBadges must be used within BadgesProvider')
  return ctx
}
