'use client'

import { DECKS } from '@/lib/decks'
import { motion } from 'framer-motion'
import DeckCard from '@/components/deck-card'
import { getLabel } from '@/lib/labels'
import { useLocale } from '@/app/locale-context'

export default function DecksPage() {
  const locale = useLocale()
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{getLabel('decksTitle', locale)}</h1>
        <p className="text-[15px] text-[var(--c-text-secondary)]">
          {getLabel('decksIntro', locale)}
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
