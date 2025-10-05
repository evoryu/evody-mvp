"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export type AppLocale = 'ja' | 'en';

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (l: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function readCookieLocale(): AppLocale | null {
  if (typeof document === 'undefined') return null;
  try {
    const ck = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('evody:lang='));
    if (!ck) return null;
    const v = ck.split('=')[1];
    if (v === 'ja' || v === 'en') return v;
  } catch {/* ignore */}
  return null;
}

function writeCookieLocale(l: AppLocale) {
  try { document.cookie = `evody:lang=${l};path=/;max-age=31536000`; } catch {/* ignore */}
}

function readLocalStorageLocale(): AppLocale | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem('evody:lang');
    if (v === 'ja' || v === 'en') return v;
  } catch {/* ignore */}
  return null;
}

function writeLocalStorageLocale(l: AppLocale) {
  try { window.localStorage.setItem('evody:lang', l); } catch {/* ignore */}
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('ja');

  // initialize from query or cookie
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('lang');
      if (q === 'ja' || q === 'en') {
        setLocaleState(q);
        writeCookieLocale(q);
        writeLocalStorageLocale(q);
      } else if (q != null) {
        // 無効値ならURLからパラメータを除去し、後段の保存値を採用
        const url = new URL(window.location.href);
        url.searchParams.delete('lang');
        window.history.replaceState(null, '', url.toString());
        const ls = readLocalStorageLocale();
        if (ls) { setLocaleState(ls); writeCookieLocale(ls); }
        else {
          const ck = readCookieLocale();
          if (ck) setLocaleState(ck);
        }
      } else {
        const ls = readLocalStorageLocale();
        if (ls) { setLocaleState(ls); writeCookieLocale(ls); }
        else {
          const ck = readCookieLocale();
          if (ck) setLocaleState(ck);
        }
      }
    } catch {/* ignore */}
  }, []);

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    writeCookieLocale(l);
    writeLocalStorageLocale(l);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', l);
      window.history.replaceState(null, '', url.toString());
    } catch {/* ignore */}
  }, []);

  // <html lang> を現在のロケールに同期（a11y/SEO）
  useEffect(() => {
    try { document.documentElement.setAttribute('lang', locale) } catch { /* ignore */ }
  }, [locale]);

  // タブ間同期: 他タブで変更された場合に反映
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'evody:lang') {
        const v = e.newValue === 'ja' || e.newValue === 'en' ? (e.newValue as AppLocale) : null;
        if (v) setLocaleState(v);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): AppLocale {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within <LocaleProvider>');
  return ctx.locale;
}

export function useSetLocale(): (l: AppLocale) => void {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useSetLocale must be used within <LocaleProvider>');
  return ctx.setLocale;
}
