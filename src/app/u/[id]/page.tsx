type Props = { params: { id: string } }

export default function UserPage({ params }: Props) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">User: {params.id}</h1>
      <p className="text-gray-600">プロフィール・公開デッキ一覧・支援ボタン等を表示予定</p>
      <ul className="space-y-2">
        <li className="rounded-xl border bg-white p-4">公開デッキ（仮）</li>
      </ul>
    </section>
  )
}
