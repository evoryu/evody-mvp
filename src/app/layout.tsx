import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Noto_Sans_JP, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Avatar from '@/components/avatar'

// これらはそのままOK
import { PointsProvider } from './points-context'
import { ToastProvider } from './toast-context'
import { PointsBadge } from '@/components/points-badge'
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
      <body className="min-h-dvh bg-gray-50 text-[15px] antialiased dark:bg-zinc-950">
        <ThemeProvider>
        <PointsProvider>
        <ToastProvider>
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <Link 
                href="/" 
                className="text-xl font-bold tracking-tight text-gray-900 transition-colors hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
              >
                evody
              </Link>
              <nav className="flex items-center gap-6">
                <div className="hidden items-center gap-5 text-[15px] font-medium text-gray-600 dark:text-zinc-400 sm:flex">
                  <Link 
                    className="transition-colors hover:text-gray-900 dark:hover:text-white" 
                    href="/about"
                  >
                    About
                  </Link>
                  <Link 
                    className="transition-colors hover:text-gray-900 dark:hover:text-white" 
                    href="/tasks"
                  >
                    Tasks
                  </Link>
                  <Link 
                    className="transition-colors hover:text-gray-900 dark:hover:text-white" 
                    href="/profile"
                  >
                    Profile
                  </Link>
                  <Link 
                    className="transition-colors hover:text-gray-900 dark:hover:text-white" 
                    href="/study/quick"
                  >
                    Quick Study
                  </Link>
                  <Link 
                    className="transition-colors hover:text-gray-900 dark:hover:text-white" 
                    href="/decks"
                  >
                    Decks
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <PointsBadge />
                  <ThemeToggle />
                  <div className="hidden rounded-lg border border-gray-200 p-1 dark:border-zinc-800 sm:block">
                    <Avatar name="" size={28} />
                  </div>
                </div>
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-4 py-12">{children}</main>

          <footer className="border-t border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto max-w-5xl px-4 py-8">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  © {new Date().getFullYear()} evody - 効率的な学習をサポート
                </p>
                <nav className="flex gap-6 text-sm text-gray-500 dark:text-zinc-500">
                  <Link href="/about" className="transition-colors hover:text-gray-900 dark:hover:text-zinc-300">
                    About
                  </Link>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gray-900 dark:hover:text-zinc-300">
                    Twitter
                  </a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gray-900 dark:hover:text-zinc-300">
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
