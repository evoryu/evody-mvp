'use client'

import React from 'react'
import { usePoints } from '../points-context'
import Avatar from '@/components/avatar'


export default function ProfilePage() {
  const { points, reset } = usePoints()

  // ユーザー名（localStorageに保存）
  const [name, setName] = React.useState('')

  // const [daily, setDaily] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    const raw = localStorage.getItem('evody:username')
    if (raw) setName(raw)
  }, [])

  React.useEffect(() => {
    localStorage.setItem('evody:username', name)
  }, [name])

  // const today = dateKey()

  // ▼ 連続記録を計算（今日を起点に過去へ遡って、0になったら停止）
  // （未使用のため削除しました）

  const level = Math.floor(points / 100) + 1 // 仮のレベル計算

    const resetDaily = () => {
    localStorage.removeItem('evody:daily')
    // setDaily({})
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* プロフィールカード */}
        <div className="task-card rounded-xl border p-4 shadow-sm">
          <h2 className="text-lg font-semibold">ユーザー情報</h2>

          <div className="mt-3 flex items-start gap-4">
            {/* ← アバター */}
            <Avatar name={name || 'You'} size={96} />

            <div className="mt-3 space-y-3">
              <label className="block text-sm text-gray-600 dark:text-zinc-400">ユーザー名</label>
              <input
                className="task-input w-full rounded-lg border px-3 py-2"
                placeholder="あなたの名前"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="mt-2 text-sm text-gray-600">
                保存先：localStorage（ブラウザ内だけに保存）
              </div>
            </div>
          </div>
        </div>

        {/* ステータスカード */}
        <div className="task-card rounded-xl border p-4 shadow-sm">
          <h2 className="text-lg font-semibold">学習ステータス</h2>
          <ul className="mt-3 space-y-2">
            <li><span className="inline-block w-24 text-gray-500 dark:text-zinc-400">Points</span> {points}</li>
            <li><span className="inline-block w-24 text-gray-500 dark:text-zinc-400">Level</span> {level}</li>
          </ul>

          <div className="mt-4 flex gap-2">
            <button
              onClick={reset}
              className="task-input rounded-xl border px-4 py-2 text-sm hover:border-gray-300 dark:hover:border-zinc-700"
              title="ポイントを0に戻します"
            >
              ポイントをリセット
            </button>
            <button
                onClick={resetDaily}
                className="task-input rounded-xl border px-4 py-2 text-sm hover:border-gray-300 dark:hover:border-zinc-700"
                title="今日の達成数・連続記録をクリア（テスト用）"
              >
                連続記録をリセット
              </button>
          </div>
        </div>
      </div>

      <a
        href="/tasks"
        className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 font-medium text-white shadow-md transition-all hover:shadow-lg active:shadow-sm dark:from-blue-500/80 dark:to-cyan-400/80"
      >
        タスクを追加する
      </a>
    </section>
  )
}
