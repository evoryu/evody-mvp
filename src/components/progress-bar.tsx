"use client";
import React from 'react';
import { InfoHint } from './info-hint';
import { LabelKey } from '@/lib/labels';
import { useLocale } from '@/app/locale-context';

export interface ProgressBarProps {
  ratio: number; // 0..1
  label?: string; // plain text label (visually hidden for screen readers optionally)
  tooltipKey?: string; // optional InfoHint label key (must exist in labels map)
  inverse?: boolean; // future flag when implementing inverse metrics
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ ratio, label, tooltipKey, inverse = false, className = '' }) => {
  const locale = useLocale();
  if (ratio < 0) ratio = 0; if (ratio > 1) ratio = 1;
  const pct = Math.round(ratio * 100);
  const ariaLabel = label ? `${label}: ${pct}%` : (locale==='ja'? `進捗 ${pct}%${inverse? ' (低いほど良い)':''}`: `Progress ${pct}%${inverse? ' (lower better)':''}`);
  return (
    <div className={`flex items-center gap-1 ${className}`}> 
      <div className="h-1.5 w-full rounded bg-[var(--c-border)]/40 overflow-hidden relative" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={ariaLabel} title={`${pct}%`}>
        <div className={`h-full transition-all ${inverse? 'bg-[var(--c-success,#16a34a)]':'bg-[var(--c-accent-text,#336)]'}`} style={{ width: `${pct}%` }} />
      </div>
  {tooltipKey && <InfoHint labelKey={tooltipKey as LabelKey} iconSize={12} />}
    </div>
  );
};
