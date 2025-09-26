type Props = { params: { id: string } }

export function DeckDetailPage({ params }: Props) {
  const deck = DECKS.find(d => d.id === params.id)
  if (!deck) return null

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{deck.name}</h1>
        <p className="text-[15px] text-gray-600 dark:text-gray-400">
          {deck.description || 'デッキの説明がまだありません'}
        </p>
      </div>

      <div className="task-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">デッキ情報</h2>
            <p className="text-gray-600 dark:text-gray-400">カード枚数：{countCards(deck.id)}枚</p>
          </div>
          <a href={`/study/${params.id}`} className="action-button inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium">
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
      </div>
    </section>
  )
}
import { DECKS, countCards } from '@/lib/decks'

export default function DecksPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">デッキ一覧</h1>
        <p className="text-[15px] text-gray-600 dark:text-gray-400">
          全てのデッキ一覧から、学習したいデッキを選んで学習を始めましょう
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {DECKS.map(d => (
          <li key={d.id} className="task-card group rounded-xl border p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <a 
                    href={`/decks/${d.id}`} 
                    className="text-lg font-semibold tracking-tight hover:underline"
                  >
                    {d.name}
                  </a>
                  {d.description && (
                    <p className="text-[15px] text-gray-600 dark:text-gray-400">
                      {d.description}
                    </p>
                  )}
                </div>
                <div className="task-input rounded-lg px-3 py-1 text-sm">
                  {countCards(d.id)}枚
                </div>
              </div>

              {d.tags && (
                <div className="flex flex-wrap gap-1.5">
                  {d.tags.map(t => (
                    <span 
                      key={t} 
                      className="task-input rounded-lg px-2.5 py-1 text-xs font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <a 
                href={`/study/${d.id}`} 
                className="action-button group/button relative z-30 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M3.196 12.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 12.87z" />
                  <path d="M3.196 8.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 8.87z" />
                  <path d="M10.38 1.103a.75.75 0 00-.76 0l-7.25 4.25a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.76 0l7.25-4.25a.75.75 0 000-1.294l-7.25-4.25z" />
                </svg>
                学習を開始
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
