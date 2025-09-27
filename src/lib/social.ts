// Social feature in-memory foundation
// 将来 API / DB 層に差し替えやすいよう純関数 + 軽い mutable state

export type User = { id: string; name: string; avatar?: string }
export type Post = { id: string; userId: string; body: string; createdAt: number; likes: string[] }
export type FollowEdge = { followerId: string; followeeId: string }

// --- In-memory stores --- //
let users: User[] = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
  { id: 'u3', name: 'Guest' },
]
let posts: Post[] = [
  {
    id: 'p1',
    userId: 'u1',
    body: '初期投稿: 学習開始！',
    createdAt: Date.now() - 1000 * 60 * 60,
    likes: ['u2'],
  },
  {
    id: 'p2',
    userId: 'u2',
    body: 'SRS の間隔調整を実験中。',
    createdAt: Date.now() - 1000 * 60 * 25,
    likes: [],
  },
]
let follows: FollowEdge[] = [
  { followerId: 'u3', followeeId: 'u1' },
]

// --- Helpers --- //
const byCreatedDesc = (a: Post, b: Post) => b.createdAt - a.createdAt

export const getUsers = () => users
export const getUser = (id: string) => users.find(u => u.id === id) || null

export function ensureUser(name: string): User {
  const existing = users.find(u => u.name === name)
  if (existing) return existing
  const nu: User = { id: crypto.randomUUID(), name }
  users = [...users, nu]
  return nu
}

export function createPost(userId: string, body: string): Post {
  const p: Post = { id: crypto.randomUUID(), userId, body: body.trim(), createdAt: Date.now(), likes: [] }
  posts = [p, ...posts]
  return p
}

export function getFeed(userId: string): Post[] {
  const followees = follows.filter(f => f.followerId === userId).map(f => f.followeeId)
  const allowed = new Set([userId, ...followees])
  return posts.filter(p => allowed.has(p.userId)).sort(byCreatedDesc)
}

export function getUserPosts(userId: string): Post[] {
  return posts.filter(p => p.userId === userId).sort(byCreatedDesc)
}

export function toggleLike(postId: string, userId: string): Post | null {
  const idx = posts.findIndex(p => p.id === postId)
  if (idx === -1) return null
  const post = posts[idx]
  const liked = post.likes.includes(userId)
  const likes = liked ? post.likes.filter(id => id !== userId) : [...post.likes, userId]
  const updated: Post = { ...post, likes }
  posts[idx] = updated
  return updated
}

export function toggleFollow(followerId: string, targetId: string) {
  if (followerId === targetId) return { following: false }
  const index = follows.findIndex(f => f.followerId === followerId && f.followeeId === targetId)
  if (index >= 0) {
    follows.splice(index, 1)
    return { following: false }
  }
  follows.push({ followerId, followeeId: targetId })
  return { following: true }
}

export function isFollowing(followerId: string, targetId: string) {
  return follows.some(f => f.followerId === followerId && f.followeeId === targetId)
}

export function getStats(userId: string) {
  const postsBy = posts.filter(p => p.userId === userId)
  const followers = follows.filter(f => f.followeeId === userId)
  const following = follows.filter(f => f.followerId === userId)
  const likesReceived = postsBy.reduce((a, p) => a + p.likes.length, 0)
  const likesGiven = posts.filter(p => p.likes.includes(userId)).length
  return {
    posts: postsBy.length,
    followers: followers.length,
    following: following.length,
    likesReceived,
    likesGiven,
  }
}

// Reset (for tests / dev)
export function __resetSocial(data?: { users?: User[]; posts?: Post[]; follows?: FollowEdge[] }) {
  if (data?.users) users = data.users
  if (data?.posts) posts = data.posts
  if (data?.follows) follows = data.follows
}
