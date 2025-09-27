'use client'
import React from 'react'
import { SocialProvider, useSocial } from '@/app/social-context'
import { motion } from 'framer-motion'

function Time({ value }: { value: number }) {
  const diff = Date.now() - value
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return <span>今</span>
  if (mins < 60) return <span>{mins}分前</span>
  const h = Math.floor(mins / 60)
  if (h < 24) return <span>{h}時間前</span>
  const d = Math.floor(h / 24)
  return <span>{d}日前</span>
}

function Composer() {
  const { create } = useSocial()
  const [text, setText] = React.useState('')
  return (
    <div className="rounded-xl border p-4 space-y-3 task-card">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="学習メモ / 今の進捗などをシェア..."
        className="w-full resize-none rounded-lg border px-3 py-2 text-sm bg-[var(--c-surface-alt)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        rows={3}
      />
      <div className="flex justify-end">
        <button
          disabled={!text.trim()}
          onClick={() => { create(text); setText('') }}
          className="group/button inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg"
          style={{ background: 'var(--grad-accent)' }}
        >
          投稿
        </button>
      </div>
    </div>
  )
}

function PostCard({ post }: { post: import('@/lib/social').Post }) {
  const { like, currentUser } = useSocial()
  const liked = post.likes.includes(currentUser.id)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-4 task-card bg-[var(--c-surface)]/70 backdrop-blur"
    >
      <div className="flex items-center justify-between text-xs text-[var(--c-text-secondary)]">
        <span>{post.userId}</span>
        <Time value={post.createdAt} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
        {post.body}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => like(post.id)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-[var(--c-surface-alt)]"
        >
          <span className={liked ? 'text-pink-500' : 'text-[var(--c-text-secondary)]'}>♥</span>
          <span>{post.likes.length}</span>
        </button>
      </div>
    </motion.div>
  )
}

function FeedInner() {
  const { feed } = useSocial()
  return (
    <div className="space-y-4">
      <Composer />
      <div className="space-y-3">
        {feed.length === 0 && (
          <p className="text-sm text-[var(--c-text-secondary)]">投稿はまだありません。</p>
        )}
        {feed.map(p => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  )
}

export default function SocialFeedPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Social Feed</h1>
      <SocialProvider>
        <FeedInner />
      </SocialProvider>
    </section>
  )
}
