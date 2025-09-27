'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/app/toast-context'
import { usePoints } from '@/app/points-context'
import { getDueReviews, logReview, getCardState, undoLastReview, introduceNewCards, getNewCardAvailability } from '@/lib/reviews'
import { saveEpisode } from '@/lib/episodes'
import { CARDS } from '@/lib/decks'
import { GradeButton } from '@/components/grade-button'

const SCORE = { Again: 0, Hard: 2, Good: 5, Easy: 7 } as const
export type Grade = keyof typeof SCORE

// Resolve card objects from due card ids (falling back if card removed)
function fetchDueCards(): { id: string; front: string; back: string; deckId?: string }[] {
  const dueIds = getDueReviews()
  return dueIds.map(id => {
    const card = CARDS.find(c => c.id === id)
    if (card) return card
    // fallback placeholder
    return { id, front: id, back: '(カード欠損)', deckId: undefined }
  })
}

export default function ReviewPage() {
  const { add } = usePoints()
  const { showToast } = useToast()
  // Hydration安定化: SSRでは localStorage/state 参照不可のため初期は空配列にし、マウント後に実データ取得
  const [cards, setCards] = React.useState<ReturnType<typeof fetchDueCards>>([])
  const [index, setIndex] = React.useState(0)
  const [reveal, setReveal] = React.useState(false)
  const [earned, setEarned] = React.useState(0)
  const lastPointsRef = React.useRef<number[]>([])
  const startedAtRef = React.useRef<number>(Date.now())
  const correctRef = React.useRef(0)
  const incorrectRef = React.useRef(0)
  // grade distribution for performance snapshot
  const gradesRef = React.useRef({ again: 0, hard: 0, good: 0, easy: 0 })
  const gradeHistoryRef = React.useRef<Grade[]>([]) // for undo
  // guidance (Hard / Again high) per session
  const [guidance, setGuidance] = React.useState<string | null>(null)
  const hintShownRef = React.useRef(false)
  // reaction time tracking
  const revealAtRef = React.useRef<number | null>(null)
  const totalReactMsRef = React.useRef(0)
  const reactCountRef = React.useRef(0)
  const reactSamplesRef = React.useRef<number[]>([]) // 個別反応時間(ms) 保持 (>=60s除外)

  // hasMounted フラグ (初回クライアントレンダーはSSRと同一=空として描画し、マウント後に差し替え)
  const [hasMounted, setHasMounted] = React.useState(false)
  React.useEffect(()=>{ setHasMounted(true); },[])

  React.useEffect(() => {
    const refresh = () => setCards(fetchDueCards())
    // 初回マウント時に取得
    refresh()
    window.addEventListener('evody:reviews:changed', refresh)
    return () => window.removeEventListener('evody:reviews:changed', refresh)
  }, [])

  React.useEffect(() => {
    if (cards.length === 0) {
      // try auto-introduce from all known cards
      const avail = getNewCardAvailability()
      if (avail.remainingToday > 0) {
        // pick first N not in state (introduceNewCards internally skips existing)
        const introducePool = CARDS.map(c=>c.id)
        introduceNewCards(introducePool.slice(0, avail.remainingToday))
        setCards(fetchDueCards())
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = cards[index]
  const total = cards.length

  const endSessionIfNeeded = React.useCallback(() => {
    const totalAnswered = correctRef.current + incorrectRef.current
    if (totalAnswered === 0) return
    const finishedAt = Date.now()
    // compute performance snapshot
    const g = gradesRef.current
    const total = g.again + g.hard + g.good + g.easy
    const againRate = total ? g.again / total : 0
    const denom = total - g.again
    const retention = denom > 0 ? (g.good + g.easy) / denom : 0
    const avgTimeMs = reactCountRef.current > 0 ? Math.round(totalReactMsRef.current / reactCountRef.current) : undefined
    // 百分位計算 (p50/p90) : サンプルが存在し閾値以内
    let p50TimeMs: number | undefined
    let p90TimeMs: number | undefined
    if (reactSamplesRef.current.length > 0) {
      const arr = [...reactSamplesRef.current].sort((a,b)=> a-b)
      const mid = (arr.length - 1) * 0.5
      const p50Index = Math.floor(mid)
      p50TimeMs = arr.length ? arr[p50Index] : undefined
      const p90Pos = (arr.length - 1) * 0.9
      const p90Index = Math.floor(p90Pos)
      p90TimeMs = arr.length ? arr[p90Index] : undefined
    }
    saveEpisode({
      kind: 'review',
      startedAt: startedAtRef.current,
      finishedAt,
      deckId: undefined,
      correct: correctRef.current,
      incorrect: incorrectRef.current,
      points: lastPointsRef.current.reduce((a,b)=>a+b,0),
      retention,
      againRate,
      grades: { ...g },
      avgTimeMs,
      // 後方互換: undefined は保存時 JSON から省略される
      // 型拡張は episodes.ts 側で追加予定
      p50TimeMs,
      p90TimeMs
    })
    // reset counters for next batch
    startedAtRef.current = Date.now()
    correctRef.current = 0
    incorrectRef.current = 0
    lastPointsRef.current = []
    gradesRef.current = { again: 0, hard: 0, good: 0, easy: 0 }
    gradeHistoryRef.current = []
    hintShownRef.current = false
    setGuidance(null)
    totalReactMsRef.current = 0
    reactCountRef.current = 0
    reactSamplesRef.current = []
    revealAtRef.current = null
    setEarned(0)
  }, [])

  const next = React.useCallback(() => {
    setReveal(false)
    revealAtRef.current = null
    if (index + 1 >= total) {
      endSessionIfNeeded()
      const refreshed = fetchDueCards()
      setCards(refreshed)
      setIndex(0)
    } else {
      setIndex(i => i + 1)
    }
  }, [index, total, endSessionIfNeeded])

  const onGrade = React.useCallback((g: Grade) => {
    if (!current) return
    let singleDelta: number | undefined
    if (revealAtRef.current) {
      const delta = Date.now() - revealAtRef.current
      if (delta >= 0 && delta < 60000) { // guard extreme values (>=60s outlier除外)
        totalReactMsRef.current += delta
        reactCountRef.current += 1
        reactSamplesRef.current.push(delta)
        singleDelta = delta
      }
      revealAtRef.current = null
    }
    const pts = SCORE[g]
    lastPointsRef.current.push(pts)
    setEarned(e => e + pts)
    add(pts)
  logReview(current.id, current.deckId, g, Date.now(), singleDelta)
    if (g === 'Again' || g === 'Hard') incorrectRef.current += 1; else correctRef.current += 1
    // grade distribution tracking
    switch (g) {
      case 'Again': gradesRef.current.again += 1; break
      case 'Hard': gradesRef.current.hard += 1; break
      case 'Good': gradesRef.current.good += 1; break
      case 'Easy': gradesRef.current.easy += 1; break
    }
    gradeHistoryRef.current.push(g)
    // guidance detection (one-time per session)
    if (!hintShownRef.current) {
      const dist = gradesRef.current
      const answered = dist.again + dist.hard + dist.good + dist.easy
      if (answered >= 5) {
        const struggleRatio = (dist.again + dist.hard) / answered
        const againRatio = dist.again / answered
        if (againRatio > 0.25) {
          setGuidance('Again率が高めです。記憶がまだ不安定かもしれません。ペースを少し落として確実に想起しましょう。')
          hintShownRef.current = true
          showToast('ヒント: Again率が高い → ペース調整を検討')
        } else if (struggleRatio > 0.4) {
          setGuidance('Hard/Again が多めです。集中が落ちているかカードが難しすぎる可能性。短い休憩や環境調整を挟むと retention が改善します。')
          hintShownRef.current = true
          showToast('ヒント: Hard/Again 多 → 休憩推奨')
        }
      }
    }
    showToast(`${g} 評価 +${pts}pt`)
    next()
  }, [current, add, next, showToast])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!current) return
      if (!reveal) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault(); setReveal(true); revealAtRef.current = Date.now()
        }
        return
      }
      const map: Record<string, Grade> = { '1': 'Again', '2': 'Hard', '3': 'Good', '4': 'Easy' }
      if (map[e.key]) onGrade(map[e.key])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [reveal, onGrade, current])

  // マウント後に本当に0枚なら "期限なし" メッセージ表示 (マウント前は表示しない → SSR/CSR 差分防止)
  if (hasMounted && cards.length === 0) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">Review</h1>
        <div className="rounded-xl border p-8 text-center text-sm text-[var(--c-text-secondary)]">
          期限が来ているカードはありません。
        </div>
      </section>
    )
  }

  const progress = Math.round(((index) / total) * 100)
  const state = current ? getCardState(current.id) : null

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Review</h1>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--c-progress-track)]" suppressHydrationWarning>
        <div className="h-full bg-[var(--c-progress-fill)] transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-[var(--c-text-muted)]" suppressHydrationWarning>{cards.length ? `${index + 1} / ${total}` : '...'}</p>

      <motion.div className="task-card relative overflow-hidden rounded-2xl border p-8 shadow-lg" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="flex items-start justify-between gap-4">
          <p className="font-numeric text-4xl font-bold tracking-tight" suppressHydrationWarning>{current ? current.front : ''}</p>
          {state && (
            <div className="rounded-lg border px-3 py-2 text-[10px] text-[var(--c-text-secondary)]">
              <div>interval: {state.interval.toFixed(2)}d</div>
              <div>ease: {(state.ease/1000).toFixed(2)}</div>
              <div>next: {new Date(state.nextDue).toLocaleDateString()}</div>
              {typeof state.difficulty === 'number' && <div>diff: {state.difficulty.toFixed(2)}</div>}
              {typeof state.stability === 'number' && <div>stab: {state.stability.toFixed(1)}d</div>}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {reveal ? (
            <motion.div key="answer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="mt-6 space-y-3">
              <p className="text-2xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>{current.back}</p>
            </motion.div>
          ) : (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 text-[15px] font-medium leading-relaxed text-[var(--c-text-muted)]">
              答えを見るには「Reveal」かスペースキー
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-8 flex flex-wrap gap-3">
          {!reveal ? (
            <motion.button onClick={() => { setReveal(true); revealAtRef.current = Date.now() }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="reveal-button group relative overflow-hidden rounded-xl px-8 py-3 text-sm font-medium shadow-lg">
              <span className="relative z-10 flex items-center gap-2">
                Reveal <span className="ml-1 opacity-60">[Space]</span>
              </span>
            </motion.button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <GradeButton label="Again" onClick={() => onGrade('Again')} />
                <GradeButton label="Hard" onClick={() => onGrade('Hard')} />
                <GradeButton label="Good" onClick={() => onGrade('Good')} />
                <GradeButton label="Easy" onClick={() => onGrade('Easy')} />
              </div>
              <p className="text-xs text-[var(--c-text-muted)]">1:Again / 2:Hard / 3:Good / 4:Easy</p>
            </div>
          )}
        </div>
      </motion.div>

      <div className="flex items-center justify-center gap-6">
        <div className="relative overflow-hidden rounded-2xl bg-[var(--c-surface-alt)] px-6 py-4">
          <div className="text-center">
            <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">獲得ポイント</div>
            <div className="mt-1 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{earned}</div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[var(--c-surface-alt)] px-6 py-4">
          <div className="text-center">
            <div className="text-xs font-medium tracking-wide text-[var(--c-text-secondary)]">残りカード</div>
            <div className="mt-1 text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{Math.max(total - (index+1),0)}</div>
          </div>
        </div>
        {lastPointsRef.current.length > 0 && (
          <button
            onClick={() => {
              const removed = undoLastReview()
              if (!removed) return
              const back = lastPointsRef.current.pop() || 0
              setEarned(e => e - back)
              add(-back)
              // revert counters (correct/incorrect & grade distribution)
              const lastGrade = gradeHistoryRef.current.pop()
              if (lastGrade) {
                if (lastGrade === 'Again' || lastGrade === 'Hard') incorrectRef.current = Math.max(0, incorrectRef.current - 1); else correctRef.current = Math.max(0, correctRef.current - 1)
                switch (lastGrade) {
                  case 'Again': gradesRef.current.again = Math.max(0, gradesRef.current.again - 1); break
                  case 'Hard': gradesRef.current.hard = Math.max(0, gradesRef.current.hard - 1); break
                  case 'Good': gradesRef.current.good = Math.max(0, gradesRef.current.good - 1); break
                  case 'Easy': gradesRef.current.easy = Math.max(0, gradesRef.current.easy - 1); break
                }
              }
              showToast('直前のレビューを取り消しました')
              // 最新 due を再取得し位置調整
              const refreshed = fetchDueCards()
              setCards(refreshed)
              setIndex(i => Math.min(i, Math.max(refreshed.length - 1, 0)))
              setReveal(false)
            }}
            className="rounded-xl border px-4 py-2 text-xs font-medium shadow-sm hover:bg-[var(--c-surface-alt)]"
          >Undo</button>
        )}
      </div>
      {guidance && (
        <div className="mx-auto max-w-xl rounded-xl border bg-[var(--c-surface-alt)] px-4 py-3 text-xs leading-relaxed text-[var(--c-text-secondary)] shadow-sm">
          <span className="font-semibold mr-2 text-[var(--c-text)]">ヒント</span>{guidance}
        </div>
      )}
    </section>
  )
}
