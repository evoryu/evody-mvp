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

## グレースケール運用ポリシー（gray / zinc）

目的: コードベースでの無秩序な `gray-*` / `zinc-*` 乱用を避け、視覚的階層と役割で統一する。

| 用途                               | Light (主)                  | Dark (主)                   | 説明                            |
| ---------------------------------- | --------------------------- | --------------------------- | ------------------------------- |
| ページ/背景 (`--c-bg`)             | `white`                     | `zinc-950`                  | 画面全体の基礎レイヤー          |
| サブ背景 (`--c-bg-subtle`)         | `gray-50`                   | `zinc-900`                  | セクション / サイド領域         |
| サーフェス/カード (`--c-surface`)  | `white`                     | `zinc-900`                  | カード / モーダルの主ボックス   |
| サーフェスAlt (`--c-surface-alt`)  | `zinc-50`                   | `zinc-800`                  | 入れ子・ホバーで少し浮かせる    |
| ボーダー標準 (`--c-border`)        | `gray-200`                  | `zinc-800`                  | 通常の区切り線                  |
| ボーダー強調 (`--c-border-strong`) | `zinc-300`                  | `zinc-700`                  | ホバー時 / コンテナ強調         |
| テキスト主 (`--c-text`)            | `gray-900`                  | `zinc-50`                   | 見出し / 主要本文               |
| テキスト副 (`--c-text-secondary`)  | `gray-600`                  | `zinc-400`                  | 補助説明文                      |
| テキスト弱 (`--c-text-muted`)      | `gray-500`                  | `zinc-500`                  | メタ情報 / ラベル               |
| 非アクティブ/デコイ                | `gray-400`                  | `zinc-600`                  | 無効・プレースホルダ            |
| インタラクティブテキスト           | `gray-500 → hover:gray-900` | `zinc-400 → hover:white`    | ナビゲーション / アイコンボタン |
| グラデーションベース               | `from-gray-500 to-gray-700` | `from-zinc-700 to-zinc-900` | アバター等（トークン化予定）    |

ルール:

1. 構造（背景/ボーダー/カード）= Zinc 系（ダークで自然な階調を維持）。
2. テキストとインタラクティブ要素 = Lightでは Gray 系 / Dark では Zinc 系へスイッチ。
3. 影・透過ガラス効果には `bg-white/80` + `backdrop-blur`（Darkは `black/60`）。
4. 同一ブロック内で Gray と Zinc を混ぜない（例: ボタン内部で背景=白 + テキスト=zinc-600 は避ける → `gray-600` に統一）。
5. Hover/Active は階調1〜2段階のみ変化。彩度や色相は変更しない。

### Tailwind 直接指定からトークン化への移行指針

- 既存: `border-gray-200` → 将来: `border-[var(--c-border)]`（必要に応じて `@layer utilities` で `.border-default` を定義）
- 既存: `text-gray-600` → `text-[var(--c-text-secondary)]`
- 既存: カード: `bg-white border-gray-200` → `bg-[var(--c-surface)] border-[var(--c-border)]`

段階的移行: まず変数を `globals.css` に導入 → 影響の少ないコンポーネント（Toast, ThemeToggle, PointsBadge）→ ページ単位 → 汎用ユーティリティ抽出。

### 非推奨パターン（検出対象）

- `text-zinc-500` (Light モードでの本文) → `text-gray-600` を使用。
- `border-zinc-300` (Light) → `border-gray-200` または `--c-border`。
- `bg-zinc-50` と `text-gray-600` の混在（構造=Zinc・本文=Gray を跨ぐケースは可能な限り避ける。必要ならカード分割）。

### 今後の改善予定

- `.btn`, `.card`, `.input` ユーティリティレイヤーでトークン利用抽象化。
- グラデーション: `--grad-avatar-start`, `--grad-avatar-end` 追加予定。
- コントラスト自動チェックスクリプト（簡易）導入。

---

## グラデーション運用ガイド

### 目的

意味のない都度調整（`bg-gradient-to-r from-emerald-500 ...` のコピペ）を排除し、役割ベースの再利用と一貫性、将来的なブランドトーン調整容易性、そして Text / Icon の可読性（コントラスト）を担保するために CSS カスタムプロパティ化しています。

### トークン一覧（light / dark 両対応）

（実際の値は `globals.css` 参照）

| トークン             | 用途（意味階層）                                           |
| -------------------- | ---------------------------------------------------------- |
| `--grad-accent`      | 主要行動（Primary Call To Action） / Restart / Reveal など |
| `--grad-accent-alt`  | 代替強調（セカンダリアクション / ナビ強調）                |
| `--grad-accent-soft` | ソフト背景装飾 / 薄い帯グラデーション                      |
| `--grad-success`     | 成功状態（ポイント獲得完了 / 完了カード群）                |
| `--grad-warning`     | 警告（期限切れ注意 / 復習推奨）                            |
| `--grad-danger`      | 危険/破壊系（削除・リセットなど）                          |
| `--grad-info`        | 情報 / 補助ヒント / インフォカード                         |
| `--grad-neutral`     | 装飾用の控えめ背景（統計枠など）                           |

必要最小限のみを導入し「色相増殖」を防止。新規追加したい場合は: 1) 既存と意味が重複しないか 2) ダーク/ライト両方で十分なコントラストか を検証した上で PR 化。

### 使用パターン

1. ボタン / インタラクティブ: インライン style で `background: var(--grad-accent)` のように適用。
2. 装飾オーバーレイ: 擬似要素や ::before に設定し不透明度を下げて柔らかい層を追加。
3. カードヘッダー: `background: var(--grad-info)` + 下層にシンプルなサーフェス (`--c-surface`) を組み合わせる。
4. アイコンマスク: `background: var(--grad-success); -webkit-background-clip: text; color: transparent;` でブランド感のあるタイトル演出（濫用注意）。

### 実装スタイル指針

Tailwind の任意値クラス (`bg-[var(--grad-accent)]`) は一部ビルド最適化や future purge で壊れるリスクがあるため、次のいずれかで統一:

```tsx
<button
  style={{ background: 'var(--grad-accent)' }}
  className="text-white ... ..."
>
  Start
</button>
```

もしくは必要なら専用ユーティリティを `@layer utilities` で追加:

```css
.bg-grad-accent {
  background: var(--grad-accent);
}
```

（現状はインライン方式を推奨: ツリーシェイク安全 & 直感的）

### Reveal / Grade ボタン例（Before → After）

Before:

```tsx
<button className="bg-gradient-to-r from-blue-600 to-cyan-500 ...">
  Reveal
</button>
```

After:

```tsx
<button
  style={{ background: 'var(--grad-accent)' }}
  className="reveal-button ..."
>
  Reveal
</button>
```

### 状態ボタン vs 意味付け

| 状態               | 推奨グラデーション        | 備考                         |
| ------------------ | ------------------------- | ---------------------------- |
| Primary 行動       | `--grad-accent`           | 最も重要な次アクション       |
| Secondary (境界付) | プレーン背景 + `--c-text` | 目立たせ過ぎない             |
| Success / 完了     | `--grad-success`          | アイコンやバッジにも再利用可 |
| Danger / 破壊      | `--grad-danger`           | 削除・リセット強調           |
| Info / 補助        | `--grad-info`             | タグ・軽い案内背景           |

### コントラスト & アクセシビリティ

テキストは原則 `text-white`（dark でも white のまま）+ 微オーバーレイでホバー/アクティブ視認性を調整。
Hover 時に彩度/色相を変えず、`brightness()` や白レイヤー透過 (`bg-white/10`) で一段階差を出す。
Contrast チェック: `node scripts/contrast-check.js --min=4.5` を追加ベリファイとして利用可（主要テキストを測る際は背景を固定計測）。

### Do / Don't

**Do**

- 役割に基づいた最小セットの再利用
- インライン style で token 指定（安全）
- トークン値変更のみで全体トーン調整

**Don't**

- その場の感覚で `from-emerald-500 to-sky-500` など新規組み合わせを直書き
- グラデーション上にさらに別グラデーション overlay（ノイズ増）
- 状態意味のないランダムな color cycling

### 拡張フロー（新トークン要求時）

1. 既存 token で代替できない具体的ユースケースを Issue 化
2. Light / Dark でのスクリーンショットまたはカラー値提示
3. コントラスト (WCAG) チェック結果添付
4. `globals.css` への追加 + このガイド更新 + 対象コンポーネント差分 PR

### マイグレーションチェックリスト

- [ ] すべての `bg-gradient-to-` を grep して token 化検討
- [ ] `GradeButton` / Reveal / Restart で `var(--grad-*)` 使用済
- [ ] 新規ボタン追加時に token 未使用ならレビューで指摘

### 将来タスク候補

- Elevation (影) 量と組み合わせた "semantic prominence scale" ドキュメント化
- Avatar 用ソフトグラデーション (`--grad-avatar`) の導入
- ダッシュボードカード背景の微細グラデーション統一

---
