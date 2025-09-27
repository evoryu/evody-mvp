'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export type Toast = {
  id: string
  message: string
  duration?: number // ミリ秒。デフォルトは2500ms
}

type Props = {
  toast: Toast
  onDismiss: (id: string) => void
}

export function Toast({ toast, onDismiss }: Props) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, toast.duration ?? 2500)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      className="task-input relative overflow-hidden rounded-lg border px-4 py-2.5 pr-8 shadow-lg backdrop-blur"
    >
      <p className="text-sm font-medium relative z-10">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="閉じる"
        className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--c-text-muted)] hover:text-[var(--c-text-secondary)] hover:bg-[var(--c-hover-layer)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-surface)] transition-colors"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </motion.div>
  )
}

type ToastGroupProps = {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastGroup({ toasts, onDismiss }: ToastGroupProps) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}