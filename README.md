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
- What-if シミュレーション: 新カード追加による 7d 先負荷 (Peak / Median) への影響を即時計算。Chain (1/3/7 等) モード・早期失敗 (Again) 簡易モデル・Time Load (推定所要分) を表示。

## 技術

- Next.js 15.5（App Router, Turbopack）/ React 19
- TailwindCSS / lucide-react / next-themes
- 型: TypeScript

## What-if / Time Load / 早期失敗モデル 概要 (Phase 1.30A)

Profile ページの「What-if」から追加新カード数を入力すると 7 日間のレビュー負荷変化をシミュレートします。

表示指標:

- Peak / Median: 7 日内最大・中央値
- Peak Δ%, Peak(+fails): 早期失敗 (Again) 再注入を考慮したピーク再計算（Day2 に集約）
- Exp Again: Week1 新カード * Again率 (2%〜55% clamp)。サンプル不足 (>=40 必要) 時 fallback rate 使用
- Time Load: 直近反応時間サンプル (p95 除外) の中央値 * 件数 / 60 を 0.1 分丸め。Peak Min / W1 Min / 日別分布
- Chain Summary: 初期間隔プリセット (例 1/3/7) による Week1/2 再出現件数合計 (<= horizon 内)

バッジ色: 赤=負荷増 / 緑=負荷減 / 灰=変化小 / 黄=注意 (Again件数など)

## 検証スクリプト (what-if test)

シミュレーションロジック単体検証用スクリプトがあります:

```bash
npx ts-node scripts/whatif-test.ts
```

出力: 各シナリオ (単発 / Chain プリセット / horizon 差異) の Peak, Peak(+fails), 期待 Again 件数, 推定所要分 (Peak Min / Week1) を JSON で列挙。

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
