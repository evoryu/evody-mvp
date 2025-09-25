'use client'

import React from 'react'
import Image from 'next/image'

type Props = {
  name: string
  size?: number // ピクセル（デフォルト 96）
}

const KEY = 'evody:avatarV1'

export default function Avatar({ name, size = 96 }: Props) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null)

  // 初期読込
  React.useEffect(() => {
    const raw = localStorage.getItem(KEY)
    if (raw) setDataUrl(raw)
  }, [])

  // 画像選択 → dataURL へ変換して保存
  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      setDataUrl(url)
      localStorage.setItem(KEY, url)
    }
    reader.readAsDataURL(file)
  }

  const clear = () => {
    setDataUrl(null)
    localStorage.removeItem(KEY)
  }

  // 名前からイニシャルを作成
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(s => s[0]?.toUpperCase() ?? '')
        .join('') || 'YOU'
    : 'YOU'

  // 名前から背景色（簡易）
  const hue =
    Array.from(name || 'evody').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    360

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-full border bg-gray-100"
        style={{ width: size, height: size }}
        title={name || 'avatar'}
      >
          {dataUrl ? (
            <Image
              src={dataUrl}
              alt="avatar"
              className="h-full w-full object-cover"
              draggable={false}
              width={size}
              height={size}
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-white"
              style={{ backgroundColor: `hsl(${hue} 70% 45%)` }}
            >
              <span className="select-none text-2xl font-bold">{initials}</span>
            </div>
          )}
      </div>

      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-lg border px-3 py-1 text-sm hover:bg-gray-100">
          画像を選ぶ
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
        </label>
        {dataUrl && (
          <button
            onClick={clear}
            className="rounded-lg border px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
            title="アバターをリセット"
          >
            クリア
          </button>
        )}
      </div>
    </div>
  )
}
