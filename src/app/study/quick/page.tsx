'use client'

import React from 'react'
import { usePoints } from '@/app/points-context'
import { useToast } from '@/app/toast-context'
import { GradeButton as ImportedGradeButton } from '@/components/grade-button'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

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
const SCORE: Record<'Again' | 'Hard' | 'Good' | 'Easy', number> = {
  Again: 0,
  Hard: 3,
  Good: 6,
  Easy: 8,
}

export default function QuickStudyPage() {
  const { add } = usePoints()
  const { showToast } = useToast()

  const [i, setI] = React.useState(0)            // 何枚目か
  const [reveal, setReveal] = React.useState(false)
  const [earned, setEarned] = React.useState(0)  // このセッションの合計pt
  const [done, setDone] = React.useState(false)

  const card = SEED[i]

  const next = React.useCallback(() => {
    setReveal(false)
    if (i + 1 >= SEED.length) {
      setDone(true)
    } else {
      setI(i + 1)
    }
  }, [i])

  const onGrade = React.useCallback((g: keyof typeof SCORE) => {
    const pts = SCORE[g]
    setEarned((e) => e + pts)
    add(pts) // 全体ポイントにも反映
    showToast(`${g}評価で ${pts}pt 獲得！`)
    next()
  }, [add, next, showToast])

  // キーボードショートカットのハンドラ
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!reveal) {
        if (e.key === ' ' || e.key === 'Enter') {
          setReveal(true)
        }
        return
      }

      const gradeMap: Record<string, keyof typeof SCORE> = {
        '1': 'Again',
        '2': 'Hard',
        '3': 'Good',
        '4': 'Easy',
      }

      if (gradeMap[e.key]) {
        onGrade(gradeMap[e.key])
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [reveal, onGrade])

  // セッションの進捗（表示用）
  const progress = Math.round(((done ? SEED.length : i) / SEED.length) * 100)

  if (done) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">Quick Study</h1>
        <motion.div 
          className="overflow-hidden rounded-2xl border border-color-border bg-background/80 backdrop-blur shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.6 }}
        >
          {/* ヘッダー部分 */}
          <div className="border-b bg-gradient-to-br from-emerald-50 to-blue-50 px-6 py-8 dark:border-zinc-800 dark:from-emerald-950/30 dark:to-blue-950/30">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mb-2 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-bold">セッション完了！</h2>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-gray-600 dark:text-zinc-400"
            >
              お疲れ様でした！クイック学習でも着実に知識が身についています。
            </motion.div>
          </div>

          {/* 獲得ポイント */}
          <motion.div
            className="space-y-4 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500 dark:text-zinc-400">獲得ポイント</div>
                <div className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                  {earned} pt
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500 dark:text-zinc-400">学習カード</div>
                <div className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                  {SEED.length}枚
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="mt-6 flex gap-3">
              <Link 
                href="/decks" 
                className="group/button flex flex-1 items-center justify-center gap-2 rounded-xl border border-color-border bg-background/80 backdrop-blur px-4 py-3 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:text-gray-900 hover:shadow-md active:shadow-sm dark:text-zinc-400 dark:hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5V7A2.5 2.5 0 0011 4.5H4.262c.1-.596.386-1.096.778-1.488A2.25 2.25 0 017.25 2h6.5a2.25 2.25 0 012.238 1.012z" />
                  <path fillRule="evenodd" d="M2.75 6.5a2.25 2.25 0 012.25-2.25h6.5a2.25 2.25 0 012.25 2.25v6.5a2.25 2.25 0 01-2.25 2.25h-6.5a2.25 2.25 0 01-2.25-2.25v-6.5z" />
                </svg>
                デッキを探す
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-100/50 to-white/50 opacity-0 transition-opacity group-hover/button:opacity-100 dark:from-white/5 dark:to-gray-400/5" />
              </Link>
              <button
                className="action-button group/button relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-md transition-all hover:shadow-lg active:shadow-sm"
                onClick={() => { setI(0); setReveal(false); setEarned(0); setDone(false) }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                </svg>
                もう一度
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 transition-opacity group-hover/button:opacity-100 mix-blend-overlay" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Quick Study</h1>

      {/* 進捗バー */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-black transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-gray-500">{i + 1} / {SEED.length}</p>

      {/* カード */}
      <motion.div 
        className="rounded-2xl border border-color-border bg-background/80 backdrop-blur p-8 shadow-lg hover:shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <p className="font-numeric text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{card.front}</p>

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
              <p className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100" style={{ letterSpacing: '-0.02em' }}>{card.back}</p>
              {card.example && (
                <p className="border-l-2 border-gray-200 pl-4 text-[15px] leading-relaxed text-gray-600 dark:border-zinc-700 dark:text-zinc-400">
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
              className="mt-4 text-[15px] font-medium leading-relaxed text-gray-500 dark:text-zinc-400"
            >
              答えを見るには「Reveal」を押すか、スペースキーを押してください
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

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
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                キーボードショートカット: 1: Again / 2: Hard / 3: Good / 4: Easy
              </p>
            </div>
          )}
        </div>
    </section>
  )
}

