'use client'

import React from 'react'
import { usePoints } from '../points-context'

type Task = {
  id: string
  title: string
  subject: string
  minutes: number
  done: boolean
}

export default function TasksPage() {
  const { add } = usePoints()
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

  const toggleDone = (id: string) => {
    let delta = 0
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t
        const nowDone = !t.done
        if (nowDone && !t.done) delta += 10
        if (!nowDone && t.done) delta -= 10
        return { ...t, done: nowDone }
      })
      queueMicrotask(() => {
        if (delta) add(delta)
      })
      return next
    })
  }

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>

      {/* 追加フォーム */}
      <form onSubmit={addTask} className="rounded-xl border bg-white p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="タイトル（例：英単語30個）"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="科目（例：英語）"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <input
            className="rounded-lg border px-3 py-2"
            placeholder="所要（分）"
            inputMode="numeric"
            value={minutes}
            onChange={e => {
              const v = e.target.value
              setMinutes(v === '' ? '' : Number(v.replace(/\D/g, '')))
            }}
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-black px-5 py-2 font-medium text-white"
        >
          追加
        </button>
      </form>

      {/* 一覧 */}
      <ul className="space-y-3">
        {tasks.length === 0 && (
          <li className="text-gray-500">まだタスクがありません。上のフォームから追加してね。</li>
        )}
        {tasks.map(t => (
          <li key={t.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5"
                  checked={t.done}
                  onChange={() => toggleDone(t.id)}
                />
                <div>
                  <p className={`font-semibold ${t.done ? 'line-through text-gray-400' : ''}`}>
                    {t.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t.subject || '—'} ・ {t.minutes ? `${t.minutes}分` : '—'}
                  </p>
                </div>
              </label>
              <button
                onClick={() => removeTask(t.id)}
                className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100"
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
