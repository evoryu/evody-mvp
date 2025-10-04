'use client'

import * as React from 'react'
import { useToast } from '@/app/toast-context'

// 短時間に連続付与されたポイントを集約して "+X pt" を出す
// - 1.5秒の集約ウィンドウ
// - 連続でイベントが来る間はタイマーを延長（バーストを1つにまとめる）
export function PointsToaster() {
  const { showToast } = useToast()
  const accRef = React.useRef(0)
  const timerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent).detail as { delta?: number }
      const d = typeof detail?.delta === 'number' ? detail.delta : 0
      if (d <= 0) return
      accRef.current += d
      // 集約タイマー（1.5秒）を更新
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        const v = accRef.current
        accRef.current = 0
        timerRef.current = null
        if (v > 0) showToast(`+${v} pt`)
      }, 1500)
    }
    window.addEventListener('evody:points:add', onAdd as EventListener)
    return () => {
      window.removeEventListener('evody:points:add', onAdd as EventListener)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [showToast])

  return null
}
