'use client'

import React, { use } from 'react'
import { usePoints } from '@/app/points-context'
import { useToast } from '@/app/toast-context'
import { getDeck, getDeckCards } from '@/lib/decks'
import { getDueIds, schedule } from '@/lib/srs'
import { GradeButton as ImportedGradeButton } from '@/components/grade-button'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { saveEpisode, formatEpisodePost } from '@/lib/episodes'
import { logReview } from '@/lib/reviews'
import { useSocial } from '@/app/social-context'

type Props = { params: Promise<{ deckId: string }> } // ← params は Promise に

const SCORE = { Again: 0, Hard: 3, Good: 6, Easy: 8 } as const
type Grade = keyof typeof SCORE

export default function StudySessionPage({ params }: Props) {
  const { deckId } = use(params)                // ← ここで unwrap
  const deck = getDeck(deckId)
  const cards = getDeckCards(deckId)
  const allIds = React.useMemo(() => (cards || []).map(c => c.id), [cards])
  const dueIds = React.useMemo(() => getDueIds(allIds), [allIds])
  const effectiveIds = dueIds.length ? dueIds : allIds
  const { add } = usePoints()
  const { showToast } = useToast()
  const social = React.useRef<null | ReturnType<typeof useSocial>>(null)
  try { // Provider外では失敗するので握りつぶし
    // eslint-disable-next-line react-hooks/rules-of-hooks
    social.current = useSocial()
  } catch {}

  const [i, setI] = React.useState(0)
  const [reveal, setReveal] = React.useState(false)
  const [earned, setEarned] = React.useState(0)
  const [done, setDone] = React.useState(false)
  const [startedAt] = React.useState(() => Date.now())
  const correctRef = React.useRef(0)
  const incorrectRef = React.useRef(0)
  const doneRef = React.useRef(done)
  React.useEffect(() => { doneRef.current = done }, [done])
  // 反応時間計測
  const revealAtRef = React.useRef<number | null>(null)

  // 現在のカード（レンダーおよび onGrade 用）
  const card = React.useMemo(() => {
    const id = effectiveIds[i]
    return cards.find(c => c.id === id) || null
  }, [cards, effectiveIds, i])

  const next = React.useCallback(() => {
    setReveal(false)
    if (i + 1 >= effectiveIds.length) setDone(true)
    else setI(i + 1)
  }, [i, effectiveIds.length])

  const onGrade = React.useCallback((g: Grade) => {
    let singleDelta: number | undefined
    if (revealAtRef.current) {
      const delta = Date.now() - revealAtRef.current
      if (delta >= 0 && delta < 60000) singleDelta = delta
      revealAtRef.current = null
    }
    const pts = SCORE[g]
    setEarned(e => e + pts)
    add(pts)
    if (g === 'Again') incorrectRef.current += 1
    else correctRef.current += 1
    try {
      if (card) {
        logReview(card.id, deckId, g, Date.now(), singleDelta)
        schedule(card.id, g)
      }
    } catch {}
    showToast(`${g}評価で ${pts}pt 獲得！`)
    next()
  }, [add, next, showToast, card, deckId])

  // キーボードショートカットのハンドラ
  React.useEffect(() => {
    if (doneRef.current) return
    const handle = (e: KeyboardEvent) => {
      if (!reveal) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
      setReveal(true); revealAtRef.current = Date.now()
        }
        return
      }
      const gradeMap: Record<string, Grade> = { '1': 'Again', '2': 'Hard', '3': 'Good', '4': 'Easy' }
      if (gradeMap[e.key]) {
        onGrade(gradeMap[e.key])
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [reveal, onGrade])

  const progress = Math.round(((done ? effectiveIds.length : i) / (effectiveIds.length || 1)) * 100)

  // 完了時Episode保存 + 自動投稿
  React.useEffect(() => {
    if (!done) return
    if (!deck) return
    const ep = saveEpisode({
      kind: 'deck',
      deckId: deckId,
      startedAt,
      finishedAt: Date.now(),
      correct: correctRef.current,
      incorrect: incorrectRef.current,
      points: earned,
    })
    try {
      const flag = localStorage.getItem('evody:autoPostEpisodes')
      if (flag === '1' && social.current) {
        social.current.create(formatEpisodePost(ep))
        showToast('学習完了をフィードに投稿しました')
      }
    } catch {}
  }, [done, deck, deckId, startedAt, earned, showToast])

  if (!deck || cards.length === 0) {
    return <p className="text-red-600">デッキが見つからないか、カードがありません。</p>
  }

  if (done) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">{deck.name}</h1>
        <motion.div
          className="overflow-hidden rounded-2xl border bg-[var(--c-surface)]/80 backdrop-blur shadow-lg dark:border-[var(--c-border)]/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', duration: 0.6 }}
        >
          <div className="border-b px-8 py-10 dark:border-[var(--c-border)]/50">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.15 }}
              className="mb-2 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold">セッション完了！</h2>
            </motion.div>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-sm text-[var(--c-text-secondary)]"
            >
              お疲れさまです。継続が定着の近道です。
            </motion.p>
          </div>
          <motion.div className="space-y-4 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            <div className="flex items-center justify-center gap-6">
              <div className="relative overflow-hidden rounded-2xl bg-[var(--c-surface-alt)] px-6 py-4">
                <div className="text-center">
                  <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">獲得ポイント</div>
                  <div className="mt-1 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{earned}</div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-[var(--c-surface-alt)] px-6 py-4">
                <div className="text-center">
                  <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">学習カード</div>
                  <div className="mt-1 text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{effectiveIds.length}</div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Link href="/decks" className="btn-secondary flex-1 group/button">
                <span>デッキ一覧へ</span>
                <div className="btn-overlay" />
              </Link>
              <button
                className="group/button relative flex flex-1 items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg active:shadow-sm"
                style={{ background: 'var(--grad-accent)' }}
                onClick={() => { setI(0); setReveal(false); setEarned(0); setDone(false) }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                </svg>
                もう一度
                <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover/button:opacity-100 dark:bg-white/15" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{deck.name}</h1>

      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--c-progress-track)]">
        <div className="h-full bg-[var(--c-progress-fill)] transition-all" style={{ width: `${progress}%` }} />
      </div>
  <p className="text-sm text-[var(--c-text-muted)]">{Math.min(i + 1, effectiveIds.length)} / {effectiveIds.length}</p>

      <motion.div 
        className="task-card overflow-hidden rounded-2xl border p-8 shadow-lg hover:shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
  <p className="font-numeric text-4xl font-bold tracking-tight">{card?.front ?? ''}</p>

        <AnimatePresence mode="wait">
          {reveal ? (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="mt-6 space-y-3"
            >
              <p className="text-2xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>{card?.back ?? ''}</p>
              {card?.example && (
                <p className="border-l-2 pl-4 text-[15px] leading-relaxed text-[var(--c-text-secondary)] border-[var(--c-border)] dark:border-[var(--c-border-strong)]">
                  例）{card.example}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-[15px] font-medium leading-relaxed text-[var(--c-text-muted)]"
            >
              答えを見るには「Reveal」を押すか、スペースキーを押してください
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-8 flex flex-wrap gap-2">
          {!reveal ? (
            <motion.button
              className="action-button group relative overflow-hidden rounded-xl px-8 py-3 text-sm font-medium shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
              onClick={() => { setReveal(true); revealAtRef.current = Date.now() }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor" 
                  className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180"
                >
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Reveal
                <span className="ml-1 text-white/60 dark:text-gray-900/60">[Space]</span>
              </span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100 dark:from-blue-500 dark:to-cyan-400"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              />
            </motion.button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <ImportedGradeButton label="Again" onClick={() => onGrade('Again')} />
                <ImportedGradeButton label="Hard" onClick={() => onGrade('Hard')} />
                <ImportedGradeButton label="Good" onClick={() => onGrade('Good')} />
                <ImportedGradeButton label="Easy" onClick={() => onGrade('Easy')} />
              </div>
              <p className="text-sm text-[var(--c-text-muted)]">
                キーボードショートカット: 1: Again / 2: Hard / 3: Good / 4: Easy
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  )
}


