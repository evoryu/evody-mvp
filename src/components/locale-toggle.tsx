"use client";
import React from 'react';
import { useLocale, useSetLocale } from '@/app/locale-context';

export default function LocaleToggle(){
  const locale = useLocale();
  const setLocale = useSetLocale();
  return (
    <div className="flex items-center gap-1 text-[11px] border rounded-md px-2 py-1 bg-[var(--c-surface)]/60" aria-label="Locale Switcher">
      <button
        onClick={()=> setLocale('ja')}
        className={"transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--c-border)] rounded-sm px-1 " + (locale==='ja'? 'font-semibold text-[var(--c-text)]':'text-[var(--c-text-muted)] hover:text-[var(--c-text)]')}
        aria-pressed={locale==='ja'}
        type="button"
      >JA</button>
      <span className="text-[var(--c-border)] select-none" aria-hidden>|</span>
      <button
        onClick={()=> setLocale('en')}
        className={"transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--c-border)] rounded-sm px-1 " + (locale==='en'? 'font-semibold text-[var(--c-text)]':'text-[var(--c-text-muted)] hover:text-[var(--c-text)]')}
        aria-pressed={locale==='en'}
        type="button"
      >EN</button>
    </div>
  );
}
