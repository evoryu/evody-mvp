import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Noto_Sans_JP, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Avatar from '@/components/avatar'
import { PointsBadge } from '@/components/points-badge'

// これらはそのままOK
import { PointsProvider } from './points-context'
import { ToastProvider } from './toast-context'
import ThemeToggle from '@/components/theme-toggle'

import { ThemeProvider } from './theme-provider'

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
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-dvh bg-gray-50 text-[15px] antialiased dark:bg-zinc-950">
        <ThemeProvider>
        <PointsProvider>
        <ToastProvider>
      <header className="sticky top-0 z-50 backdrop-blur bg-background/80 border-b border-color-border">
        <nav className="mx-auto flex h-20 max-w-5xl items-center justify-between px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-semibold">evody</Link>
            <div className="flex items-center gap-4 text-[15px]">
              <Link href="/about">About</Link>
              <Link href="/study/quick">Study</Link>
              <Link href="/tasks">Tasks</Link>
              <Link href="/decks">Decks</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <PointsBadge />
            <Link href="/profile">
              <Avatar name="Y" size={24} />
            </Link>
          </div>
        </nav>
      </header>          <main className="mx-auto max-w-5xl px-4 py-12">{children}</main>

          <footer className="border-t border-color-border bg-background/80 backdrop-blur">
            <div className="mx-auto max-w-5xl px-8 py-6">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  © {new Date().getFullYear()} evody - 効率的な学習をサポート
                </p>
                <nav className="flex gap-6 text-sm">
                  <Link href="/about" className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                    About
                  </Link>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                    Twitter
                  </a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                    GitHub
                  </a>
                </nav>
              </div>
            </div>
          </footer>
        </ToastProvider>
        </PointsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
