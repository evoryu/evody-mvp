> 注記: 命名移行に伴う “(旧: …)” 併記は Phase R4 で撤去済みです。現行UIではラベルは新名称のみを表示し、英語原語は必要に応じて Tooltip に残しています（履歴用途の記述は本ガイド内に保持）。

## InfoHint Tail \/ Positioning 設計メモ (Draft)

目的: 現行 `InfoHint` (Phase 1.35) はシンプルな上下/左右オーバーレイ配置のみ。今後テーブル内・スクロール境界・狭幅レイアウトでの視認性/位置衝突を最小化するため Tail(矢印) & 衝突回避ロジックを段階導入する。

### 要求整理

| 要件                   | 詳細                                           | 優先度 |
| ---------------------- | ---------------------------------------------- | ------ |
| Tail 表示              | ポップ位置と参照要素の関連性視覚強調           | M      |
| 衝突回避               | ビューポート外にはみ出す場合に反転/シフト      | H      |
| スクロールコンテナ対応 | overflow 親内でも正しい位置                    | H      |
| Portal 化              | stacking context 問題/overflow hidden 回避     | M      |
| 位置計算コスト最小     | requestAnimationFrame 内再配置 (resize/scroll) | M      |
| キーボード操作持続     | ESC / 再トグル / focus 移動で閉じる            | H      |
| アニメーション最小     | fade+transform (scale 0.96→1) 120ms            | L      |

### 実装段階案

1. Phase A: Portal + Tail (CSS ::after) + basic flip (top→bottom / left→right)
2. Phase B: smart shift: 水平位置はみ出し時に X 方向補正
3. Phase C: collision observer (ResizeObserver + scroll parent測定) によるリアクティブ再計算
4. Phase D: reduce-motion 対応 / prefers-reduced-motion でアニメーション抑制

### Phase B 追加要件 (Shift 実装)

| 項目                   | 内容                                                             | 許容コスト | 備考                    |
| ---------------------- | ---------------------------------------------------------------- | ---------- | ----------------------- |
| 水平シフト             | viewport 左右 4px マージン内に収める                             | O(1) 計算  | flip 後に適用           |
| 垂直再調整             | flip 後も上下がはみ出す極端ケース (超狭高さ) は最小 4px に clamp | 簡易       | 高度処理は Phase C      |
| allowShift prop        | デフォ true / false で無効化                                     | 無視可能   | SSR 安全                |
| rAF 二段測定           | 初期概算→実寸計測後再配置                                        | 2フレーム  | 既存 Phase A rAF を拡張 |
| スクロール/resize 追随 | passive イベントで再計算                                         | 軽量       | root scroll + capture   |
| テスト指標             | dev で panel.dataset.debug=coords? 追加 (任意)                   | 後続       | 今回省略                |

Phase B 完了予定ログ: 実装 & ガイド更新 (本セクション) に追記。

### API 拡張案

```ts
<InfoHint
  labelKey="infoDeckW1PT"
  placement="top" // top|bottom|left|right|auto
  portal // boolean: Portal へ描画
  allowFlip // デフォ true
  allowShift // デフォ true
  distance={6} // トリガとの距離 px
  tailSize={8}
/>
```

### Tail CSS スケッチ

```
.infohint-panel { position: absolute; }
.infohint-panel[data-placement="top"]::after {
  content: '';
  position: absolute; left: 50%; bottom: -4px;
  width: 8px; height: 8px; transform: translateX(-50%) rotate(45deg);
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-left: none; border-top: none; /* 重複線調整 */
}
```

### 衝突回避アルゴリズム (簡易 pseudocode)

```
const rect = trigger.getBoundingClientRect()
const panel = measure(panelSize)
let place = desired
if (place is top && rect.top - panel.h - distance < 0) place = 'bottom'
if (place is bottom && rect.bottom + panel.h + distance > vh) place = 'top'
// 横 overflow
let x = rect.left + rect.width/2 - panel.w/2
if (x < 4) x = 4
if (x + panel.w > vw - 4) x = vw - panel.w - 4
```

### ライブラリ比較 (導入判断)

| 方式          | Pros                           | Cons                                      |
| ------------- | ------------------------------ | ----------------------------------------- |
| 自前 (軽量)   | 依存ゼロ / 学習コスト低        | 高度ポップ配置 (複数軸) の保守コスト      |
| Floating UI   | 豊富な中間機能 / AutoPlacement | バンドルサイズ増 (~10kb gzip)             |
| Radix Tooltip | 品質高 / A11y 完備             | デザイン調整コスト / 全用途汎用化しづらい |

初期は自前 Phase A→B (最小) の後、要件増大で Floating UI 併用再検討。

### パフォーマンス考慮

- Pop 数 << 50 を想定 (テーブル列分程度) → 単純 rAF 再配置で十分
- IntersectionObserver で非表示領域は更新頻度抑制 (将来)

### アクセシビリティ拡張 TODO

- role="tooltip" 追加検討 (現状 dialog 互換) / label と説明文分離
- Tab フォーカス循環内保持 (長文化時のみ)
- ポップ内リンク/ボタン出現ケース (将来) に Escape 以外の close ボタン追加

### 次アクション

1. Phase A 実装: Portal + Tail + flip
2. Deck 週次テーブル全列適用 (既に完了) → Balance / Shape カードなどへ展開
3. Second Week Warning ブロックも InfoHint 化 (警告条件説明脱 title)

最終チェック (2025-09-29): InfoHint 第1段 & 旧語削除計画文書化まで型/ビルドエラーなし。
R1 完了 (2025-09-29): simulatorTitle / upcomingLoadTitle から “(旧: …)” を削除し、Tooltip 移行対象を次フェーズへ繰越。
R2 完了 (2025-09-29): peakPerDay / backlog* / balance* の “(旧: …)” 削除 + 新規 tooltip (tooltipPeakPerDay, tooltipBacklog, tooltipBalanceMetric) 追加。
R3 完了 (2025-09-29): earlyRetry / timeLoad / chainSummary の “(旧: …)” 削除 + 新規 tooltip (tooltipEarlyRetry, tooltipTimeLoad, tooltipChainSummary) 適用。
R4 完了 (2025-09-29): 全ラベル/tooltip から “(旧: …)” サフィックス完全撤去。関連 tooltip は簡潔形へ再整形 (Peak / Backlog / Balance 等)。ガイド内の計画節は履歴目的で保持し、運用は通常フェーズへ移行。
Phase B 完了 (2025-09-29): InfoHint portal + tail に水平/垂直シフト (allowShift) 追加。flip 後 viewport 4px マージン内へ自動調整。
Phase C 要件 (Collision Observer 強化予定):

| 項目                       | 内容                                             | 優先度 | 備考                          |
| -------------------------- | ------------------------------------------------ | ------ | ----------------------------- |
| ResizeObserver             | trigger / panel サイズ変化で即再配置             | H      | テキスト折返し / レスポンシブ |
| Scroll 親検出              | 最近接 overflow auto/scroll 親列挙               | H      | 部分スクロールでのズレ防止    |
| スクロール監視最適化       | 監視対象親のみ listener 登録                     | M      | パフォーマンス制御            |
| requestAnimationFrame 統合 | 多重イベントを1フレームにバッチ                  | H      | スパム防止                    |
| visibility guard           | 非表示( display:none )時は skip / 再表示で再計測 | M      | モーダル内再利用              |
| 最低マージン適応           | Phase B の 4px 維持                              | H      | 一貫性                        |
| オプトアウト prop          | allowObserve?: boolean (デフォ true)             | L      | 非常時停止                    |

Phase C 完了ログ: 実装時に追記予定。
Phase C 完了 (2025-09-29): ResizeObserver + scroll 親監視 + rAF バッチでリアクティブ再配置実装。`allowShift` 維持。portal=true & open 時のみ発火し軽量化。開発時デバッグ属性 (`data-debug-placement`, `data-debug-bounds`) 追加。

## 用語移行 “(旧: …)” 削除計画 (Draft)

狙い: 旧語併記フェーズを計画的に終了し UI ノイズと翻訳差分を削減。キー名は据え置き、値のみ更新で差分最小化。

### 対象ラベル (現状一部例)

| Key               | 現在値 (例)                                   | 最終想定値           | 備考                            |
| ----------------- | --------------------------------------------- | -------------------- | ------------------------------- |
| simulatorTitle    | 学習量シミュレーター (旧: What-if)            | 学習量シミュレーター | モーダルヘッダ                  |
| upcomingLoadTitle | 今後のレビュー負荷 (旧: Upcoming Review Load) | 今後のレビュー負荷   | ページセクション                |
| peakPerDay        | 最大/日 (Peak)                                | 最大/日              | Peak 原語は tooltip 移行        |
| week1Added        | Week1内追加                                   | Week1内追加          | 旧語なし (除外)                 |
| backlog           | 未消化 (旧: Backlog)                          | 未消化               | 英語 UI では Backlog に統一検討 |
| balance           | バランス (旧: Balance)                        | バランス             | 指標 tooltip に英語維持         |
| earlyRetry        | 初期再挑戦 (旧: Early Failures)               | 初期再挑戦           |                                 |
| timeLoad          | 学習時間 (旧: Time Load)                      | 学習時間             |                                 |
| chainSummary      | 追加パターンサマリー (旧: Chain Summary)      | 追加パターンサマリー |                                 |

### 判断基準

1. 原語露出がユーザー理解に寄与しない (学習済) → 削除
2. 原語が業界標準/検索助けになる (Peak / Backlog) → Tooltip へ移動
3. 指標カード/警告など二次要素は原語残存期間をさらに 1 フェーズ延長可 (誤認回避)

### スケジュール案 (2025-09-29 基準)

| フェーズ | 期間         | 対象                                | 対応                          |
| -------- | ------------ | ----------------------------------- | ----------------------------- |
| Phase R1 | ~ 2025-10-02 | simulatorTitle, upcomingLoadTitle   | 旧語削除 → Tooltip へ英語補完 |
| Phase R2 | ~ 2025-10-05 | peakPerDay, backlog, balance        | 英語原語を個別 tooltip に抽出 |
| Phase R3 | ~ 2025-10-08 | earlyRetry, timeLoad, chainSummary  | 旧語削除                      |
| Phase R4 | ~ 2025-10-10 | 残余 “(旧:)” 全削除 & UI ガイド更新 | 完了報告                      |

### 手順テンプレ

1. `labels.ts` 該当キー値から “ (旧: Xxxx)” 部分除去
2. 必要なら `info.*` または `tooltip*` キーへ英語原語補足文移動
3. UI スクリーンショット比較 (Before/After) 添付 (任意)
4. Changelog エントリ: `feat(i18n): remove legacy suffix from <keys>`

### リスク & 緩和

- ユーザーが旧語でのみ認識 → Tooltip/ガイドに旧語一覧 1 章保持 (一定期間)
- 部分削除による不統一 → フェーズごとに対象キー列挙 & 一括コミット

### 次アクション

- Phase R1 に向け `tooltip*` キーへ Peak / Upcoming Review Load 原語説明を整理
- `docs/TODO.md` に日付入りタスク追加

---

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

| 用途                               | Light (主)                  | Dark (主)                                     | 説明                            |
| ---------------------------------- | --------------------------- | --------------------------------------------- | ------------------------------- | --------------------------------- |
| ページ/背景 (`--c-bg`)             | `white`                     | `zinc-950`                                    | 画面全体の基礎レイヤー          |
| サブ背景 (`--c-bg-subtle`)         | `gray-50`                   | `zinc-900`                                    | セクション / サイド領域         |
| サーフェス/カード (`--c-surface`)  | `white`                     | `zinc-900`                                    | カード / モーダルの主ボックス   |
| サーフェスAlt (`--c-surface-alt`)  | `zinc-50`                   | `zinc-800`                                    | 入れ子・ホバーで少し浮かせる    |
| ボーダー標準 (`--c-border`)        | `gray-200`                  | `zinc-800`                                    | 通常の区切り線                  |
| ボーダー強調 (`--c-border-strong`) | `zinc-300`                  | `zinc-700`                                    | ホバー時 / コンテナ強調         |
| テキスト主 (`--c-text`)            | `gray-900`                  | `zinc-50`                                     | 見出し / 主要本文               |
| テキスト副 (`--c-text-secondary`)  | `gray-600`                  | `zinc-400`                                    | 補助説明文                      |
| テキスト弱 (`--c-text-muted`)      | `gray-500`                  | `zinc-500`                                    | メタ情報 / ラベル               |
| 非アクティブ/デコイ                | `gray-400`                  | `zinc-600`                                    | 無効・プレースホルダ            |
| インタラクティブテキスト           | `gray-500 → hover:gray-900` | `zinc-400 → hover:white`                      | ナビゲーション / アイコンボタン |
| グラデーションベース               | `from-gray-500 to-gray-700` | `from-zinc-700 to-zinc-900`                   | アバター等（トークン化予定）    |
| Upcoming Review Load               | Upcoming Review Load        | 今後のレビュー負荷 (旧: Upcoming Review Load) | 2週間                           | “(旧: Upcoming Review Load)” 削除 |

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

---

## セッションサマリ (2025-10-02)

### 今日行った主な変更

- InfoHint Phase C 実装 (ResizeObserver + scroll 親監視 + rAF バッチ + debug data 属性)。
- `UI_GUIDE.md` へ Phase C 完了ログ追記。
- `locale-toggle` import path 修正 (`layout.tsx`) により runtime モジュール解決エラー解消。
- Parity チェックスクリプトを正規表現簡易方式 → スプレッド対応 union ロジックへ改善し誤検出 (Missing 68) を解消。現在 JA/EN 98キー完全一致。
- `info-hint.tsx` にデバッグ属性 (`data-debug-placement`, `data-debug-bounds`) 追加。
  \n+### 追加: Reaction 指標実装 (2025-10-02)

- `analytics.ts` に `getReactionMetricSnapshot()` 実装。
  - 直近7日 (p50/p90) から改善率 `p50Trend7d` と `tailIndex7dAvg` 算出。
  - baseline: 過去6日有効日 (p50 サンプル>=5) の平均。today / baseline 不足時は 0。
  - tail index: p90/p50 有効日の平均 (日数<2 → fallback 1.6)。
  - データ欠損/SSR fallback を考慮し安全値返却。
- `BadgesProvider` でスタブ反応値を実データへ差替え。
- ドキュメント (`BADGES_SCHEMA.md`) に reaction 集計方法追記。
- 将来バッジ候補: `reaction_p50_improve (>=0.15)` / `tail_index_low (<=1.35)` など。

### 現在のステータス (Phase D 反映)

- i18n ラベル: JA/EN キー集合一致 (拡張は EN override 方式で安全)。
- Naming 旧語サフィックス除去: R1〜R4 完了、ガイド内履歴記録のみ残置。
- InfoHint: Phase A/B/C/D 完了 (reduce-motion 対応 + allowObserve prop)。
- Badges: JSON 外部化 + generate/validate スクリプト + runtime loader + 永続化 + 獲得トースト通知 + streak 実計算 + backlog snapshot 導入(nextDue<=now)。
- reduce-motion: `(prefers-reduced-motion: reduce)` でアニメ/トランジションを抑制。
- allowObserve=false 設定時: ResizeObserver / scroll 監視をスキップし軽量化。
- 型/ビルド: `npx tsc --noEmit` 実行で致命エラー出力なし (Next dev 起動済)。

### 残タスク候補 (優先順 / 更新後)

1. 英語自然化 (長めの日本語直訳的なものを簡潔英文化) - 例: `earlyRetryNote`, `assumptionChained`。
2. グラデーショントークン適用調査: grep(`bg-gradient-to-`) → 一覧化 & 置換計画。
3. Parity スクリプト強化: AST パース (acorn など) で将来の構造変更耐性向上。
4. Metrics naming cleanup: `expectedRetrys` → `expectedRetries` (キー名変更 + 影響調査)。
5. CI 追加案: `node scripts/check-label-parity.ts` を pre-commit / GitHub Actions。
6. InfoHint 高頻度環境ベンチ (100+配置) で allowObserve 効果測定 & ドキュ化。
7. Efficiency Score 調整パラ (midpoint/k) の設定外出し。

### 既知の軽微改善点メモ

- `UI_GUIDE.md` に debug 属性の使い方 (dev ヒント) セクションが未追加。
- InfoHint tail の色コントラスト (ダークモード) 微調整余地あり (枠線 α)。
- Time Load 計算説明 (`timeLoadNote`) を英語と日本語で構造揃える。

### 次回開始スニペット (覚書)

```
node scripts/check-label-parity.ts
# -> Parity OK を確認後 Phase D ブランチ作成例:
git checkout -b feat/infohint-phase-d
```

---

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

## Reaction Metrics Debug View (/dev/reaction)

目的: バッジ & 負荷予測に利用している反応時間統計 (p50Trend7d, tailIndex7dAvg) の生データ検証とチューニングを容易にする開発用ページ。

### 表示内容

| ブロック       | 説明                                                            |
| -------------- | --------------------------------------------------------------- |
| Summary        | p50Trend7d (改善率), TailIndex 平均, baseline p50, today p50    |
| Daily          | 直近7日の日別: samples / p50 / p90 / TailIndex(p90/p50)         |
| Interpretation | 指標算出ロジックと閾値目安 (安定=1.2–1.5, 1.6+ はばらつき高)    |
| Raw JSON       | `getReactionMetricSnapshot({includeDebug:true})` のそのまま出力 |

### 算出再掲 (実装基準)

- baselineP50: 過去6日で `samples >= 5` の日 p50 平均 (>=3 日必要)
- p50Trend7d: `(baseline - today) / baseline` (正=改善 / 負=悪化 / fallback 0)
- TailIndex 日次: p90/p50 (両方有効) / 平均は有効日>=2 必要 (不足→1.6)
- 欠損日: p50/p90/TI を `-` 表示し平均計算から除外

### 活用例

1. 閾値調整: 連続数日改善しても 0.10 程度しか動かない場合 → バッジ `reaction_p50_improve` の 0.15 しきい値見直し判断材料。
2. サンプル不足検出: samples が 5 未満連続 → UI 側に "暫定" バッジ抑制ロジック導入検討。
3. Tail Index 正規化準備: 小標本日を除外した平均が 1.55 近辺で安定するか観察。

### 改善アイデア（今後）

- 7→14日トグル (baseline window 比較)
- IQR / p95 など外れ値ヒント表示
- CSV エクスポート / クリップボードコピー

---

## 学習量シミュレーター (旧: What-if) & KPI バッジ (Phase 1.30A+ 拡張)

（主要ラベルは `src/lib/labels.ts` で集中管理。'(旧: …)' 併記期間終了後は値のみ更新で差分最小化。）

### コンポーネント分離

- `WhatIfDialog` を `Profile` ページ本体から独立 (`src/components/whatif-dialog.tsx`)
- 目的: 巨大 JSX の肥大化を防ぎ、モーダル内 UI (KPIバッジ / 折りたたみ) を再利用容易にする
- 依存: `KpiBadge`, `CollapsibleSection`, `CHAIN_PRESETS`

### KPI バッジアニメーション

- ライブラリ: `framer-motion`
- 仕様:
  - 初期: `opacity:0, scale:0.85` → 0.22s easeOut で `opacity:1, scale:1`
  - tone 変化時: `scale` を `[1,1.06,1]` に 0.28s パルス（過度な点滅抑止）
  - `layout` プロップで並び入替え時のスムーズさを保持
- 目的: 負荷差分を視覚的に軽く強調しつつ、視線負荷を増やしすぎない最小演出

### 折りたたみセクション

- `CollapsibleSection` 汎用化: Early Failures / Time Load / Chain Summary 共通
- Prop: `id, title, collapsed, onToggle, summary, small`
- アクセシビリティ: `aria-expanded`, `aria-controls` を親コンテナに付与

### 初期再挑戦モデル (旧: Early Failures)

- 再注入は Day2 集約の簡易近似。`再挑戦率 * Week1 新規` (clamp 2%〜55%)
- サンプル不足 (>=40 必要) で (暫定値) ラベル表示
- `最大復習件数/日 (+再)` を別バッジで表示（差分色付け）

### 学習時間 (見積) 指標 (旧: Time Load)

- 直近反応時間サンプル (p95 トリム後) の中央値を使用
- `件数 * medianSec / 60` → 0.1 分四捨五入
- 表示: `最大/日(分)`, `1週合計(分)`, 日別 `D0..D6` 分布 (バッジ風チップ)
- (暫定値) の場合はバッジ脚注で明示

### JSON Lines 検証出力

- `scripts/whatif-test.ts --jsonl` で 1 シナリオ 1 行 JSON
  - 機械処理: `jq -r '.title,.deltaPeak'` などで容易に抽出
  - 従来モード: 整形 JSON + 見出し

### デザイン意図まとめ

| 要素                            | 意図                   | 重点                         | 妨げない工夫                     |
| ------------------------------- | ---------------------- | ---------------------------- | -------------------------------- |
| KPI バッジ                      | 追加負荷の瞬時把握     | 色 + 短い遷移                | パルス幅を 1.06 に抑制           |
| 折りたたみ (Collapsible)        | 二次情報の情報密度制御 | 折りたたみ                   | 既定閉状態で初期ノイズ減         |
| 初期再挑戦 (旧: Early Failures) | リスク見積             | 再挑戦率＋最大復習件数再計算 | モデル簡易説明フッタ             |
| 学習時間 (旧: Time Load)        | 時間コストの把握       | 最大/日(分) / 1週合計(分)    | 0.1 分丸めで桁ノイズ回避         |
| JSONL 出力                      | 自動検証・統計         | ログ処理                     | オプションフラグで UI 表示と分離 |

### 今後の拡張アイデア

- バッジ差分を数値レンジに応じた subtle bar sparkline へ昇格 (例: 最大復習件数Before→After の横棒)
- 学習時間 (旧: Time Load) の信頼度指標 (サンプル n / IQR) を Tooltip 化
- 初期再挑戦 (旧: Early Failures) を Day2 固定→分散 (幾何列) モード比較トグル
- 学習量シミュレーター設定の shareable permalink (クエリシリアライズ)

### 旧語併記ポリシー (Naming Migration)

| 区分           | 旧語           | 新表示                                   | 併記期間 | 除去予定                            |
| -------------- | -------------- | ---------------------------------------- | -------- | ----------------------------------- |
| モーダル       | What-if        | 学習量シミュレーター (旧: What-if)       | 2週間    | 標準表示から "(旧: What-if)" 削除   |
| Peak           | Peak           | 最大/日 (Peak)                           | 2週間    | ラベルから (Peak) 削除 / Tooltip へ |
| Peak(+fails)   | Peak(+fails)   | 最大/日(+再)                             | 2週間    | 英語表現削除 / Tooltip へ           |
| Time Load      | Time Load      | 学習時間 (旧: Time Load)                 | 2週間    | “(旧: Time Load)” 部分削除          |
| Early Failures | Early Failures | 初期再挑戦 (旧: Early Failures)          | 2週間    | “(旧: Early Failures)” 削除         |
| Chain Summary  | Chain Summary  | 追加パターンサマリー (旧: Chain Summary) | 2週間    | “(旧: Chain Summary)” 削除          |

除去作業は `docs/TODO.md` に期日を追記し、完了後この表を履歴 (Changelog) に移す。ツールチップで英語原語を維持し検索性と学習コストを両立する。

---

## i18n スキャフォールド (Phase 1.32)

`src/lib/labels.ts` を単一オブジェクト `LABELS` から `STRINGS = { ja, en }` 構造へリファクタ。`getLabel(key, locale='ja')` で取得し、未知 `locale` / 欠損キーは ja フォールバック。

現状 `en` は ja の単純コピー（差分ゼロ）。将来部分的に英語 UI を有効化するときは `EN` 内の該当キーだけ上書きすれば良い。

### 追加キー (wave 2)

| Key                      | Label (ja)                            | 用途                   |
| ------------------------ | ------------------------------------- | ---------------------- |
| `colorsLegend`           | 色: 赤=負荷増 / 緑=負荷減 / 灰=変化小 | What-if KPI 凡例行     |
| `peakMinutesHint`        | ピーク日の推定所要分                  | ピーク分バッジ脚注     |
| `timeLoadFallback`       | 時間負荷: 暫定中央値                  | サンプル不足警告       |
| `allDecks`               | 全デッキ                              | デッキセレクト初期値   |
| `assumptionChained`      | 仮定: 追加パターン...                 | チェーンモード注釈     |
| `assumptionSingle`       | 仮定: Day1 のみ...                    | シングルモード注釈     |
| `chainDistributionShort` | Dist:                                 | チェーン分布短縮ラベル |
| `classificationLabel`    | 分類                                  | Before/After ボックス  |
| `retryRateShort`         | Rate                                  | 再挑戦率サマリー       |
| `earlyRetryNote`         | 簡易モデル: Week1...                  | Early Retry フッタ説明 |
| `timeLoadNote`           | 中央値(秒) \* 件数...                 | Time Load フッタ説明   |
| `beforeShort`            | Before                                | Before/After 凡例      |
| `afterShort`             | After                                 | Before/After 凡例      |
| `deltaNumberLegend`      | 数字=差分                             | 棒/スパーク凡例        |
| `sparklineTitle`         | スパークライン (Before→After)         | Sparkline 見出し       |
| `applyActionTitle`       | 実際に新カードを導入...               | 適用ボタン title       |
| `week1`                  | 1週目                                 | 各所 Week1 表示        |
| `week2`                  | 2週目                                 | Week2 表示             |
| `total`                  | 合計                                  | 集計ラベル             |
| `shape`                  | Shape                                 | 形状指標カード見出し   |
| `flatten`                | Flatten                               | 平準化指標値           |
| `top3Avg`                | Top3Avg                               | 平準化補助値           |

### 置換進捗

- WhatIfDialog: 主要 UI ラベル 100% 集中管理化
- Profile Upcoming Load セクション: Wave3 で詳細統計 / 警告 / テーブルヘッダ / フッタ / Raw トグル 含め 100% キー化完了

### Wave3 追加キー (Upcoming Load 詳細指標 / 警告 / テーブル)

| Key                          | Label (ja) / 用途概要               |
| ---------------------------- | ----------------------------------- |
| `secondWeekWarningIconTitle` | 2週目集中警告 (アイコン title)      |
| `backlogLegend`              | 未消化 (旧: Backlog) 凡例表示       |
| `backlogWarning`             | 未消化多め警告プレフィクス          |
| `balanceCardTitle`           | バランス (旧: Balance) カード見出し |
| `shiftLabel`                 | シフト 指標ラベル                   |
| `balanceLabelShort`          | 2週/1週 比率短縮ラベル              |
| `flattenLabelShort`          | Flatten 短縮 (平準化)               |
| `secondWeekWarningTitle`     | Second Week Warning 見出し (移行)   |
| `secondWeekWarningBody`      | 2週目集中説明本文                   |
| `deckWeekMetricsTitle`       | Deck Week Metrics (Top) 見出し移行  |
| `deckTableW1PT`              | W1 P/T ヘッダ                       |
| `deckTableW2PT`              | W2 P/T ヘッダ                       |
| `deckTableShift`             | Shift ヘッダ                        |
| `deckTableBalance`           | Balance ヘッダ                      |
| `deckTableFlat`              | Flat ヘッダ                         |
| `deckTableBacklog`           | Bkg ヘッダ                          |
| `deckTableBacklogPct`        | Bkg% ヘッダ                         |
| `deckMetricsFooter`          | デッキ週次ミニ指標説明文            |
| `upcomingLoadFooter`         | Upcoming Load 概要フッタ文          |
| `rawToggleLabel`             | Raw トグルボタンラベル              |

Wave3 完了により Upcoming Load セクション内のユーザー可視テキストは (一時的な旧語併記含め) すべて `labels.ts` 経由化。残課題は Tooltip / title 属性に残る定義文のキー化 (次フェーズ)。

---

## EN パイロット (Phase 1.34 Pilot)

目的: i18n インフラの実動確認と差分コスト最小化戦略の検証。現状は 15 キーのみ英語へ部分翻訳し、フォールバック/混在 UI の視認性を評価。

### 状態

| 区分                                                    | 進捗                      |
| ------------------------------------------------------- | ------------------------- |
| WhatIfDialog 主要ラベル                                 | 15 キー中 100% EN (pilot) |
| Upcoming Load 基本指標 (Peak/Median など)               | 主要一部 EN               |
| Upcoming Load 拡張 (Shift/Balance/Flatten/Backlog 説明) | ja のみ (fallback)        |
| Tooltip 長文定義                                        | 未翻訳 (次フェーズ)       |
| Deck Week Metrics テーブルヘッダ                        | ja のみ                   |
| フッタ/警告/凡例                                        | 一部 EN (Warning 見出し)  |

### 方針

1. Pilot 期間 (約 1〜2 日運用) では追加翻訳を急がず、欠損フォールバックが UX を阻害しないか観察。
2. 英語化優先度: (a) 見出し / ボタン → (b) 警告 / 指標カードタイトル → (c) テーブルヘッダ → (d) Tooltip 長文。
3. “(旧: …)” 除去前に EN も最終語彙を確定し、削除後は両言語で安定キー値 (差分=翻訳のみ) に固定。
4. 翻訳投入単位は 10〜20 キーごとの小さな PR で差分レビュー容易化。

### 運用メモ

- 欠損キー参照時は `ja` フォールバックするため 404 的な UI 崩壊は起きない。
- 一時的な混在 (英語タイトル + 日本語本文) を許容し、翻訳順序の柔軟性を優先。
- 翻訳レビューは英語ネイティブ観点よりも「指標定義が伝わる最小語彙」を優先し冗長説明は Tooltip へ分離。

### 次アクション候補 (Phase 1.35+)

- Tooltip 定義文を `info.*` 名前空間でキー化し EN 草案投入
- Deck テーブルヘッダ列をまとめて EN 化 (一括コミット)
- “(旧:)” suffix 削除予定日を `docs/TODO.md` へ記載 (削除 = 値差分のみ)
- InfoHint コンポーネント導入: title 属性依存を段階的に排除 (モバイル長押し/アクセシビリティ改善)

Rollback 戦略: `STRINGS.en` 内のパイロットキーを一括コメントアウト (もしくは ja 値コピー) で即時日本語戻し可。影響範囲は UI 文言のみでロジック非依存。

KPI: 翻訳 50 キー到達時点で 英語 UI スクリーンショット比較レビュー → 用語統一調整 (例: Balance vs Distribution) 実施。

---

※ Wave5 以降: 指標定義/長文 tooltip は `info.*` 名前空間キーへ段階的集約し、視覚/翻訳/アクセシビリティ差分を 1 ファイル化。

### InfoHint (Phase 1.35 partial)

軽量アクセシブルヒントコンポーネント `InfoHint` を導入。初期適用範囲は Deck Week Metrics テーブルヘッダ (W1/W2/Shift)。今後 Balance / Flatten / Backlog 系へ拡張し、`title` 属性依存を削減。利点: (1) モバイル長押し表示改善 (2) 翻訳差分の再レンダリング制御 (3) 将来ダーク/ライトテーマ内でのヒントスタイル統一。

### 次ステップ候補

1. Upcoming Load 14d 詳細統計 (Flatten, Balance, Shift 等) を `getLabel` 化 → en 対応容易化
2. Tooltip 説明文のキー化 (モデル注釈 / 指標定義)
3. locale 切替 UI (一時的に query param `?lang=en` で実装 -> 状況に応じて cookie)
4. “(旧: …)” 除去タイミングでキー値だけ変更 (UI 側コード変更無し)

---

## Wave3 完了サマリー (Phase 1.33)

目的: Upcoming Load 詳細指標(Shift/Balance/Flatten/Backlog) と 2週目集中警告、デッキ週次ミニテーブル、凡例/フッタ説明文を完全にキー化し、今後の i18n / 用語差し替えコストを O(1) にする。

成果:

- 19 キー追加 (`labels.ts`) + `profile/page.tsx` の該当文字列全面置換
- 二次週 (2週目集中) 警告・Backlog 警告がロジック変更なく多言語化準備完了
- 表ヘッダ / フッタ説明の分離によりテーブル列順変更や項目追加時の差分最小化
- Raw 表示トグルをキー化し、将来デバッグ表示切替文言再編容易化

残タスク (次フェーズ提案):

1. Tooltip / title 内の長文化説明を `info.*` 名前空間でキー化 (`secondWeekWarning.definition`, `balance.metric.definition` 等)
2. InfoHint コンポーネント導入: アイコン + Hover/Focus ポップ (`aria-describedby`) で一元化
3. locale 切替 MVP: `?lang=en` → `labels.ts` 内部で `searchParams.get('lang')` / `cookies()` 参照 (App Router) → 後続で UI トグル
4. 英語差分最小セット投入: まず主要ラベル 10 個だけ英語化しスクリーンショット比較
5. “(旧:)” 削除スケジュールを `docs/TODO.md` に日付入りで追記し実施 (キーの値変更のみ / コード無改変)

品質メモ:

- 追加キーはすべて ja に存在し en は現状ミラー; 欠損時フォールバック安全
- `profile/page.tsx` の title 属性に残る生文字列 (定義文) は Wave4 範囲

撤退容易性 (Rollback):

- 任意ラベルの即時再変更は `labels.ts` の 1 ファイル変更のみ
- 旧語併記撤去も値変更のみで commit diff が最小化

リスク低減策:

- 追加キー命名は用途粒度 (component/領域共通) ではなく表示内容意味基準で suffix 統一 (`deckTable*`, `secondWeekWarning*`)
- テーブル列追加時は `deckTable<ColumnKey>` 命名で拡張し衝突回避

---
