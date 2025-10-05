# TODO (shortlist)

以下は実装済み（小改善があれば個別Issue／メモへ）：

- [x] UI: トースト（達成 "+X pt"）
- [x] 学習: 簡易SRS（interval/due 更新、`due <= now` を出題）
- [x] Decks: CSVインポート / エクスポート
- [x] Profile: 今日の合計獲得pt表示
- [x] 収益化モック: ミニ窓広告のUI（右下パネル・視聴カウント）

## Naming Migration Cleanup (完了)

以下を反映済み（ラベル値のみ更新・キーは不変）:

- 学習量シミュレーター
- 今後のレビュー負荷
- 最大/日 / 中央値/日（英語併記の (Peak) を撤去）
- 内訳 / バランス / 初期再挑戦 / 学習時間 / 追加パターンサマリー / 未消化
  完了後の方針: Tooltip に必要最低限の英語原語を残し、検索性を確保。

### i18n Scaffold Follow-up

- `labels.ts` ですべて ja ベース → en ミラー。（運用中）
- "(旧: ...)" 除去時はラベル値だけ更新 (キー不変) で差分最小化。（運用中）
- 実装済み: `?lang` / cookie / localStorage での locale 切替、クロスタブ同期。
  - 追加改善: `<html lang>` を現在の locale に同期（a11y/SEO）。
- wave3: Upcoming Load 詳細統計 (Shift / Balance / Flatten 説明) をキー化（継続）。
