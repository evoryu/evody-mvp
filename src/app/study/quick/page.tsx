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
          className="overflow-hidden rounded-2xl border bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
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
                className="flex-1 rounded-xl border px-4 py-3 text-center text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                デッキを探す
              </Link>
              <button
                className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition-all hover:bg-gray-800 hover:shadow-lg dark:bg-white dark:text-black dark:hover:bg-gray-100"
                onClick={() => { setI(0); setReveal(false); setEarned(0); setDone(false) }}
              >
                もう一度
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
        className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-900/20"
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
            <button
              className="rounded-xl border-2 border-gray-900 bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              onClick={() => setReveal(true)}
            >
              Reveal
            </button>
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

