'use client'

import React from 'react'

type PointsCtx = {
  points: number
  add: (delta: number) => void
  reset: () => void
}

const Ctx = React.createContext<PointsCtx | null>(null)

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [points, setPoints] = React.useState(0)

  // localStorage から復元
  React.useEffect(() => {
    const raw = localStorage.getItem('evody:points')
    if (raw) setPoints(Number(raw) || 0)
  }, [])

  // 変更を保存
  React.useEffect(() => {
    localStorage.setItem('evody:points', String(points))
  }, [points])

  const add = (delta: number) => {
    setPoints(p => {
      const next = Math.max(0, p + delta)
      try {
        if (typeof window !== 'undefined' && delta > 0) {
          window.dispatchEvent(new CustomEvent('evody:points:add', { detail: { delta } }))
        }
      } catch { /* ignore */ }
      return next
    })
  }
  const reset = () => setPoints(0)

  return <Ctx.Provider value={{ points, add, reset }}>{children}</Ctx.Provider>
}

export function usePoints() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error('usePoints must be used within PointsProvider')
  return ctx
}
