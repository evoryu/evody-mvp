"use client";
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Deck } from '@/lib/decks'
import { countCards } from '@/lib/decks'
import { getLabel } from '@/lib/labels'
import { useLocale } from '@/app/locale-context'

export default function DeckCard({ deck, index = 0 }: { deck: Deck; index?: number }) {
  const locale = useLocale()
  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="task-card group relative overflow-hidden rounded-2xl p-6 transition-all">
        {/* カード全体をリンク可能にするオーバーレイ */}
        <Link 
          href={`/decks/${deck.id}`}
          className="absolute inset-0 z-20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          aria-label={getLabel('ariaViewDeckDetails', locale).replace('{name}', deck.name)}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight group-hover:text-[var(--c-text-secondary)]">
              {deck.name}
            </h2>
            {deck.description && (
              <p className="text-[15px] leading-relaxed text-[var(--c-text-secondary)]">
                {deck.description}
              </p>
            )}
          </div>
          <div className="task-input flex items-center rounded-lg px-3 py-1 text-sm font-medium">
            {countCards(deck.id)}{getLabel('cardsSuffix', locale)}
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
            <span className="relative z-10">{getLabel('startStudyAction', locale)}</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 transition-opacity group-hover/button:opacity-100 dark:from-blue-500 dark:to-cyan-400" />
          </Link>
        </div>

        {/* ホバーエフェクト背景グラデーション */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-cyan-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-5 dark:from-blue-500/5 dark:to-cyan-500/5" />
      </div>
    </motion.li>
  )
}
