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
  danger: 'border-red-500 bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 dark:from-transparent dark:to-transparent dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-500 dark:hover:bg-red-500/20 dark:hover:border-red-500/50',
  warning: 'border-amber-500 bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 dark:from-transparent dark:to-transparent dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-500 dark:hover:bg-amber-500/20 dark:hover:border-amber-500/50',
  success: 'border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 dark:from-transparent dark:to-transparent dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-500 dark:hover:bg-emerald-500/20 dark:hover:border-emerald-500/50',
  perfect: 'border-blue-500 bg-gradient-to-br from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 dark:from-transparent dark:to-transparent dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-500 dark:hover:bg-blue-500/20 dark:hover:border-blue-500/50',
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