import Link from "next/link";

export default function About() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">evody とは</h1>

      <p className="text-gray-600">
        evody は、学習を「投稿・共有・ポイント」で楽しく継続できる学習SNSです。
        まずは小さなタスクを1つ追加し、達成でポイントが貯まる体験を目指します。
      </p>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">MVPのゴール</h2>
        <ul className="mt-2 list-disc pl-5 text-gray-700">
          <li>学習タスクの追加・一覧・達成チェック（ローカル状態）</li>
          <li>達成でポイント加算（仮）とヘッダーへの表示</li>
          <li>簡易プロフィール（表示のみ）</li>
        </ul>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">次の拡張予定</h2>
        <ul className="mt-2 list-disc pl-5 text-gray-700">
          <li>認証（Google/GitHub）</li>
          <li>DB接続（Supabase / Firebase）</li>
          <li>問題投稿・評価・ランキング</li>
        </ul>
      </div>

      <Link
        href="/"
        className="inline-block rounded-xl border px-5 py-3 font-medium hover:bg-gray-100"
      >
        ホームへ戻る
      </Link>
    </section>
  )
}
