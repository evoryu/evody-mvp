'use client'

import React from 'react'
import { usePoints } from '../points-context'
import { useToast } from '../toast-context'


type Task = {
  id: string
  title: string
  subject: string
  minutes: number
  done: boolean
}

export default function TasksPage() {
  const { add } = usePoints()
  const { showToast } = useToast()
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [title, setTitle] = React.useState('')
  const [subject, setSubject] = React.useState('')
  const [minutes, setMinutes] = React.useState<number | ''>('')

  // localStorage から復元
  React.useEffect(() => {
    const raw = localStorage.getItem('evody:tasks')
    if (raw) setTasks(JSON.parse(raw))
  }, [])

  // 保存
  React.useEffect(() => {
    localStorage.setItem('evody:tasks', JSON.stringify(tasks))
  }, [tasks])

  const addTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const t: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      subject: subject.trim(),
      minutes: Number(minutes) || 0,
      done: false,
    }
    setTasks(prev => [t, ...prev])
    setTitle('')
    setSubject('')
    setMinutes('')
  }

const pointsFor = (m: number) => Math.max(5, Math.min(50, Math.floor((m || 0) / 5)))

const toggleDone = (id: string) => {
  // 1) まず現在のタスクから変化前の状態を取得
  const target = tasks.find(t => t.id === id)
  if (!target) return

  const nowDone = !target.done
  const pts = pointsFor(target.minutes)
  const delta = nowDone ? pts : -pts

  // 2) タスク状態を更新（ここではポイント加算しない）
  setTasks(prev =>
    prev.map(t => (t.id === id ? { ...t, done: nowDone } : t))
  )

  // 3) 今日の達成数ログ（完了にするときだけ +1）
  if (nowDone) {
    const key = 'evody:daily'
    const raw = localStorage.getItem(key)
    const daily = raw ? (JSON.parse(raw) as Record<string, number>) : {}
    const k = new Date().toISOString().slice(0, 10)
    daily[k] = (daily[k] || 0) + 1
    localStorage.setItem(key, JSON.stringify(daily))
  }

  // 4) 最後にポイントを加算/減算（イベントハンドラ側なので二重にならない）
  add(delta)
  if (nowDone) {
    showToast(`タスク完了で ${pts}pt 獲得！`)
  }
}

  const removeTask = (id: string) => {
    setTasks((prev: Task[]) => prev.filter(t => t.id !== id))
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>

      {/* 追加フォーム */}
      <form onSubmit={addTask} className="task-card rounded-xl border p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="form-field"
            placeholder="タイトル（例：英単語30個）"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        {/* subject */}
          <input
            className="form-field"
            placeholder="科目（例：英語）"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        {/* minutes */}
          <input
            className="form-field"
            placeholder="所要（分）"
            inputMode="numeric"
            value={minutes}
            onChange={e => {
              const v = e.target.value
              setMinutes(v === '' ? '' : Number(v.replace(/\D/g, '')))
            }}
          />
        </div>
        <button type="submit" className="action-button rounded-xl px-5 py-2 font-medium">
          追加
        </button>
      </form>

      {/* 一覧 */}
      <ul className="space-y-3">
        {tasks.length === 0 && (
          <li className="text-[var(--c-text-muted)]">まだタスクがありません。上のフォームから追加してね。</li>
        )}
        {tasks.map(t => (
          <li key={t.id} className="task-card rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5"
                  checked={t.done}
                  onChange={() => toggleDone(t.id)}
                />
                <div>
                  <p className={`font-semibold ${t.done ? 'line-through text-[var(--c-text-disabled)]' : ''}`}>
                    {t.title}
                  </p>
                  <p className="text-sm text-[var(--c-text-muted)]">
                    {t.subject || '—'} ・ {t.minutes ? `${t.minutes}分` : '—'}
                  </p>
                </div>
              </label>
              <button
                onClick={() => removeTask(t.id)}
                className="btn-secondary px-3 py-1 text-sm"
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
