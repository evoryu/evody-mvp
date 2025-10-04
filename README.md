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
- 学習量シミュレーター: 新カード追加による 7日先負荷 (最大/日 / 中央値) を即時計算。追加パターンモード・初期再挑戦の簡易モデル・学習時間を表示。

## 技術

- Next.js 15.5（App Router, Turbopack）/ React 19
- TailwindCSS / lucide-react / next-themes
- 型: TypeScript

## 学習量シミュレーター / 学習時間 / 初期再挑戦モデル 概要 (Phase 1.30A)

Profile ページの「学習量シミュレーター」から追加カード数を入力すると 7 日間のレビュー負荷変化をシミュレートします。

表示指標:

- 最大/日 / 中央値/日: 7 日内最大・中央値
- 最大/日 変化%・最大/日(+再): 初期再挑戦 (再挑戦率) 再注入を考慮した最大/日再計算（Day2 集約簡易モデル）
- 再挑戦見込み: Week1 新カード \* 再挑戦率 (2%〜55% clamp)。サンプル不足 (>=40) 時 (暫定値) レート
- 学習時間: 直近反応時間サンプル (p95 トリム) 中央値 \* 件数 / 60 を 0.1分丸め。最大/日(分) / 1週合計(分) / 日別分布
- 追加パターンサマリー: 初期間隔プリセット (例 1/3/7) による Week1/2 再出現件数合計 (<= horizon 内)

バッジ色: 赤=負荷増 / 緑=負荷減 / 灰=変化小 / 黄=注意 (再挑戦件数など)

## 検証スクリプト (what-if test)

シミュレーションロジック単体検証用スクリプトがあります:

```bash
npx ts-node scripts/whatif-test.ts

# 機械処理しやすい JSON Lines (1行=1レコード) 出力
npx ts-node scripts/whatif-test.ts --jsonl > whatif.jsonl
```

通常モードは人間可読なブロック JSON。`--jsonl` 指定時は各シナリオを 1 行 JSON にしてストリーム処理や jq / grep / BigQuery 取り込みなどに利用しやすくしています。

出力フィールド例: `mode` (single|chain), `preset`, `horizon`, `added`, `peakBefore/After`, `peakDelta`, `peakWithFails`, `expectedAgain`, `timeLoad.peakMin`, `timeLoad.week1Total` など。

## 開発ユーティリティ

型チェックのみ:

```bash
npm run typecheck
```

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
 - [実験(Experiment)概要](./docs/EXPERIMENTS.md)
 - [実験イベント送信エンドポイント設定](./docs/EXPERIMENTS_ENDPOINT.md)

### 実験テストの実行

実験アナリティクスのスモークテストをローカルで一括実行できます。

```bash
npm run test:experiments
```

送信先を変更したい場合（プレビュー/本番等）、環境変数で上書き可能です（未設定時は `/__exp_exposure`）。

```powershell
$env:NEXT_PUBLIC_EXP_EVENTS_ENDPOINT = "https://example.test/exp-events"; npm run dev
```
