'use client'

import React from 'react'
import { usePoints } from '@/app/points-context'

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

  const [i, setI] = React.useState(0)            // 何枚目か
  const [reveal, setReveal] = React.useState(false)
  const [earned, setEarned] = React.useState(0)  // このセッションの合計pt
  const [done, setDone] = React.useState(false)

  const card = SEED[i]

  const next = () => {
    setReveal(false)
    if (i + 1 >= SEED.length) {
      setDone(true)
    } else {
      setI(i + 1)
    }
  }

  const onGrade = (g: keyof typeof SCORE) => {
    const pts = SCORE[g]
    setEarned((e) => e + pts)
    add(pts) // 全体ポイントにも反映
    next()
  }

  // セッションの進捗（表示用）
  const progress = Math.round(((done ? SEED.length : i) / SEED.length) * 100)

  if (done) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">Quick Study</h1>
        <div className="rounded-xl border bg-white p-6 space-y-3">
          <p className="text-lg font-semibold">セッション完了！</p>
          <p className="text-gray-600">獲得ポイント：<span className="font-bold">{earned}</span> pt</p>
          <div className="flex gap-3">
            <a href="/decks" className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100">デッキを探す</a>
            <button
              className="rounded-xl bg-black px-4 py-2 text-sm text-white"
              onClick={() => {
                setI(0); setReveal(false); setEarned(0); setDone(false)
              }}
            >
              もう一度
            </button>
          </div>
        </div>
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
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-3xl font-bold tracking-tight">{card.front}</p>

        {reveal ? (
          <div className="mt-4 space-y-2">
            <p className="text-xl">{card.back}</p>
            {card.example && <p className="text-gray-600 text-sm">例）{card.example}</p>}
          </div>
        ) : (
          <p className="mt-4 text-gray-500">答えを見るには「Reveal」を押してください</p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {!reveal ? (
            <button
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100"
              onClick={() => setReveal(true)}
            >
              Reveal
            </button>
          ) : (
            <>
              <GradeButton label="Again" onClick={() => onGrade('Again')} />
              <GradeButton label="Hard"  onClick={() => onGrade('Hard')}  />
              <GradeButton label="Good"  onClick={() => onGrade('Good')}  />
              <GradeButton label="Easy"  onClick={() => onGrade('Easy')}  />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function GradeButton({ label, onClick }: { label: 'Again' | 'Hard' | 'Good' | 'Easy', onClick: () => void }) {
  const style =
    label === 'Again' ? 'border-gray-300'
    : label === 'Hard' ? 'border-amber-500'
    : label === 'Good' ? 'border-emerald-600'
    : 'border-blue-600'
  return (
    <button
      className={`rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 ${style}`}
      onClick={onClick}
      title={`+${SCORE[label]}pt`}
    >
      {label}
    </button>
  )
}
