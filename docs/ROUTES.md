# Routes

- `/` … ホーム（Hero）
- `/about` … 説明
- `/tasks` … タスク（localStorage）
- `/profile` … ユーザー名・アバター・ポイント・レベル・streak
- `/study/quick` … クイック学習
- `/decks` … デッキ一覧（ダミー）
- `/decks/[id]` … デッキ詳細
- `/study/[deckId]` … デッキ学習（`params` は **Promise**。クライアントでは `React.use()` で unwrap）

```ts
// 例: src/app/study/[deckId]/page.tsx
import React, { use } from 'react'
type Props = { params: Promise<{ deckId: string }> }
const { deckId } = use(params)
```
