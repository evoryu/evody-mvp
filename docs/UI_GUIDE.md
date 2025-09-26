# UI Guide

## デザイン原則

- 余白: `max-w-5xl` 中央寄せ、カードは `rounded-2xl border shadow-sm`
- ダーク: `next-themes`（`dark:`ユーティリティを併用）
- リンク遷移: **必ず `next/link` の `<Link>` を使用**
- 進捗: 細いバー + 軽いトランジション
- フィードバック: 学習/完了時にはトースト提示予定（未実装）

## トースト

- 位置: 画面右下に固定 (`fixed bottom-4 right-4`)
- アニメーション: フェードイン/アウト + スライド（`transition-all`）
- ダークモード対応: `bg-white dark:bg-zinc-800`
- 複数表示: 下から上にスタック（最新が一番下）
- 表示時間: 2500ms
- デザイン:
  ```tsx
  <div className="rounded-lg bg-white px-4 py-2 shadow-lg dark:bg-zinc-800">
    <p className="text-sm font-medium dark:text-white">+8 pt</p>
  </div>
  ```

## コンポーネント

- `Avatar`: nameからイニシャル色生成。画像アップロードで上書き
- `ThemeToggle`: ダーク/ライト切替
- `PointsBadge`: ヘッダーにポイント表示（クライアント）
- `Toast`: フィードバック表示（右下固定、自動消去）
