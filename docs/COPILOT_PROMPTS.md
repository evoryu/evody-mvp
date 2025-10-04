# Copilot quick prompts

実装済み（参考）:

- "Implement SRS update (Again/Hard/Good/Easy) per docs/POINTS.md and docs/STATE.md" → 簡易SRSを `src/lib/srs.ts` に実装済み（interval/ease/due、Again=5分後、Hard/Good/Easy の間隔更新）。
- "Add toast on points change (+X pt) in study pages" → ポイントトースト集約を全体に実装済み（`src/components/points-toaster.tsx`）。
- "Refactor Decks page into Card component per docs/UI_GUIDE.md" → `DeckCard` を `src/components/deck-card.tsx` として抽出し、`src/app/decks/page.tsx` で使用。
- "Wire deck CSV import/export UI to parse/export functions ... and add basic toasts" → 取り込みUIは導入済み。さらに `src/app/decks/[id]/page.tsx` に直近インポートのプレビュー（先頭5行）と件数/モード表示を追加。確認モーダルも実装し、検証サマリ（新規/更新/変更なし/削除対象）・全件表示トグル・色分け・無効行/重複レポートDLを追加。
- "Add i18n toggle persistence and query sync" → LocaleProviderに ?lang/cookie/localStorage 同期とタブ間同期(storage)を実装。無効?langのURL正規化も追加。
- "Polish What-if dialog tooltips using InfoHint and labels.ts keys" → What-ifダイアログの説明をInfoHintで整理。`tooltipAddedCardsCount` を追加し、選択UIにtitle付与でA11yも改善。

次に使えるプロンプト例:

- "Write unit tests for experiments analytics backoff/TTL/persistence"
- "Add CSV import validation and preview diff (new/updated/invalid breakdown) with confirmation modal"
- "Add before→after diff highlight in CSV preview table (cell-level change emphasis)"
- "Add InfoHints to charts legend (bars/sparkline) in What-if"
