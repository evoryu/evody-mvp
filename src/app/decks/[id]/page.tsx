"use client"

import * as React from 'react'
import { use } from 'react'
import { useToast } from '@/app/toast-context'
import {
  countCards,
  exportDeckToCSV,
  getDeck,
  getUserCards,
  setUserCards,
  upsertUserCards,
  parseDeckCsvDetailed,
  diffDeckCards,
  type ParsedCsvCard,
  type CsvInvalidRow,
  type Card,
} from '@/lib/decks'

type Props = { params: Promise<{ id: string }> }

export default function DeckDetailPage({ params }: Props) {
  const { id } = use(params)
  const deck = getDeck(id)
  const { showToast } = useToast()
  const forceRerender = React.useReducer((x: number) => x + 1, 0)[1]
  const [replaceAll, setReplaceAll] = React.useState(false)
  const [lastImport, setLastImport] = React.useState<{ rows: ParsedCsvCard[]; mode: 'replace'|'merge' } | null>(null)
  const [undoSnapshot, setUndoSnapshot] = React.useState<Card[] | null>(null)
  const [pending, setPending] = React.useState<{
    rows: ParsedCsvCard[]
    invalid: CsvInvalidRow[]
    duplicates: string[]
    diff: ReturnType<typeof diffDeckCards>
    mode: 'replace' | 'merge'
    fileName?: string
  } | null>(null)
  const [showAllRows, setShowAllRows] = React.useState(false)

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

  const handleFilePicked = React.useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseDeckCsvDetailed(text)
      const mode = replaceAll ? 'replace' : 'merge'
      const diff = diffDeckCards(id, parsed.valid, mode)
      setPending({
        rows: parsed.valid,
        invalid: parsed.invalid,
        duplicates: diff.duplicates,
        diff,
        mode,
        fileName: file.name,
      })
    } catch (e) {
      const msg = hasMessage(e) ? String(e.message) : '不明なエラー'
      showToast(`CSVの読み込みに失敗しました: ${msg}`)
    }
  }, [id, replaceAll, showToast])

  const applyPendingImport = React.useCallback(() => {
    if (!pending) return
    // 直前のユーザー上書きカードをスナップショット
    const snapshot = getUserCards(id)
    const rows = pending.rows
    if (pending.mode === 'replace') {
      setUserCards(id, rows.map(r => ({ ...r, deckId: id })))
    } else {
      upsertUserCards(id, rows.map(r => ({ id: r.id, front: r.front, back: r.back, example: r.example })))
    }
    setUndoSnapshot(snapshot)
    setLastImport({ rows, mode: pending.mode })
    setPending(null)
    forceRerender()
    const { newIds, updatedIds, removedIds } = pending.diff
    const extras = pending.invalid.length > 0 ? `（無効行 ${pending.invalid.length} 件はスキップ）` : ''
    const removedMsg = pending.mode === 'replace' && removedIds.length > 0 ? `、削除 ${removedIds.length}` : ''
    showToast(`取り込み完了: 新規 ${newIds.length}、更新 ${updatedIds.length}${removedMsg}${extras}`)
  }, [pending, id, forceRerender, showToast])

  const handleUndo = React.useCallback(() => {
    if (!undoSnapshot) return
    setUserCards(id, undoSnapshot)
    setUndoSnapshot(null)
    setLastImport(null)
    forceRerender()
    showToast('直前のインポートを取り消しました')
  }, [undoSnapshot, id, forceRerender, showToast])

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
                if (f) handleFilePicked(f)
                e.currentTarget.value = ''
              }}
              className="block text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-[var(--c-text-muted)]">ヘッダ: id,front,back,example（exampleは任意）</p>

          {lastImport && (
            <div className="mt-4 rounded-lg border p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  直近のインポート: <strong>{lastImport.rows.length}</strong> 枚 ({lastImport.mode === 'replace' ? '置き換え' : 'マージ'})
                </div>
                <button
                  className="text-[11px] underline text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
                  onClick={()=> setLastImport(null)}
                >非表示</button>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="text-[11px] text-[var(--c-text-secondary)]">
                    <tr>
                      <th className="px-2 py-1">id</th>
                      <th className="px-2 py-1">front</th>
                      <th className="px-2 py-1">back</th>
                      <th className="px-2 py-1">example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastImport.rows.slice(0,5).map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="px-2 py-1 font-mono text-xs">{r.id}</td>
                        <td className="px-2 py-1">{r.front}</td>
                        <td className="px-2 py-1">{r.back}</td>
                        <td className="px-2 py-1 text-[var(--c-text-muted)]">{r.example || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {undoSnapshot && (
                <div className="mt-3 text-right">
                  <button onClick={handleUndo} className="text-[12px] underline text-[var(--c-text-secondary)] hover:text-[var(--c-text)]">直前の取り込みを取り消す</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 確認モーダル */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPending(null)} />
          <div className="relative z-10 w-[min(720px,92vw)] rounded-xl border bg-[var(--c-bg)] p-5 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">CSV 取り込みの確認</h3>
            <p className="text-sm text-[var(--c-text-secondary)] mb-3">{pending.fileName || '選択ファイル'} を {pending.mode === 'replace' ? '置き換え' : 'マージ'} モードで取り込みます。</p>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] flex items-center gap-2">
                <input type="checkbox" className="scale-90" checked={showAllRows} onChange={e=> setShowAllRows(e.target.checked)} />
                全件表示
              </label>
              {(pending.invalid.length>0 || pending.duplicates.length>0) && (
                <button
                  className="text-[11px] underline text-[var(--c-text-secondary)] hover:text-[var(--c-text)]"
                  onClick={()=>{
                    try {
                      const lines = ['kind,rowNumber,id,reason,raw']
                      for (const iv of pending.invalid) {
                        const esc = (s: string)=> '"'+s.replaceAll('"','""')+'"'
                        lines.push(['invalid', String(iv.rowNumber), '', esc(iv.reason), esc(iv.raw)].join(','))
                      }
                      for (const d of pending.duplicates) {
                        lines.push(['duplicate', '', d, 'duplicate id', ''].join(','))
                      }
                      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = (pending.fileName || 'invalid') + '.invalid.csv'
                      document.body.appendChild(a)
                      a.click(); a.remove(); URL.revokeObjectURL(url)
                    } catch {}
                  }}
                >無効行レポートをCSVで保存</button>
              )}
            </div>
            <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="font-medium mb-1">バリデーション</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>有効行: {pending.rows.length}</li>
                  <li>無効行: {pending.invalid.length}</li>
                  <li>重複ID: {pending.duplicates.length}</li>
                </ul>
                {pending.invalid.length > 0 && (
                  <div className="mt-2 max-h-28 overflow-auto text-[12px]">
                    <div className="text-[var(--c-text-secondary)] mb-1">無効行の一部（最大5件）</div>
                    <ul className="space-y-1">
                      {pending.invalid.slice(0,5).map(iv => (
                        <li key={iv.rowNumber} className="line-clamp-1">
                          行 {iv.rowNumber}: {iv.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-medium mb-1">差分内訳</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>新規: {pending.diff.newIds.length}</li>
                  <li>更新: {pending.diff.updatedIds.length}</li>
                  <li className="text-[var(--c-text-secondary)]">変更なし: {pending.diff.unchangedIds.length}</li>
                  {pending.mode === 'replace' && (
                    <li>削除対象（置き換え）: {pending.diff.removedIds.length}</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] text-[var(--c-text-secondary)]">
                  <tr>
                    <th className="px-2 py-1">id</th>
                    <th className="px-2 py-1">front</th>
                    <th className="px-2 py-1">back</th>
                    <th className="px-2 py-1">example</th>
                    <th className="px-2 py-1">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllRows ? pending.diff.perRow : pending.diff.perRow.slice(0,5)).map(({ row, status, before }) => {
                    const fChanged = !!before?.front
                    const bChanged = !!before?.back
                    const eChanged = !!before?.example
                    return (
                      <tr key={row.id} className={`border-t ${status==='new' ? 'bg-emerald-50 dark:bg-emerald-950/20' : status==='updated' ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}`}>
                        <td className="px-2 py-1 font-mono text-xs">{row.id}</td>
                        <td className={`px-2 py-1 ${fChanged? 'bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-200/70 rounded' : ''}`} title={fChanged? `Before: ${before?.front ?? ''}`: undefined}>{row.front}</td>
                        <td className={`px-2 py-1 ${bChanged? 'bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-200/70 rounded' : ''}`} title={bChanged? `Before: ${before?.back ?? ''}`: undefined}>{row.back}</td>
                        <td className={`px-2 py-1 ${eChanged? 'bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-200/70 rounded' : 'text-[var(--c-text-muted)]'}`} title={eChanged? `Before: ${before?.example ?? ''}`: undefined}>{row.example || ''}</td>
                        <td className="px-2 py-1">
                          {status === 'new' && <span className="text-green-600">新規</span>}
                          {status === 'updated' && <span className="text-blue-600">更新</span>}
                          {status === 'unchanged' && <span className="text-[var(--c-text-secondary)]">変更なし</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-1 text-[10px] text-[var(--c-text-muted)] flex flex-wrap gap-3">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-950/20" />新規</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-950/20" />更新</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-transparent ring-1 ring-[var(--c-border)]/60" />変更なし</span>
            </div>

            {pending.duplicates.length > 0 && (
              <p className="mt-2 text-[12px] text-amber-600">注意: 重複IDが存在します。同一IDは後に出現した行で上書きされます。</p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="btn-secondary rounded-xl px-4 py-2" onClick={() => setPending(null)}>キャンセル</button>
              <button
                className="action-button rounded-xl px-4 py-2"
                onClick={applyPendingImport}
              >{pending.mode === 'replace' ? '置き換えを実行' : 'マージを実行'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
