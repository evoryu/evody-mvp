type Props = { params: { id: string } }

export default function DeckDetailPage({ params }: Props) {
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
