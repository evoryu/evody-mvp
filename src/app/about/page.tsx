import Link from "next/link"

export default function About() {
  return (
    <section className="space-y-6">
      {/* ヘッダー部分 */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          evody とは
        </h1>
  <p className="text-lg tracking-wide leading-relaxed text-[var(--c-text-secondary)] dark:text-[var(--c-text)] [text-wrap:balance]">
          evody は、学習を楽しく継続できる学習SNSです。タスクを達成してポイントを貯めながら、みんなと一緒に成長しましょう。ゲーム感覚で学習を継続できます。
        </p>
      </div>

      {/* MVPの特徴 カード */}
  <div className="task-card group relative overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-xl">
        <div className="relative z-10 p-6">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--c-text)]">
            MVPの特徴
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            <FeatureItem
              icon="👋"
              text="簡単なタスク管理から始めましょう"
            />
            <FeatureItem
              icon="✨"
              text="達成するとポイントが貯まります"
            />
            <FeatureItem
              icon="🎯"
              text="プロフィールで進捗を確認できます"
            />
          </div>
        </div>
        <CardGradient />
      </div>

      {/* 今後の展開 カード */}
  <div className="task-card group relative overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-xl">
        <div className="relative z-10 p-6">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--c-text)]">
            今後の展開
          </h2>
          <ul className="mt-4 grid gap-3 text-base text-[var(--c-text-secondary)] dark:text-[var(--c-text-secondary)]">
            <FutureItem
              icon="🔑"
              text="Google/GitHub でのログイン"
            />
            <FutureItem
              icon="💫"
              text="問題の投稿・共有機能"
            />
            <FutureItem
              icon="🏆"
              text="ランキングシステム"
            />
          </ul>
        </div>
        <CardGradient />
      </div>

      {/* アクションボタン */}
      <Link
        href="/decks"
        className="btn-secondary group/button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
        <span>デッキを選んで学習を始める</span>
      </Link>
    </section>
  )
}

// 共通コンポーネント
function CardGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/10 dark:to-white/0" />
  )
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-blue-50 text-[var(--c-text)] dark:from-emerald-100/50 dark:to-blue-100/50">
        {icon}
      </span>
  <p className="text-base leading-relaxed text-[var(--c-text-secondary)] dark:text-[var(--c-text-secondary)]">
        {text}
      </p>
    </div>
  )
}

function FutureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="flex items-center gap-3">
  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-blue-50 text-sm text-[var(--c-text)] dark:from-emerald-100/50 dark:to-blue-100/50">
        {icon}
      </span>
      {text}
    </li>
  )
}