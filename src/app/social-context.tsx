"use client"
import React from 'react'
import {
  createPost,
  getFeed,
  getUserPosts,
  toggleLike,
  toggleFollow,
  isFollowing,
  getStats,
  ensureUser,
  Post,
  User,
} from '@/lib/social'

type SocialContextValue = {
  currentUser: User
  feed: Post[]
  refreshFeed: () => void
  create: (body: string) => void
  like: (postId: string) => void
  toggleFollow: (targetId: string) => void
  isFollowing: (targetId: string) => boolean
  userPosts: (userId: string) => Post[]
  stats: (userId: string) => ReturnType<typeof getStats>
}

const SocialContext = React.createContext<SocialContextValue | null>(null)

export function SocialProvider({ children }: { children: React.ReactNode }) {
  // 既存 profile の localStorage ユーザー名（空なら Guest）を利用
  const [currentUser] = React.useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('evody:username') : null
    return ensureUser(stored || 'Guest')
  })

  const [feed, setFeed] = React.useState<Post[]>([])
  const refreshFeed = React.useCallback(() => {
    setFeed(getFeed(currentUser.id))
  }, [currentUser.id])

  React.useEffect(() => {
    refreshFeed()
  }, [refreshFeed])

  const create = React.useCallback((body: string) => {
    if (!body.trim()) return
    createPost(currentUser.id, body)
    refreshFeed()
  }, [currentUser.id, refreshFeed])

  const like = React.useCallback((postId: string) => {
    toggleLike(postId, currentUser.id)
    refreshFeed()
  }, [currentUser.id, refreshFeed])

  const follow = React.useCallback((targetId: string) => {
    toggleFollow(currentUser.id, targetId)
    refreshFeed()
  }, [currentUser.id, refreshFeed])

  const value: SocialContextValue = {
    currentUser,
    feed,
    refreshFeed,
    create,
    like,
    toggleFollow: follow,
    isFollowing: (targetId) => isFollowing(currentUser.id, targetId),
    userPosts: getUserPosts,
    stats: getStats,
  }

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
}

export function useSocial() {
  const ctx = React.useContext(SocialContext)
  if (!ctx) throw new Error('useSocial must be used within SocialProvider')
  return ctx
}
