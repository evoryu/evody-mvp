'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import React from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-secondary)] transition-colors hover:bg-[var(--c-hover-layer)] hover:text-[var(--c-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-surface)] dark:text-[var(--c-text-secondary)]"
      title={isDark ? 'ライトモード' : 'ダークモード'}
      aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
    >
      {isDark ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  )
}
