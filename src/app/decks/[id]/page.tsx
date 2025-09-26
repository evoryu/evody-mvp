type Props = { params: { id: string } }

export function DeckDetailPage({ params }: Props) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Deck Detail: {params.id}</h1>
      <p className="text-gray-600">枚数・タグ・作者などを表示予定</p>
      <a href={`/study/${params.id}`} className="inline-block rounded-xl bg-black px-5 py-2 font-medium text-white">
        学習を開始
      </a>
    </section>
  )
}
import { DECKS, countCards } from '@/lib/decks'

export default function DecksPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Decks</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {DECKS.map(d => (
          <li key={d.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <a href={`/decks/${d.id}`} className="text-lg font-semibold hover:underline">
                  {d.name}
                </a>
                {d.description && (
                  <p className="mt-1 text-sm text-gray-600">{d.description}</p>
                )}
                {d.tags && (
                  <div className="mt-2 flex flex-wrap gap-1 text-xs text-gray-500">
                    {d.tags.map(t => <span key={t} className="rounded-full border px-2 py-0.5">#{t}</span>)}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500">{countCards(d.id)} 枚</div>
            </div>
            <div className="mt-3">
              <a href={`/study/${d.id}`} className="rounded-lg bg-black px-4 py-2 text-sm text-white">
                学習を開始
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
