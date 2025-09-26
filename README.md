# evody — 学びをゲーム化するSNS

Next.js 15 + App Router + TypeScript + Tailwind のMVP。  
**Tasks / Points / Profile / Quick Study / Decks** を実装済み。

## 主な機能

- Tasks: 追加/一覧/完了。完了でポイント加算（所要時間に比例, min=5, max=50）
- Points: ヘッダーに表示。localStorage永続化（`evody:points`）
- Profile: ユーザー名保存、アバター（画像 or イニシャル）、ポイント/レベル、streak表示
- Quick Study: 1分クイズ（Reveal→Again/Hard/Good/Easy）でポイント付与
- Decks: 一覧/詳細/学習ページ（ダミーデータ）
- Dark Mode: `next-themes` による切替（ThemeToggle）

## 技術

- Next.js 15.5（App Router, Turbopack）/ React 19
- TailwindCSS / lucide-react / next-themes
- 型: TypeScript

## 起動方法

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build
```

詳しい仕様や設計については `/docs` フォルダを参照してください：

- [アーキテクチャ](./docs/ARCHITECTURE.md)
- [ルーティング](./docs/ROUTES.md)
- [状態管理](./docs/STATE.md)
- [ポイント仕様](./docs/POINTS.md)
- [UIガイド](./docs/UI_GUIDE.md)
