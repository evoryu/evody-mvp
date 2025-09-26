type Props = { params: { deckId: string } }

export default function StudySessionPage({ params }: Props) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Study: {params.deckId}</h1>
      <div className="rounded-xl border bg-white p-4">
        ここに1枚ずつ出題 → Reveal → 評価ボタン（Again/Hard/Good/Easy）を実装していきます
      </div>
    </section>
  )
}
