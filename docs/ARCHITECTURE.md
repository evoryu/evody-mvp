# Architecture

## Stack

- Next.js 15 (App Router), React 19
- TailwindCSS, next-themes, lucide-react
- 状態: React useState + Context。MVP段階では global store なし

## フォルダ構成（抜粋）

- `src/app/layout.tsx` … 全体レイアウト（Header/Footer/Theme/PointsProvider）
- `src/app/tasks/page.tsx` … タスク機能（localStorage保存）
- `src/app/profile/page.tsx` … ユーザープロファイル（名前/アバター/points/level/streak）
- `src/app/study/quick/page.tsx` … クイック学習
- `src/app/decks/page.tsx`, `src/app/decks/[id]/page.tsx` … デッキ一覧/詳細
- `src/app/study/[deckId]/page.tsx` … デッキ学習
- `src/components/points-badge.tsx`, `src/components/avatar.tsx`, `src/components/theme-toggle.tsx`
- `src/lib/decks.ts` … ダミーデータ（Deck, Card）と取得関数

## 主要フロー

- **PointsContext** (`src/app/points-context.tsx`)
  - `points:number`, `add(delta)`, `reset()`
  - `localStorage('evody:points')` に永続化
- **Tasks**
  - 追加→一覧→チェックで `toggleDone(id)`
  - ポイント計算は **イベントハンドラ側で `add()` 呼ぶ（Strict Mode二重加算防止）**
- **Quick Study / Study**
  - Reveal→評価（Again/Hard/Good/Easy）で `SCORE` に応じポイント加算
  - データは `src/lib/decks.ts` のダミーを使用
