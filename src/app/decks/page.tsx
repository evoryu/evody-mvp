'use client'

import { DECKS } from '@/lib/decks'
import { motion } from 'framer-motion'
import DeckCard from '@/components/deck-card'

export default function DecksPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">デッキ一覧</h1>
  <p className="text-[15px] text-[var(--c-text-secondary)]">
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
          <DeckCard key={deck.id} deck={deck} index={i} />
        ))}
      </motion.ul>
    </section>
  )
}
