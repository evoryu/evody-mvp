import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

// これらはそのままOK
import { PointsProvider } from './points-context'
// 👇 追加：さっき作ったクライアントコンポーネントを使う
import { PointsBadge } from '@/components/points-badge'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'evody',
  description: '学びをゲーム化するSNS',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh bg-gray-50 antialiased">
        <PointsProvider>
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <Link href="/" className="text-lg font-semibold tracking-tight">evody</Link>
              <nav className="flex items-center gap-4 text-sm text-gray-600">
                <Link className="hover:text-black" href="/about">About</Link>
                <Link className="hover:text-black" href="/tasks">Tasks</Link>
                {/* 👇 クライアント側のバッジ */}
                <PointsBadge />
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

          <footer className="border-t bg-white">
            <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-gray-500">
              © {new Date().getFullYear()} evody
            </div>
          </footer>
        </PointsProvider>
      </body>
    </html>
  )
}
