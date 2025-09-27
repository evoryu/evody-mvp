'use client'

import React from 'react'
import Image from 'next/image'

type Props = {
  name?: string
  size?: 'sm' | 'md' // sm: 32px, md: 96px
}

const KEY = 'evody:avatarV1'

export default function Avatar({ name = 'ユーザー', size = 'md' }: Props) {
  const sizeInPx = size === 'sm' ? 32 : 96
  const [dataUrl, setDataUrl] = React.useState<string | null>(null)

  // 初期読込
  React.useEffect(() => {
    const raw = localStorage.getItem(KEY)
    if (raw) setDataUrl(raw)
  }, [])

  // 画像をアップロードした時の処理
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // 画像をリサイズ
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')

      const img = await createImageBitmap(file)
      const size = Math.min(img.width, img.height)
      const x = (img.width - size) / 2
      const y = (img.height - size) / 2

      canvas.width = 192 // 2倍サイズで保存
      canvas.height = 192
      ctx.drawImage(img, x, y, size, size, 0, 0, 192, 192)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      localStorage.setItem(KEY, dataUrl)
      setDataUrl(dataUrl)

    } catch (err) {
      console.error('Failed to process image:', err)
      alert('画像の処理に失敗しました')
    }
  }

  // ユーザー名のイニシャルを取得
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="relative">
      <label
        htmlFor="avatar-input"
        className="group relative block cursor-pointer overflow-hidden rounded-full bg-gradient-to-br from-gray-500 to-gray-700 hover:from-gray-400 hover:to-gray-600"
        style={{ width: sizeInPx, height: sizeInPx }}
      >
        {dataUrl ? (
          <Image
            src={dataUrl}
            alt="アバター"
            width={sizeInPx}
            height={sizeInPx}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span 
              style={{ fontSize: `${sizeInPx * 0.4}px` }} 
              className="select-none font-bold text-white"
            >
              {initials}
            </span>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <div 
            className="flex gap-2 text-white" 
            style={{ fontSize: `${sizeInPx * 0.3}px` }}
          >
            <span className="font-medium">編集</span>
          </div>
        </div>
      </label>

      <input
        id="avatar-input"
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  )
}