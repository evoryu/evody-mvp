# Social Feature Foundation (MVP)

目的: 学習体験に軽いソーシャル層（投稿/フォロー/リアクション）を被せ、継続動機を強化する最小土台を用意。初期段階では DB ではなくメモリ + localStorage（オプション）でモックし、後続で API / 永続化に差し替え可能な構造にする。

## スコープ (Phase 1)

| 機能                 | 含む                     | 含まない                       |
| -------------------- | ------------------------ | ------------------------------ |
| タイムライン(Feed)   | 自分 + フォロー中の投稿  | 無限スクロール, リッチメディア |
| 投稿(Post)           | テキスト, 日時, いいね数 | 画像/動画, 編集履歴, 通知      |
| いいね(Like)         | 1ユーザー1回トグル       | いいね種別(スタンプ)           |
| フォロー(Follow)     | フォロー/解除, カウント  | 推薦アルゴリズム               |
| ユーザープロフィール | 投稿一覧, フォローボタン | バッジ, 実績, ステータス配信   |

## 最小データモデル

```ts
export type User = {
  id: string
  name: string
  avatar?: string // dataURL or external
}

export type Post = {
  id: string
  userId: string
  body: string
  createdAt: number // epoch ms
  likes: string[] // userIds
}

export type FollowEdge = { followerId: string; followeeId: string }
```

永続化方針: MVP は `in-memory` → (オプション) `localStorage('evody:posts','evody:follows')` シリアライズ。競合や同時編集は考慮外。

## API 風ヘルパ (後でサーバ/APIに差し替えやすい形)

```ts
getFeed(userId): Post[] // user + followed users の投稿（降順）
createPost(userId, body): Post
toggleLike(postId, userId): Post
toggleFollow(followerId, targetId): { following: boolean }
getUserPosts(userId): Post[]
getStats(userId): { posts: number; followers: number; following: number; likesGiven: number; likesReceived: number }
```

## React コンテキスト層

`<SocialProvider>` 内部に state + 上記関数を包む。

State 分割案:

```ts
posts: Post[]
follows: FollowEdge[]
users: User[] // 既存 username 連携 (ProfilePage)
currentUserId: string // 既存 localStorage ユーザー名と関連付け想定
```

## コンポーネント

| コンポーネント     | 役割                                     |
| ------------------ | ---------------------------------------- |
| `<PostComposer />` | 新規投稿 (テキスト) 入力 + submit        |
| `<PostCard />`     | 投稿本文 / 作者 / 相対時刻 / Like ボタン |
| `<Feed />`         | 投稿一覧を map レンダリング (仮想化不要) |
| `<FollowButton />` | 状態に応じて Follow / Unfollow 切替      |

## UI トークンとの整合

- カード: `task-card` / `--c-surface` / `--c-border`
- ボタン: 主要行動投稿 → `--grad-accent`, Like はプレーンボタン + アイコン
- メタ情報: `text-[var(--c-text-secondary)]`

## 拡張ポイント (Phase 2 以降)

- コメントツリー
- 通知 (いいね/フォロー)
- タグ / ハッシュ (#topic) でフィルタ
- 無限スクロール (cursor based)
- API ルート化 / Prisma or Drizzle 移行
- Episode 自動投稿 (学習完了時) ※ Profile の設定トグル `autoPostEpisodes`

## リスク / 借り

- ID 生成: `crypto.randomUUID()` で衝突低確率、順序ソートは createdAt 依存
- いいね配列線形検索 → 投稿数増で O(n\*m)（将来 Set や index 化）
- フィード取得で都度 filter → 件数増で最適化余地 (事前インデックス)

## テスト指針 (手動)

1. 投稿作成 → 即フィード先頭に表示
2. Like トグルでカウント増減 & 重複なし
3. Follow A→B 後 B の投稿がフィードに出現 / Unfollow で消える（自分投稿は残る）
4. プロフィールページで本人投稿のみ & フォロー状態に応じてボタンラベル切替
5. (自動投稿ON時) 学習完了 → フィードに Episode 要約投稿が追加される

---

この文書は MVP 実装後に実コード状態へ合わせて随時更新してください。
