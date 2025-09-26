'use client'

import * as React from 'react'
import { useToast } from '../toast-context'

export default function ToastDemoPage() {
  const { showToast } = useToast()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Toast デモ</h1>

      <div className="rounded-xl border bg-white p-6 space-y-4 dark:bg-zinc-900 dark:border-zinc-800">
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          各ボタンを押すと、画面右下にトースト通知が表示されます。
          複数のトーストは下から上にスタックされ、2.5秒後に自動的に消えます。
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            onClick={() => showToast('タスクを完了しました！')}
          >
            タスク完了
          </button>

          <button
            className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            onClick={() => showToast('Good評価で +6pt 獲得！')}
          >
            学習評価
          </button>

          <button
            className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            onClick={() => {
              // 複数のトーストをスタック表示するデモ
              showToast('1つ目のトースト')
              setTimeout(() => showToast('2つ目のトースト'), 500)
              setTimeout(() => showToast('3つ目のトースト'), 1000)
            }}
          >
            スタック表示
          </button>
        </div>
      </div>
    </div>
  )
}