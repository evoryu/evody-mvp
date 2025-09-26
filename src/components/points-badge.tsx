'use client'

import { usePoints } from '@/app/points-context'

export function PointsBadge() {
  const { points } = usePoints()
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800">
      <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 dark:bg-zinc-900">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-4 w-4 text-amber-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="font-numeric text-sm font-medium text-gray-900 dark:text-white">
          {points}
          <span className="ml-0.5 text-gray-500 dark:text-zinc-400">pt</span>
        </span>
      </div>
    </div>
  )
}
