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
