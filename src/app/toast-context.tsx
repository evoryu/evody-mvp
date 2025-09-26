'use client'

import * as React from 'react'
import { ToastGroup, type Toast } from '@/components/toast'

type ToastContextType = {
  showToast: (message: string, duration?: number) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const showToast = React.useCallback((message: string, duration = 2500) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, duration }])
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const value = React.useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastGroup toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}