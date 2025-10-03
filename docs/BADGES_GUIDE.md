# Badges User Guide (Draft)

このドキュメントは利用者/PM/デザイナ向けにバッジ体系の「意味」「達成のコツ」「設計原則」をまとめています。実装仕様は `BADGES_SCHEMA.md` を参照してください。

---

## 1. バッジの目的

- 学習の継続 (Streak / Episodes)
- 品質向上 (定着率 / 反応時間改善 / ばらつき低減)
- 負荷の健全化 (Backlog 減少 / Flatten)
- 効率意識 (Efficiency Score)
- 早期の小勝ち (低 Tier の段階化) によるモチベーション維持

## 2. カテゴリ概要

| カテゴリ     | 主指標              | 典型指標例                            | 行動誘発意図                |
| ------------ | ------------------- | ------------------------------------- | --------------------------- |
| streak       | 連続日数            | streak_days                           | 毎日の最低 1 セッション確保 |
| backlog      | 未処理削減          | backlog_drop                          | 滞留カードの意識的消化      |
| reaction     | p50 改善 / ばらつき | reaction_p50_improve / tail_index_low | 集中と安定したテンポ        |
| retention    | 定着率%             | retention_rate                        | 質の高い復習サイクル維持    |
| (flatten)    | 負荷平準化          | flatten_low                           | 一極集中回避 / スパイク抑制 |
| (efficiency) | 効率スコア          | efficiency_score                      | 速度と精度の両立            |
| episodes     | セッション数        | episodes_total                        | 小さな再訪頻度の最適化      |

## 3. 命名原則 (要約)

詳細は `BADGES_SCHEMA.md` の「命名ガイドライン」節。MVP 基本ルール:

1. JP は「行動/結果 + 数値」短文化 (`未処理カード10件削減`)
2. EN は簡潔な Result Phrase (`Retention ≥90%`)
3. Tier 系列は閾値 5% 程度の意味差を維持
4. 曖昧語は閾値表で裏付け (`高い定着率`=90%)

## 4. 条件表示フォーマット

テンプレート + プレースホルダ `${n}` / `${d}` を locale ごとに差し替え。例:

```
condition_reaction_p50_improve: Improved median reaction time by ${n}%+
```

内部値 0.12 → 表示 `12%`。

## 5. 進捗の捉え方 (ユーザ向け Tips)

| バッジタイプ  | 途中指標例              | 進捗可視化案 (将来) | 改善アクション            |
| ------------- | ----------------------- | ------------------- | ------------------------- |
| Streak        | 現在 streak 日数        | ステップバー        | 毎日 1 枚でも開く習慣化   |
| Backlog       | (previous-current) 差分 | 目標との差ゲージ    | 集中クリア時間を確保      |
| Reaction 改善 | p50Trend7d (率)         | % バー              | 集中ブロック/分散復習調整 |
| Variability   | TailIndex (1.0~)        | 閾値ライン表示      | ノイズ時間帯を避ける      |
| Retention     | 7d Good+Easy %          | 線/閾値マーカー     | Again 多発カードを分析    |
| Flatten       | Flatten 値              | 1.0 基準線          | カード導入の偏り是正      |
| Episodes      | last7d 件数             | 目標件数バー        | 朝/夜の短時間セッション化 |

## 6. よくある質問 (FAQ)

**Q. 定着率がブレるのは?** 短期 (7日) ローリングなので日々のカード難度 mix で 2〜5pt 揺れます。トレンド平均を確認。

**Q. p50 改善率がマイナスになる?** 以前より反応が遅い状態。暗記/難度上昇か集中力低下。短時間の低負荷セッションを挟みペース再構築を。

**Q. Tail Index って?** 反応時間の不安定さ (高い=ばらつき大)。一定時間帯に集中/分散させるだけでも低下しやすいです。

## 7. ロードマップ (抜粋)

- Progress 可視化 (ゲージ / バー)
- 連鎖バッジ (前提条件を段階的に解放)
- レジェンド階層 (>95% retention など)
- 日次/週次 チャレンジ (repeatable true)
- Tag ベースフィルタ / URL クエリ保持

## 8. デザイン指針

| 原則           | 説明                       | 例                        |
| -------------- | -------------------------- | ------------------------- |
| Small Wins     | 小刻み達成で Dopamine      | Retention 85% / 90% / 95% |
| Clarity        | 条件は翻訳テンプレート統一 | `${n}%` など記法統一      |
| Low Friction   | JSON 追加のみで拡張        | 生成スクリプト + schema   |
| Honest Metrics | ノイズ過度集計を避ける     | 7d rolling / diff >=      |

## 9. 編集フロー (非開発者向け)

1. 既存 JSON をコピー
2. id / 閾値 / タイトル修正
3. `npm run validate:badges`
4. `npm run generate:badges`
5. プレビューで条件表示確認

## 10. 変更履歴参照

閾値や名称変更は `BADGES_CHANGELOG.md` へ追記。

## 11. 進捗バー表示仕様 (MVP 実装)

Achievements ページでは一部条件に進捗バーを表示します。

### 11.1 対応条件タイプ

| 条件 type            | 種類            | 算出式                       | 正規化     | 備考                               |
| -------------------- | --------------- | ---------------------------- | ---------- | ---------------------------------- |
| streak_days          | 正方向          | currentStreak / value        | clamp 0..1 | 達成で100%                         |
| backlog_drop         | 正方向          | (previous - current) / value | clamp      | previous 不明時は非表示            |
| retention_rate       | 正方向          | currentRetention% / value    | clamp      | currentRetention は整数%           |
| reaction_p50_improve | 正方向          | improvePct% / targetPct%     | clamp      | target は比率(0.12)→%換算後整数%   |
| tail_index_low       | 逆方向 (実装済) | target / currentTI           | clamp      | currentTI ≤ target で 1.0 (100%)   |
| flatten_low          | 逆方向 (実装済) | target / currentFlatten      | clamp      | horizon=14日の flattenIndex を参照 |

逆方向 = 「値が小さいほど良い」。バー色は成功系 (緑) で統一し、ツールチップで “lower is better” を明示。

### 11.2 anyOf グループ

`anyOf` 内の複数条件に対応する場合は「グループ内の達成率最大値」を代表値としてバー表示。理由:

1. ユーザが _どれか1つ_ を目標に選べばよい構造で、最も進んでいる選択肢が直感的な「残り距離」を示す。
2. 全条件平均は「複数同時追求」を誤解させるリスクがある。

### 11.3 アクセシビリティ

- `<div role="progressbar" aria-valuenow=.. aria-valuemin=0 aria-valuemax=100>` を付加
- `title="XX%"` でホバー時の即時確認
- 国際化ラベル: `進捗 XX%` / `Progress XX%`

### 11.4 計算と丸め / カラーセマンティクス

- 内部 ratio: 0..1 clamp
- 表示: `Math.round(r * 100)` の整数%
- Forward 条件: アクセント色 (ブランド / ダークテキスト)
- Inverse 条件: 成功色 (緑系) → “低いほど良い” を肯定表現で提示 (閾値達成 = 安定 / 平準化)
- 逆方向バー計算例: tail_index_low (target=1.4, current=1.6) → 1.4/1.6=0.875 → 87%
- current ≤ target の場合は 100% (上限 clamp)

### 11.5 自動更新とイベント

`progressSnapshot` は以下で再計算:

| トリガ                | 内容                                                                               |
| --------------------- | ---------------------------------------------------------------------------------- |
| 初期マウント          | 初期取得                                                                           |
| 90秒 interval         | 軽量ポーリング (安定し過ぎた stale 回避)                                           |
| ミッドナイト rollover | 日付境界 (streak, retention, backlog 差分変化)                                     |
| カスタムイベント      | `study:session`, `reviews:completed`, `cards:added`, `backlog:updated` を dispatch |

カスタムイベント例:

```ts
window.dispatchEvent(new Event('reviews:completed'))
```

### 11.6 既知の制限 / 今後

| 項目                       | 現状            | 改善案                                 |
| -------------------------- | --------------- | -------------------------------------- |
| 値ラベル (分子/分母)       | バーのみ        | `12 / 30` や `1.18 → 1.15` 差分の表示  |
| 微小進捗の表示             | 0% になりがち   | 0<r<0.01 を 1% 表示へ (マイクロウィン) |
| horizon 固定 (flatten)     | 14日固定        | 設定/季節性に応じ 7/14/21 切替         |
| anyOf 表示多言語整形       | 文字列 join     | UI 上で AND シンボルやバッジ化検討     |
| Inverse tooltips 文面調整  | labels に簡潔版 | 改善余地: 例と改善アクション補足       |
| スナップショットキャッシュ | 都度計算        | メモ化 + 差分更新 (review delta 適用)  |

### 11.7 導入ポリシー指針

1. 「明確な目標値」が存在する条件のみ (分母が定義できるもの)
2. 1セッションで大きく跳ねるノイズ系は控える (Tail Index は逆方向で慎重運用)
3. 100% に達した瞬間にバッジ取得評価が走るかを UX と同期 (遅延差異を最小化)

---

Draft v0.1
