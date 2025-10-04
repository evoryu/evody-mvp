# Copilot quick prompts

実装済み（参考）:

- "Implement SRS update (Again/Hard/Good/Easy) per docs/POINTS.md and docs/STATE.md" → 簡易SRSを `src/lib/srs.ts` に実装済み（interval/ease/due、Again=5分後、Hard/Good/Easy の間隔更新）。
- "Add toast on points change (+X pt) in study pages" → ポイントトースト集約を全体に実装済み（`src/components/points-toaster.tsx`）。
- "Refactor Decks page into Card component per docs/UI_GUIDE.md" → `DeckCard` を `src/components/deck-card.tsx` として抽出し、`src/app/decks/page.tsx` で使用。
- "Wire deck CSV import/export UI to parse/export functions ... and add basic toasts" → 取り込みUIは導入済み。さらに `src/app/decks/[id]/page.tsx` に直近インポートのプレビュー（先頭5行）と件数/モード表示を追加。

次に使えるプロンプト例:

- "Add i18n toggle persistence and query sync (LocaleProvider already supports ?lang and cookie)"
- "Polish What-if dialog tooltips using InfoHint and labels.ts keys (tooltip* and info* keys)"
- "Write unit tests for experiments analytics backoff/TTL/persistence"
- "Add CSV import validation and preview diff (new/updated/invalid breakdown) with confirmation modal"
