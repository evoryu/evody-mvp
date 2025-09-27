'use client'

import React from 'react'
import { usePoints } from '@/app/points-context'
import { useToast } from '@/app/toast-context'
import { GradeButton as ImportedGradeButton } from '@/components/grade-button'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { saveEpisode, formatEpisodePost } from '@/lib/episodes'
import { logReview } from '@/lib/reviews'
import { useSocial } from '@/app/social-context'

// ダミーカード（あとでデッキから差し替え可能）
type Card = { id: string; front: string; back: string; example?: string }
const SEED: Card[] = [
  { id: '1', front: 'apple', back: 'りんご', example: 'An apple a day keeps the doctor away.' },
  { id: '2', front: 'efficient', back: '効率的な', example: 'An efficient process saves time.' },
  { id: '3', front: 'maintain', back: '維持する', example: 'We maintain servers regularly.' },
  { id: '4', front: 'attempt', back: '試み', example: 'This is my second attempt.' },
  { id: '5', front: 'determine', back: '決定する', example: 'We must determine the cause.' },
]

// 評価ボタン → 付与ポイント
const SCORE = { Again: 0, Hard: 3, Good: 6, Easy: 8 } as const
type Grade = keyof typeof SCORE

export default function QuickStudyPage() {
  const { add } = usePoints()
  const { showToast } = useToast()
  const social = React.useRef<null | ReturnType<typeof useSocial>>(null)
  try {
    // SocialProvider 配下であれば利用可能
    // (feedページ等では自動投稿を即時反映できる)
    // Provider外の場合は無視
    // eslint-disable-next-line react-hooks/rules-of-hooks
    social.current = useSocial()
  } catch { /* ignore if not in provider */ }

  const [i, setI] = React.useState(0)
  const [reveal, setReveal] = React.useState(false)
  const [earned, setEarned] = React.useState(0)
  const [done, setDone] = React.useState(false)
  const [startedAt] = React.useState(() => Date.now())
  const correctRef = React.useRef(0)
  const incorrectRef = React.useRef(0)
  // useEffect の依存配列安定化用（Flipper 警告対策）
  const doneRef = React.useRef(done)
  React.useEffect(() => { doneRef.current = done }, [done])
  const revealAtRef = React.useRef<number | null>(null)

  const card = SEED[i]

  const next = React.useCallback(() => {
    setReveal(false)
    if (i + 1 >= SEED.length) setDone(true)
    else setI(i + 1)
  }, [i])

  const onGrade = React.useCallback((g: Grade) => {
    let singleDelta: number | undefined
    if (revealAtRef.current) {
      const delta = Date.now() - revealAtRef.current
      if (delta >=0 && delta < 60000) singleDelta = delta
      revealAtRef.current = null
    }
    const pts = SCORE[g]
    setEarned(e => e + pts)
    add(pts)
    if (g === 'Again') incorrectRef.current += 1
    else correctRef.current += 1
    // 簡易SRSログ (Quick学習は仮deckId 'quick')
    try { logReview(card.id, 'quick', g, Date.now(), singleDelta) } catch {}
    showToast(`${g}評価で ${pts}pt 獲得！`)
    next()
  }, [add, next, showToast, card?.id])

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

  const progress = Math.round(((done ? SEED.length : i) / SEED.length) * 100)

  // 完了時に一度だけEpisode保存
  React.useEffect(() => {
    if (!done) return
    const ep = saveEpisode({
      kind: 'quick',
      startedAt,
      finishedAt: Date.now(),
      correct: correctRef.current,
      incorrect: incorrectRef.current,
      points: earned,
    })
    // 自動投稿設定
    try {
      const flag = localStorage.getItem('evody:autoPostEpisodes')
      if (flag === '1' && social.current) {
        social.current.create(formatEpisodePost(ep))
        showToast('学習完了をフィードに投稿しました')
      }
    } catch { /* ignore */ }
  }, [done, startedAt, earned, showToast])

  if (done) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">Quick Study</h1>
        <motion.div
          className="overflow-hidden rounded-2xl border bg-[var(--c-surface)]/80 shadow-lg backdrop-blur"
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
              className="text-center text-[var(--c-text-secondary)] text-sm"
            >
              お疲れさまです。継続が定着の近道です。
            </motion.p>
          </div>
          <motion.div
            className="space-y-4 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
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
                  <div className="mt-1 text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{SEED.length}</div>
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
      <h1 className="text-3xl font-bold tracking-tight">Quick Study</h1>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--c-progress-track)]">
        <div className="h-full bg-[var(--c-progress-fill)] transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-[var(--c-text-muted)]">{i + 1} / {SEED.length}</p>

      <motion.div
        className="task-card relative overflow-hidden rounded-2xl border p-8 shadow-lg hover:shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <p className="font-numeric text-[42px] font-bold tracking-tight">{card.front}</p>
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
              <p className="text-2xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>{card.back}</p>
              {card.example && (
                <p className="task-input rounded-lg border px-4 py-3 text-[15px] leading-relaxed">
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

        <div className="mt-8 flex flex-wrap gap-3">
          {!reveal ? (
            <motion.button
              onClick={() => setReveal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="reveal-button group relative overflow-hidden rounded-xl px-8 py-3 text-sm font-medium shadow-lg transition-all hover:shadow-xl"
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
                <span>Reveal</span>
                <span className="ml-1 opacity-60">[Space]</span>
              </span>
            </motion.button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <ImportedGradeButton label="Again" onClick={() => onGrade('Again')} />
                <ImportedGradeButton label="Hard" onClick={() => onGrade('Hard')} />
                <ImportedGradeButton label="Good" onClick={() => onGrade('Good')} />
                <ImportedGradeButton label="Easy" onClick={() => onGrade('Easy')} />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[var(--c-surface-alt)] px-3 py-2 text-sm text-[var(--c-text-secondary)]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v8.5A2.25 2.25 0 0115.75 15h-3.105a3.501 3.501 0 001.1 1.677A.75.75 0 0113.26 18H6.74a.75.75 0 01-.484-1.323A3.501 3.501 0 007.355 15H4.25A2.25 2.25 0 012 12.75v-8.5zm1.5 0a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-7.5z" clipRule="evenodd" />
                </svg>
                <span>キーボードショートカット:</span>
                <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-200">1</kbd>
                <span>Again</span>
                <span>/</span>
                <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-200">2</kbd>
                <span>Hard</span>
                <span>/</span>
                <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-200">3</kbd>
                <span>Good</span>
                <span>/</span>
                <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-200">4</kbd>
                <span>Easy</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  )
}

