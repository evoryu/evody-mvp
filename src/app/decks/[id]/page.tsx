"use client"

import * as React from 'react'
import { use } from 'react'
import { useToast } from '@/app/toast-context'
import { countCards, exportDeckToCSV, getDeck, parseDeckCsv, setUserCards, upsertUserCards } from '@/lib/decks'

type Props = { params: Promise<{ id: string }> }

export default function DeckDetailPage({ params }: Props) {
  const { id } = use(params)
  const deck = getDeck(id)
  const { showToast } = useToast()
  const forceRerender = React.useReducer((x: number) => x + 1, 0)[1]
  const [replaceAll, setReplaceAll] = React.useState(false)

  const hasMessage = (e: unknown): e is { message: unknown } =>
    typeof e === 'object' && e !== null && 'message' in e

  const handleExport = React.useCallback(() => {
    try {
      const csv = exportDeckToCSV(id)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${id}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast('CSVをダウンロードしました')
    } catch {
      showToast('CSVのエクスポートに失敗しました')
    }
  }, [id, showToast])

  const handleImport = React.useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const rows = parseDeckCsv(text)
      if (replaceAll) {
        setUserCards(id, rows.map(r => ({ ...r, deckId: id })))
      } else {
        upsertUserCards(id, rows.map(r => ({ id: r.id, front: r.front, back: r.back, example: r.example })))
      }
      forceRerender()
      showToast(`CSVから${rows.length}枚を${replaceAll ? '置き換え' : 'マージ'}しました`)
    } catch (e) {
      const msg = hasMessage(e) ? String(e.message) : '不明なエラー'
      showToast(`CSVの読み込みに失敗しました: ${msg}`)
    }
  }, [id, replaceAll, showToast, forceRerender])

  if (!deck) return <p className="text-red-600">デッキが見つかりません。</p>

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{deck.name}</h1>
        <p className="text-[15px] text-gray-600 dark:text-gray-400">
          {deck.description || 'デッキの説明がまだありません'}
        </p>
      </div>

      <div className="task-card rounded-xl border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">デッキ情報</h2>
            <p className="text-gray-600 dark:text-gray-400">カード枚数：{countCards(deck.id)}枚</p>
          </div>
          <a href={`/study/${id}`} className="action-button inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M3.196 12.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 12.87z" />
              <path d="M3.196 8.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 8.87z" />
              <path d="M10.38 1.103a.75.75 0 00-.76 0l-7.25 4.25a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.76 0l7.25-4.25a.75.75 0 000-1.294l-7.25-4.25z" />
            </svg>
            学習を開始
          </a>
        </div>

        {deck.tags && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">タグ</h3>
            <div className="flex flex-wrap gap-1.5">
              {deck.tags.map(tag => (
                <span 
                  key={tag}
                  className="task-input rounded-lg px-2.5 py-1 text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4 dark:border-[var(--c-border)]/50">
          <h3 className="mb-2 text-sm font-semibold text-[var(--c-text-secondary)]">CSV インポート / エクスポート</h3>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleExport} className="btn-secondary px-4 py-2 rounded-xl">
              CSVをダウンロード
            </button>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={replaceAll}
                onChange={(e) => setReplaceAll(e.target.checked)}
              />
              既存カードを置き換える
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImport(f)
                e.currentTarget.value = ''
              }}
              className="block text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-[var(--c-text-muted)]">ヘッダ: id,front,back,example（exampleは任意）</p>
        </div>
      </div>
    </section>
  )
}
