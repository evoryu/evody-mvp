// デッキ & カードのダミーデータ（あとでDBに差し替えOK）

export type Deck = {
  id: string
  name: string
  tags?: string[]
  authorId: string
  description?: string
}
export type Card = {
  id: string
  deckId: string
  front: string
  back: string
  example?: string
}

export const DECKS: Deck[] = [
  { id: 'toeic-basic', name: 'TOEIC Basic 100', tags: ['toeic', 'basic'], authorId: 'u1',
    description: 'TOEIC 基本頻出語を100語に厳選' },
  { id: 'daily-phrases', name: 'Daily Phrases', tags: ['daily', 'phrase'], authorId: 'u1',
    description: '日常会話でよく使うフレーズ集' },
  { id: 'verbs-core', name: 'Core Verbs', tags: ['verb'], authorId: 'u2',
    description: '基本動詞の意味と例文' },
]

export const CARDS: Card[] = [
  // toeic-basic (一部だけ)
  { id: 't1', deckId: 'toeic-basic', front: 'efficient', back: '効率的な', example: 'An efficient process saves time.' },
  { id: 't2', deckId: 'toeic-basic', front: 'maintain', back: '維持する', example: 'We maintain servers regularly.' },
  { id: 't3', deckId: 'toeic-basic', front: 'determine', back: '決定する', example: 'We must determine the cause.' },
  // daily-phrases
  { id: 'd1', deckId: 'daily-phrases', front: 'How’s it going?', back: '調子どう？' },
  { id: 'd2', deckId: 'daily-phrases', front: 'Sounds good.', back: 'いいね。' },
  // verbs-core
  { id: 'v1', deckId: 'verbs-core', front: 'attempt', back: '試みる', example: 'We attempted to fix it.' },
  { id: 'v2', deckId: 'verbs-core', front: 'consider', back: '考慮する', example: 'Consider the pros and cons.' },
]

export const getDeck = (id: string) => DECKS.find(d => d.id === id) || null
/**
 * ユーザー上書きカード（localStorage 保管）
 * キー: evody:cards:<deckId>
 */
const LS_PREFIX = 'evody:cards:'

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

export function getUserCards(deckId: string): Card[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(LS_PREFIX + deckId)
    if (!raw) return []
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const toStr = (v: unknown): string | undefined => {
      if (typeof v === 'string') return v
      if (typeof v === 'number' || typeof v === 'boolean') return String(v)
      return undefined
    }
    const out: Card[] = []
    for (const x of arr as unknown[]) {
      if (typeof x !== 'object' || x == null) continue
      const r = x as Record<string, unknown>
      const id = toStr(r.id) ?? ''
      const front = toStr(r.front) ?? ''
      const back = toStr(r.back) ?? ''
      const example = toStr(r.example)
      if (!id || !front || !back) continue
      out.push({ id, deckId: toStr(r.deckId) ?? deckId, front, back, example })
    }
    return out
  } catch {
    return []
  }
}

export function setUserCards(deckId: string, cards: Card[]) {
  if (!isBrowser()) return
  try {
    const sanitized = cards.map(c => ({ ...c, deckId }))
    localStorage.setItem(LS_PREFIX + deckId, JSON.stringify(sanitized))
  } catch {}
}

/**
 * ベースカード + ユーザー上書きカードをマージ（id が同一ならユーザー側で上書き）
 */
export const getDeckCards = (deckId: string) => {
  const base = CARDS.filter(c => c.deckId === deckId)
  const user = getUserCards(deckId)
  if (user.length === 0) return base
  const map = new Map<string, Card>()
  for (const c of base) map.set(c.id, c)
  for (const c of user) map.set(c.id, { ...c, deckId })
  return Array.from(map.values())
}

export const countCards = (deckId: string) => getDeckCards(deckId).length

/**
 * アップサート（id が一致するものは上書き、無ければ追加）
 */
export function upsertUserCards(deckId: string, newCards: Omit<Card, 'deckId'>[]) {
  const current = getUserCards(deckId)
  const map = new Map<string, Card>()
  for (const c of current) map.set(c.id, c)
  for (const nc of newCards) {
    map.set(nc.id, { ...nc, deckId })
  }
  setUserCards(deckId, Array.from(map.values()))
}

/**
 * CSV 文字列生成（ヘッダ付）: id,front,back,example
 */
export function exportDeckToCSV(deckId: string): string {
  const rows = getDeckCards(deckId)
  const esc = (s: string | undefined) => {
    const v = s ?? ''
    // ダブルクォートと改行/カンマが含まれる場合はクォートしてエスケープ
    if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"'
    return v
  }
  const lines = ['id,front,back,example']
  for (const r of rows) {
    lines.push([esc(r.id), esc(r.front), esc(r.back), esc(r.example)].join(','))
  }
  return lines.join('\n')
}

/**
 * 1行のCSVを安全にsplit（簡易）
 * ダブルクォート内のカンマは無視。ダブルクォートは二重にエスケープ。
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { // エスケープされた quote
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else {
      if (ch === ',') {
        result.push(cur)
        cur = ''
      } else if (ch === '"') {
        inQuotes = true
      } else {
        cur += ch
      }
    }
  }
  result.push(cur)
  return result
}

export type ParsedCsvCard = { id: string; front: string; back: string; example?: string }

/**
 * CSV を配列にパース。ヘッダ必須: id,front,back,(example?)
 */
export function parseDeckCsv(csvText: string): ParsedCsvCard[] {
  const lines = csvText.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = splitCsvLine(lines[0]).map(s => s.trim().toLowerCase())
  const idx = {
    id: header.indexOf('id'),
    front: header.indexOf('front'),
    back: header.indexOf('back'),
    example: header.indexOf('example'),
  }
  if (idx.id < 0 || idx.front < 0 || idx.back < 0) {
    throw new Error('CSVヘッダは id,front,back,(example) が必要です')
  }
  const out: ParsedCsvCard[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const id = (cols[idx.id] ?? '').trim()
    const front = (cols[idx.front] ?? '').trim()
    const back = (cols[idx.back] ?? '').trim()
    const example = idx.example >= 0 ? (cols[idx.example] ?? '').trim() : undefined
    if (!id || !front || !back) continue
    out.push({ id, front, back, example: example || undefined })
  }
  return out
}

/** 詳細パース結果: 有効行と無効行の両方を返す */
export type CsvInvalidRow = { rowNumber: number; reason: string; raw: string }
export function parseDeckCsvDetailed(csvText: string): { valid: ParsedCsvCard[]; invalid: CsvInvalidRow[]; header: { hasExample: boolean } } {
  const linesAll = csvText.replace(/\r\n?/g, '\n').split('\n')
  const lines = linesAll.filter(l => l.trim().length > 0)
  if (lines.length === 0) return { valid: [], invalid: [], header: { hasExample: false } }
  const headerCols = splitCsvLine(lines[0]).map(s => s.trim().toLowerCase())
  const idx = {
    id: headerCols.indexOf('id'),
    front: headerCols.indexOf('front'),
    back: headerCols.indexOf('back'),
    example: headerCols.indexOf('example'),
  }
  if (idx.id < 0 || idx.front < 0 || idx.back < 0) {
    throw new Error('CSVヘッダは id,front,back,(example) が必要です')
  }
  const valid: ParsedCsvCard[] = []
  const invalid: CsvInvalidRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]
    const cols = splitCsvLine(raw)
    const id = (cols[idx.id] ?? '').trim()
    const front = (cols[idx.front] ?? '').trim()
    const back = (cols[idx.back] ?? '').trim()
    const example = idx.example >= 0 ? (cols[idx.example] ?? '').trim() : undefined
    const rowNumber = i + 1 // ヘッダ行を含む1始まり
    if (!id || !front || !back) {
      const miss = [!id && 'id', !front && 'front', !back && 'back'].filter(Boolean).join(', ')
      invalid.push({ rowNumber, reason: `必須列欠落: ${miss}`, raw })
      continue
    }
    valid.push({ id, front, back, example: example || undefined })
  }
  return { valid, invalid, header: { hasExample: idx.example >= 0 } }
}

/** CSVのID重複を検出 */
export function findCsvDuplicates(rows: ParsedCsvCard[]): string[] {
  const freq = new Map<string, number>()
  for (const r of rows) freq.set(r.id, (freq.get(r.id) ?? 0) + 1)
  return Array.from(freq.entries()).filter(([, c]) => c > 1).map(([id]) => id)
}

export type RowDiffStatus = 'new' | 'updated' | 'unchanged'
export function diffDeckCards(
  deckId: string,
  rows: ParsedCsvCard[],
  mode: 'replace' | 'merge'
): {
  perRow: Array<{ row: ParsedCsvCard; status: RowDiffStatus }>
  newIds: string[]
  updatedIds: string[]
  unchangedIds: string[]
  removedIds: string[]
  duplicates: string[]
} {
  const existing = getDeckCards(deckId)
  const exMap = new Map(existing.map(c => [c.id, c]))
  const perRow: Array<{ row: ParsedCsvCard; status: RowDiffStatus }> = []
  const newIds: string[] = []
  const updatedIds: string[] = []
  const unchangedIds: string[] = []
  for (const r of rows) {
    const ex = exMap.get(r.id)
    if (!ex) {
      perRow.push({ row: r, status: 'new' })
      newIds.push(r.id)
    } else if (ex.front !== r.front || ex.back !== r.back || (ex.example ?? '') !== (r.example ?? '')) {
      perRow.push({ row: r, status: 'updated' })
      updatedIds.push(r.id)
    } else {
      perRow.push({ row: r, status: 'unchanged' })
      unchangedIds.push(r.id)
    }
  }
  const incomingIds = new Set(rows.map(r => r.id))
  const removedIds = mode === 'replace' ? existing.filter(c => !incomingIds.has(c.id)).map(c => c.id) : []
  const duplicates = findCsvDuplicates(rows)
  return { perRow, newIds, updatedIds, unchangedIds, removedIds, duplicates }
}
