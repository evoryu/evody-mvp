"use client"
import { useEffect } from 'react'
import { ensureGeneratedBadgesLoaded } from '@/lib/badges'

/**
 * BadgeRegistryLoader: クライアント初期化時に生成済みバッジ定義を登録。
 * 非同期だが軽量のため単純 fire & forget。必要ならロード完了フラグを context 化可。
 */
export function BadgeRegistryLoader() {
  useEffect(()=> { void ensureGeneratedBadgesLoaded() }, [])
  return null
}
