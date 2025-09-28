import React, { useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'

export interface KpiBadgeProps {
  label: string
  value: React.ReactNode
  extra?: React.ReactNode
  tone?: 'neutral' | 'danger' | 'success' | 'warn' | 'muted'
  title?: string
  className?: string
}

const toneClass: Record<NonNullable<KpiBadgeProps['tone']>, string> = {
  neutral: 'bg-[var(--c-surface-alt)] text-[var(--c-text-secondary)]',
  danger: 'bg-[var(--c-danger,#dc2626)]/20 text-[var(--c-danger,#dc2626)]',
  success: 'bg-[var(--c-success,#059669)]/20 text-[var(--c-success,#059669)]',
  warn: 'bg-[var(--c-warn,#d97706)]/20 text-[var(--c-warn,#d97706)]',
  muted: 'bg-[var(--c-border)]/40 text-[var(--c-text-secondary)]'
}

export function KpiBadge({ label, value, extra, tone = 'neutral', title, className }: KpiBadgeProps) {
  const controls = useAnimation()
  useEffect(()=>{
    // mount animation
    controls.start({ opacity: 1, scale: 1, transition: { duration: 0.22, ease: 'easeOut' } })
  }, [controls])
  useEffect(()=>{
    // pulse on tone change
    controls.start({ scale: [1, 1.06, 1], transition: { duration: 0.28, times:[0,0.4,1], ease: 'easeOut' } })
  }, [tone, controls])
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={controls}
      className={`px-2 py-1 rounded-md border text-[10px] font-medium flex items-center gap-1 ${toneClass[tone]} ${className || ''}`}
      title={title}
      role="listitem"
      layout
    >
      <span className="opacity-70 font-normal">{label}</span>
      <span className="tabular-nums">{value}</span>
      {extra}
    </motion.div>
  )
}

export function decideDeltaTone(delta: number): KpiBadgeProps['tone'] {
  if (delta > 0) return 'danger'
  if (delta < 0) return 'success'
  return 'muted'
}
