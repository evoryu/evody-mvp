# TODO (shortlist)

- UI: トースト（達成 "+X pt"）
- 学習: 簡易SRS（interval/due 更新、`due <= now` を出題）
- Decks: CSVインポート / エクスポート
- Profile: 今日の合計獲得pt表示
- 収益化モック: ミニ窓広告のUI（右下パネル・視聴カウント）

## Naming Migration Cleanup (予定)

- (日付+14d) 目安で以下の "(旧: ...)" 表記を削除:
  - 学習量シミュレーター (旧: What-if)
  - 今後のレビュー負荷 (旧: Upcoming Review Load)
  - 最大/日 (Peak) の (Peak)
  - 内訳 (旧: Stack)
  - バランス (旧: Balance)
  - 初期再挑戦 (旧: Early Failures)
  - 学習時間 (旧: Time Load)
  - 追加パターンサマリー (旧: Chain Summary)
  - 未消化 (旧: Backlog)
- 削除後: Tooltip に英語原語を必要最低限残し検索性確保

### i18n Scaffold Follow-up

- `labels.ts` ですべて ja ベース → en ミラー。
- "(旧: ...)" 除去時はラベル値だけ更新 (キー不変) で差分最小化。
- 将来: `?lang=en` または localStorage `evody:lang` で locale 切替 (未実装)。
- wave3: Upcoming Load 詳細統計 (Shift / Balance / Flatten 説明) をキー化。
