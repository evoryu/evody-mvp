import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Noto_Sans_JP, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Avatar from '@/components/avatar'
import { PointsBadge } from '@/components/points-badge'
import { PointsProvider } from './points-context'
import { ToastProvider } from './toast-context'
import { LocaleProvider } from './locale-context'
import LocaleToggle from '@/components/locale-toggle'

const notoSansJP = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
})

const geistSans = Geist({ 
  variable: '--font-geist-sans', 
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({ 
  variable: '--font-geist-mono', 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'evody',
  description: '学びをゲーム化するSNS',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
  <body className="min-h-dvh bg-[var(--c-bg)] text-[15px] antialiased">
        <LocaleProvider>
        <PointsProvider>
          <ToastProvider>
            {/* ヘッダー */}
            <header className="sticky top-0 z-50 border-b border-[var(--c-border)] bg-[var(--c-surface)]/80 backdrop-blur">
              <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
                <div className="flex items-center gap-6">
                  <Link href="/" className="text-lg font-medium">
                    evody
                  </Link>
                  <div className="flex items-center gap-4 text-sm">
                    <Link href="/study/quick" className="text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-text)]">
                      クイック学習
                    </Link>
                    <Link href="/decks" className="text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-text)]">
                      デッキ
                    </Link>
                    <Link href="/tasks" className="text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-text)]">
                      タスク
                    </Link>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <LocaleToggle />
                  <PointsBadge />
                  <Link href="/profile" className="group relative cursor-pointer">
                    <Avatar size="sm" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-[var(--c-surface)] px-2 py-1 text-xs text-[var(--c-text-secondary)] opacity-0 shadow transition-opacity group-hover:opacity-100">
                      プロフィール
                    </div>
                  </Link>
                </div>
              </nav>
            </header>

            {/* メインコンテンツ */}
            <main className="mx-auto max-w-5xl p-6">
              {children}
            </main>

            {/* フッター */}
            <footer className="border-t border-[var(--c-border)] py-8">
              <div className="mx-auto max-w-5xl px-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="order-2 sm:order-1">
                    <p className="text-sm text-[var(--c-text-muted)]">
                      © 2024 evody
                    </p>
                  </div>
                  <nav className="order-1 -ml-2 -mt-2 flex flex-wrap sm:order-2">
                    <Link href="/about" className="text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-text)]">
                      About
                    </Link>
                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-text)]">
                      Twitter
                    </a>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[var(--c-text-muted)] transition-colors hover:text-[var(--c-text)]">
                      GitHub
                    </a>
                  </nav>
                </div>
              </div>
            </footer>
          </ToastProvider>
        </PointsProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}