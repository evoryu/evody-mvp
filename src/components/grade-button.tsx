'use client'

import { type ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { getLabel, type LabelKey } from '@/lib/labels'
import { useLocale } from '@/app/locale-context'

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
  danger: { class: 'border-red-500 hover:brightness-110 dark:border-red-500/30', bg: 'var(--grad-danger)' },
  warning: { class: 'border-amber-500 hover:brightness-110 dark:border-amber-500/30', bg: 'var(--grad-warning)' },
  success: { class: 'border-emerald-500 hover:brightness-110 dark:border-emerald-500/30', bg: 'var(--grad-success)' },
  perfect: { class: 'border-blue-500 hover:brightness-110 dark:border-blue-500/30', bg: 'var(--grad-info)' },
} as const

export function GradeButton({
  label,
  variant = label === 'Again' ? 'danger'
    : label === 'Hard' ? 'warning'
    : label === 'Good' ? 'success'
    : 'perfect',
  className,
  ...props
}: GradeButtonProps) {
  const locale = useLocale()
  const labelKey: LabelKey = (
    label === 'Again' ? 'gradeAgain'
    : label === 'Hard' ? 'gradeHard'
    : label === 'Good' ? 'gradeGood'
    : 'gradeEasy'
  ) as LabelKey
  const display = getLabel(labelKey, locale)
  const pts = scores[label]
  const title = getLabel('gradeTitleTemplate', locale)
    .replace('{label}', display)
    .replace('{points}', String(pts))
  const suffix = getLabel('pointsSuffix', locale)
  return (
    <button
      className={cn(
  'group relative overflow-hidden rounded-xl border px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-surface)] hover:translate-y-[-1px] hover:scale-[1.02] hover:shadow-xl active:translate-y-0 active:scale-[0.985] active:shadow-lg',
        'before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-200 group-hover:before:opacity-100',
        variants[variant].class,
        className
      )}
      title={title}
      style={{ background: variants[variant].bg }}
      {...props}
    >
      <span className="relative z-10">{display}</span>
      <span className="absolute right-2 top-1 text-[10px] opacity-60 transition-opacity group-hover:opacity-100">
        +{pts}{suffix}
      </span>
    </button>
  )
}