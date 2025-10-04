'use client'

import * as React from 'react'
import { incrementViewCount, getViewCount, markShownNow, shouldShowAd } from '@/lib/ads'
import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  minIntervalMs?: number
}

export function MiniAd({ minIntervalMs = 10 * 60 * 1000 }: Props) {
  const [open, setOpen] = React.useState(false)
  const [views, setViews] = React.useState(0)

  React.useEffect(() => {
    // 初回マウント時に表示可否を判定
    setViews(getViewCount())
    if (shouldShowAd(minIntervalMs)) {
      setOpen(true)
      markShownNow()
    }
  }, [minIntervalMs])

  const close = React.useCallback(() => setOpen(false), [])
  const watch = React.useCallback(() => {
    const v = incrementViewCount()
    setViews(v)
    markShownNow()
    setOpen(false)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-[60] max-w-xs"
        >
          <div className="overflow-hidden rounded-xl border bg-[var(--c-surface)] shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-2 text-sm dark:border-[var(--c-border)]/50">
              <span className="font-medium">応援広告</span>
              <button
                className="rounded-md px-2 py-1 text-[12px] text-[var(--c-text-secondary)] hover:bg-[var(--c-surface-alt)]"
                onClick={close}
                aria-label="広告を閉じる"
              >閉じる</button>
            </div>
            <div className="p-4 text-[13px] leading-relaxed text-[var(--c-text-secondary)]">
              <p>開発を応援していただける方は、短い広告をご視聴ください。</p>
              <p className="mt-2">視聴回数: <span className="font-semibold text-[var(--c-text)]">{views}</span></p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={watch}
                  className="action-button rounded-lg px-3 py-1.5 text-sm"
                >視聴する</button>
                <button
                  onClick={close}
                  className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
                >あとで</button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
