import React from 'react'

interface CollapsibleSectionProps {
  id: string
  title: React.ReactNode
  children: React.ReactNode
  summary?: React.ReactNode
  collapsed: boolean
  onToggle(): void
  className?: string
  bodyClassName?: string
  small?: boolean
}

export function CollapsibleSection({ id, title, children, summary, collapsed, onToggle, className, bodyClassName, small }: CollapsibleSectionProps) {
  return (
    <div className={`mt-2 rounded border px-2 pt-1 pb-1 ${small ? 'text-[10px]' : 'text-sm'} leading-snug bg-[var(--c-surface-alt)]/40 ${className || ''}`}>
      <div
        className="font-medium text-[var(--c-text-secondary)] mb-0.5 flex items-center gap-2 cursor-pointer select-none"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={id}
      >
        <span>{title}</span>
        <button
          className="ml-auto text-[8px] px-1 py-0.5 rounded border bg-[var(--c-surface)]"
          aria-label={collapsed ? `${title} 展開` : `${title} 折りたたむ`}
        >
          {collapsed ? '+' : '−'}
        </button>
        {summary && (
          <span className="text-[8px] font-normal text-[var(--c-text-muted)] whitespace-nowrap">{summary}</span>
        )}
      </div>
      {!collapsed && (
        <div id={id} className={`contents ${bodyClassName || ''}`}>{children}</div>
      )}
    </div>
  )
}
