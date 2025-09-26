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
export const getDeckCards = (deckId: string) => CARDS.filter(c => c.deckId === deckId)

export const countCards = (deckId: string) => getDeckCards(deckId).length
