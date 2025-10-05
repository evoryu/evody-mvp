# State and Persistence

## Context

- `PointsProvider` … `points`, `add(delta)`, `reset()`
- ヘッダーの `PointsBadge` はクライアントコンポーネント分離（layout はサーバー）

## localStorage keys

- `evody:points` … number（合計ポイント）
- `evody:tasks` … Task[]（id, title, subject, minutes, done）
- `evody:username` … string
- `evody:avatarV1` … dataURL
- `evody:daily` … Record<YYYY-MM-DD, number>（1日の達成数）
- `evody:lang` … 'ja' | 'en'（ロケール）

## 型

```ts
type Task = {
  id: string
  title: string
  subject: string
  minutes: number
  done: boolean
}
type Deck = {
  id: string
  name: string
  tags?: string[]
  authorId: string
  description?: string
}
type Card = {
  id: string
  deckId: string
  front: string
  back: string
  example?: string
}
```

## i18n / Locale

- ロケール判定と同期
  - 初期化順序: `?lang` クエリ > `localStorage(evody:lang)` > Cookie(`evody:lang`) > 既定 'ja'
  - 変更時: Cookie/LocalStorage を更新し、URLの `?lang` を置換（履歴破壊なし）
  - クロスタブ同期: `storage` イベントで `evody:lang` 更新を監視し反映
  - `<html lang>` 同期: 初期描画前（beforeInteractive Script）とランタイムで現在のロケールを反映

- 実装
  - `src/app/locale-context.tsx`: LocaleProvider（状態保持・保存・クロスタブ反映・<html lang>更新）
  - `src/app/layout.tsx`: `next/script` の beforeInteractive で初期 `lang` を反映
  - ラベル参照: `src/lib/labels.ts` で JA を基底、EN は JA ミラー＋必要箇所上書き

- 運用ガイド
  - 固定文言は `labels.ts` にキー追加（JA/EN）。キーは既存命名に倣い、`profile*` 等のスコープ接頭辞を推奨
  - 英語はミラーを基本に、自然な文面に必要な範囲で上書き
  - UI は `getLabel(key, locale)` を使用（`useLocale()` で locale 取得）

- テスト方法（手動）
  - `?lang=en` を付けて各ページを開き、リロードや他タブでも英語が保持されることを確認
  - `localStorage.setItem('evody:lang','ja')` を他タブから実行し、現在タブの表示が日本語へ変わること
  - 初期ロード時に `<html lang>` が適切（ja/en）であることをElementsで確認
