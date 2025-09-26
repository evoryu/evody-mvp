'use client'

import React, { use } from 'react'             // ← 追加：use をインポート
import { usePoints } from '@/app/points-context'
import { getDeck, getDeckCards } from '@/lib/decks'

type Props = { params: Promise<{ deckId: string }> } // ← params は Promise に

const SCORE = { Again: 0, Hard: 3, Good: 6, Easy: 8 } as const
type Grade = keyof typeof SCORE

export default function StudySessionPage({ params }: Props) {
  const { deckId } = use(params)                // ← ここで unwrap
  const deck = getDeck(deckId)
  const cards = getDeckCards(deckId)
  const { add } = usePoints()

  const [i, setI] = React.useState(0)
  const [reveal, setReveal] = React.useState(false)
  const [earned, setEarned] = React.useState(0)
  const [done, setDone] = React.useState(false)

  if (!deck || cards.length === 0) {
    return <p className="text-red-600">デッキが見つからないか、カードがありません。</p>
  }

  const card = cards[i]
  const next = () => {
    setReveal(false)
    if (i + 1 >= cards.length) setDone(true)
    else setI(i + 1)
  }
  const onGrade = (g: Grade) => {
    const pts = SCORE[g]
    setEarned(e => e + pts)
    add(pts)
    next()
  }
  const progress = Math.round(((done ? cards.length : i) / cards.length) * 100)

  if (done) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">{deck.name}</h1>
        <div className="rounded-xl border bg-white p-6 space-y-3">
          <p className="text-lg font-semibold">セッション完了！</p>
          <p className="text-gray-600">獲得ポイント：<span className="font-bold">{earned}</span> pt</p>
          <div className="flex gap-3">
            <a href="/decks" className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100">デッキ一覧へ</a>
            <button
              className="rounded-xl bg-black px-4 py-2 text-sm text-white"
              onClick={() => { setI(0); setReveal(false); setEarned(0); setDone(false) }}
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
      <h1 className="text-2xl font-bold">{deck.name}</h1>

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-black transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-gray-500">{i + 1} / {cards.length}</p>

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
            <button className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setReveal(true)}>
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

function GradeButton({ label, onClick }: { label: 'Again'|'Hard'|'Good'|'Easy'; onClick: () => void }) {
  const style =
    label === 'Again' ? 'border-gray-300'
    : label === 'Hard' ? 'border-amber-500'
    : label === 'Good' ? 'border-emerald-600'
    : 'border-blue-600'
  return (
    <button
      className={`rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 ${style}`}
      onClick={onClick}
      title={`+${{Again:0,Hard:3,Good:6,Easy:8}[label]}pt`}
    >
      {label}
    </button>
  )
}
