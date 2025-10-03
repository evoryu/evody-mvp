# Badges Changelog (Skeleton)

フォーマット: 日付 (YYYY-MM-DD) / 変更種別 / ID / 詳細 / version 影響
変更種別例: add | tweak | rename | retire | threshold | text | version-bump

## 2025-10-03

- add: retention_85 / retention_high / retention_95 (tiered retention series 初期導入)
- text: 各 retention 系 日本語タイトル `リテンション` → `定着率` へ統一
- text: EN localization pass for existing badges
- tweak: achievements page condition i18n (template化) (no version bump; 表示のみ)

## 2025-10-03 (later same day)

- add: InfoHint metric tooltips (UIのみ、定義変更なし)
- add: category filters + search + hide-earned toggle (UIのみ)

(以降追記)

### 記載ガイド

| フィールド   | 説明                                                   |
| ------------ | ------------------------------------------------------ |
| add          | 新規バッジ追加。version=1 で開始。                     |
| threshold    | value 閾値変更。version++ 必須。                       |
| text         | タイトル/説明の文言のみ。version 変更不要 (表示のみ)。 |
| rename       | id 以外 (title) の表現大幅変更。通常 version据え置き。 |
| version-bump | ロジック影響 (条件演算子 / type 変更)。                |
| retire       | 評価対象から除外 (将来: active=false などで実装)。     |

---

Skeleton v0.1
