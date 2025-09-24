'use client'

import { usePoints } from '@/app/points-context'

export function PointsBadge() {
  const { points } = usePoints()
  return (
    <span className="rounded-full border px-3 py-1 text-sm">Points: {points}</span>
  )
}
