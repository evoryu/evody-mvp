"use client"
import React from 'react'
import { SocialProvider, useSocial } from '@/app/social-context'
import { getUser } from '@/lib/social'

type Props = { params: { id: string } }

function ProfileInner({ userId }: { userId: string }) {
  const { currentUser, isFollowing, toggleFollow, userPosts, stats } = useSocial()
  const user = getUser(userId)
  const following = isFollowing(userId)
  const isMe = currentUser.id === userId
  const st = stats(userId)
  const posts = userPosts(userId)

  if (!user) {
    return <p className="text-sm text-red-600">ユーザーが見つかりません。</p>
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-[var(--c-text-secondary)]">投稿と学習アクティビティの概要</p>
        </div>
        {!isMe && (
          <button
            onClick={() => toggleFollow(userId)}
            className="group/button inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg active:shadow-sm"
            style={{ background: 'var(--grad-accent)' }}
          >
            {following ? 'フォロー中 ✓' : 'フォローする'}
          </button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border p-4 task-card">
          <div className="text-xs font-medium text-[var(--c-text-secondary)]">投稿</div>
          <div className="mt-1 text-2xl font-bold">{st.posts}</div>
        </div>
        <div className="rounded-xl border p-4 task-card">
          <div className="text-xs font-medium text-[var(--c-text-secondary)]">フォロワー</div>
          <div className="mt-1 text-2xl font-bold">{st.followers}</div>
        </div>
        <div className="rounded-xl border p-4 task-card">
          <div className="text-xs font-medium text-[var(--c-text-secondary)]">フォロー中</div>
            <div className="mt-1 text-2xl font-bold">{st.following}</div>
        </div>
        <div className="rounded-xl border p-4 task-card">
          <div className="text-xs font-medium text-[var(--c-text-secondary)]">受けたLike</div>
          <div className="mt-1 text-2xl font-bold">{st.likesReceived}</div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">投稿</h2>
        {posts.length === 0 && (
          <p className="text-sm text-[var(--c-text-secondary)]">まだ投稿がありません。</p>
        )}
        <ul className="space-y-3">
          {posts.map(p => (
            <li key={p.id} className="rounded-xl border p-4 task-card">
              <div className="flex items-center justify-between text-xs text-[var(--c-text-secondary)]">
                <span>{new Date(p.createdAt).toLocaleString()}</span>
                <span>♥ {p.likes.length}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default function UserPage({ params }: Props) {
  return (
    <section className="space-y-6">
      <SocialProvider>
        <ProfileInner userId={params.id} />
      </SocialProvider>
    </section>
  )
}
