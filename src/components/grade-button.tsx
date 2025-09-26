'use client'

import { type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type GradeButtonProps = {
  label: 'Again' | 'Hard' | 'Good' | 'Easy'
  variant?: 'danger' | 'warning' | 'success' | 'perfect'
} & ComponentProps<'button'>

const scores = {
  Again: 0,
  Hard: 3,
  Good: 6,
  Easy: 8,
} as const

const variants = {
  danger: 'border-red-500 bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 dark:from-red-600/90 dark:to-red-700/90 dark:border-red-500/30 dark:text-white dark:hover:from-red-500/90 dark:hover:to-red-600/90',
  warning: 'border-amber-500 bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 dark:from-amber-500/90 dark:to-amber-600/90 dark:border-amber-500/30 dark:text-white dark:hover:from-amber-400/90 dark:hover:to-amber-500/90',
  success: 'border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 dark:from-emerald-600/90 dark:to-emerald-700/90 dark:border-emerald-500/30 dark:text-white dark:hover:from-emerald-500/90 dark:hover:to-emerald-600/90',
  perfect: 'border-blue-500 bg-gradient-to-br from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 dark:from-blue-600/90 dark:to-blue-700/90 dark:border-blue-500/30 dark:text-white dark:hover:from-blue-500/90 dark:hover:to-blue-600/90',
}

export function GradeButton({
  label,
  variant = label === 'Again' ? 'danger'
    : label === 'Hard' ? 'warning'
    : label === 'Good' ? 'success'
    : 'perfect',
  className,
  ...props
}: GradeButtonProps) {
  return (
    <button
      className={cn(
        'group relative rounded-xl border px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95',
        variants[variant],
        className
      )}
      title={`${label} (+${scores[label]}pt)`}
      {...props}
    >
      <span className="relative z-10">{label}</span>
      <span className="absolute right-2 top-1 text-[10px] opacity-60 transition-opacity group-hover:opacity-100">
        +{scores[label]}pt
      </span>
    </button>
  )
}