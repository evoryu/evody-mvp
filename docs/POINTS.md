# Points Spec

## タスク

- 完了時の獲得ポイント: `floor(minutes/5)` を **5〜50の範囲にクランプ**
- 未完了へ戻す: 同量を減算（運用で無効化可）
- 実装注意: `add()` は **setState 更新関数の外で**呼ぶ（React Strict Mode対策）

## Quick Study / Study

- 評価ごとの付与: `Again:0, Hard:3, Good:6, Easy:8`

## 日次ログ & Streak（Profile）

- `evody:daily` に `{ 'YYYY-MM-DD': count }`
- Streak: 今日から遡り、`>0` が続く日数をカウント
- Level: `floor(points / 100) + 1`（暫定）
