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
      transition={{ duration: 0.2 }}
      className="relative rounded-lg bg-white px-4 py-2 pr-8 shadow-lg dark:bg-zinc-800"
    >
      <p className="text-sm font-medium dark:text-white">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute right-1 top-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <X size={14} />
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