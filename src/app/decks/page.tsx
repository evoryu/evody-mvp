'use client'

import { DECKS, countCards } from '@/lib/decks'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function DecksPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">デッキ一覧</h1>
        <p className="text-[15px] text-gray-600 dark:text-gray-400">
          全てのデッキ一覧から、学習したいデッキを選んで学習を始めましょう
        </p>
      </div>

      <motion.ul 
        className="grid gap-4 sm:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {DECKS.map((deck, i) => (
          <motion.li
            key={deck.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="task-card group relative overflow-hidden rounded-2xl border p-6">
              {/* タイトルへのリンク */}
              <Link 
                href={`/decks/${deck.id}`}
                className="absolute inset-0 z-20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                aria-label={`${deck.name}の詳細を見る`}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold tracking-tight group-hover:text-gray-600 dark:group-hover:text-gray-300">
                    {deck.name}
                  </h2>
                  {deck.description && (
                    <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                      {deck.description}
                    </p>
                  )}
                </div>
                <div className="task-input flex items-center rounded-lg px-3 py-1 text-sm font-medium">
                  {countCards(deck.id)}枚
                </div>
              </div>

              {deck.tags && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {deck.tags.map(tag => (
                    <span 
                      key={tag}
                      className="task-input rounded-lg px-2.5 py-1 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="relative mt-4 flex items-center gap-2">
                <Link
                  href={`/study/${deck.id}`}
                  className="action-button group/button relative z-30 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M3.196 12.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 12.87z" />
                    <path d="M3.196 8.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 8.87z" />
                    <path d="M10.38 1.103a.75.75 0 00-.76 0l-7.25 4.25a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.76 0l7.25-4.25a.75.75 0 000-1.294l-7.25-4.25z" />
                  </svg>
                  <span className="relative z-10">学習を開始</span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 transition-opacity group-hover/button:opacity-100 dark:from-blue-500 dark:to-cyan-400" />
                </Link>
              </div>

              {/* カード全体のホバーエフェクト用の背景グラデーション */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-cyan-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-5 dark:from-blue-500/5 dark:to-cyan-500/5" />
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  )
}
