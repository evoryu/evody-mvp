import React, { useId, useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { getLabel, LabelKey } from '@/lib/labels'
import { useLocale } from '@/app/locale-context'

/**
 * InfoHint: アクセシブルな軽量ヒント (アイコン + ポップ)。
 * - トリガ: hover / focus / click (モバイルでは click)
 * - Dismiss: ESC / 外側クリック / 再クリック
 * - ARIA: button[aria-expanded][aria-controls] + region[role=dialog]
 */
export interface InfoHintProps {
  labelKey: LabelKey // ポップ本文用キー (翻訳)
  titleKey?: LabelKey // (任意) 見出し用キー (未指定なら本文のみ)
  iconSize?: number
  className?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  portal?: boolean // Portal へ描画 (Phase A)
  allowFlip?: boolean // 画面外にはみ出す場合の単純反転 (top<->bottom, left<->right)
  allowShift?: boolean // Phase B: viewport 内シフト (水平/垂直最小)
  distance?: number // トリガとの距離
  tail?: boolean // Tail 矢印表示 (Portal時推奨)
  /** 大量配置時に ResizeObserver/scroll 監視を抑制 (Phase D) */
  allowObserve?: boolean
  /** prefers-reduced-motion = reduce 時にトランジション無効化 */
  respectReduceMotion?: boolean
  /** 追加で内側に表示したい要素 (末尾) */
  children?: React.ReactNode
}

export const InfoHint: React.FC<InfoHintProps> = ({
  labelKey,
  titleKey,
  iconSize = 14,
  className = '',
  placement = 'top',
  portal = false,
  allowFlip = true,
  distance = 6,
  allowShift = true,
  tail = false,
  allowObserve = true,
  respectReduceMotion = true,
  children
}) => {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const btnId = useId()
  const panelId = useId()
  const ref = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [actualPlacement, setActualPlacement] = useState<typeof placement>(placement)
  const [coords, setCoords] = useState<{top:number; left:number} | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const scrollParentsRef = useRef<HTMLElement[]>([])
  const frameRef = useRef<number | null>(null)
  // Phase C refs (ResizeObserver + scroll parents + rAF frame)

  useEffect(()=>{
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return ()=> { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick) }
  }, [open])

  // Inject global style for tail once
  useEffect(()=>{ if (!tail) return; ensureInfoHintStyle(); }, [tail])

  // Measure & position (Portal mode)
  useLayoutEffect(()=>{
    if (!portal || !open) return
    if (typeof window === 'undefined') return
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    let place = placement
    const vw = window.innerWidth
    const vh = window.innerHeight
    const panelW = 260 // rough fallback; refined after paint via rAF
    const panelH = 120
    if (allowFlip) {
      if (place === 'top' && rect.top - panelH - distance < 0) place = 'bottom'
      else if (place === 'bottom' && rect.bottom + panelH + distance > vh) place = 'top'
      else if (place === 'left' && rect.left - panelW - distance < 0) place = 'right'
      else if (place === 'right' && rect.right + panelW + distance > vw) place = 'left'
    }
    setActualPlacement(place)
  let c = computePortalCoords(rect, place, distance)
  if (allowShift) c = shiftWithinViewport(c, place)
  setCoords(c)
    // refine after paint with real panel size
    requestAnimationFrame(()=>{
      const panelEl = document.getElementById(panelId)
      if (panelEl && trigger) {
        const r = trigger.getBoundingClientRect()
        const pw = panelEl.offsetWidth
        const ph = panelEl.offsetHeight
        let refined = computePortalCoords(r, place, distance, pw, ph)
        if (allowShift) refined = shiftWithinViewport(refined, place, pw, ph)
        setCoords(refined)
      }
    })
  }, [portal, open, placement, allowFlip, allowShift, distance, panelId])

  // Reposition on resize/scroll (basic)
  useEffect(()=>{
    if (!portal || !open) return
    const onWin = () => {
      const trig = triggerRef.current
      if (!trig) return
      const r = trig.getBoundingClientRect()
      let c = computePortalCoords(r, actualPlacement, distance)
      if (allowShift) c = shiftWithinViewport(c, actualPlacement)
      setCoords(c)
    }
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return ()=> { window.removeEventListener('resize', onWin); window.removeEventListener('scroll', onWin, true) }
  }, [portal, open, actualPlacement, allowShift, distance])

  // Phase C effect hook
  useEffectPhaseC({
    portal,
    open,
    allowShift,
    distance,
    placement: actualPlacement,
    panelId,
    triggerRef,
    setCoords,
    roRef,
    scrollParentsRef,
    frameRef,
    allowObserve
  })

  const body = getLabel(labelKey, locale)
  const title = titleKey ? getLabel(titleKey, locale) : null

  const reduceMotion = respectReduceMotion && typeof window !== 'undefined'
    ? window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  const panelContent = open ? (
    <div
      id={panelId}
      role="dialog"
      aria-labelledby={title ? panelId+'-title': undefined}
      ref={portal ? undefined : ref}
      data-placement={actualPlacement}
      data-tail={tail ? 'true':'false'}
      data-debug-placement={process.env.NODE_ENV==='development'? actualPlacement: undefined}
      data-debug-bounds={process.env.NODE_ENV==='development' && coords? `${coords.left},${coords.top}`: undefined}
      className={`infohint-panel z-50 ${portal? 'fixed':'absolute'} min-w-[200px] max-w-xs rounded-md border border-[var(--c-border)] bg-[var(--c-surface)] shadow-lg p-3 text-[11px] leading-snug select-text ${reduceMotion? 'motion-safe:transition-none':''}`}
      style={portal && coords ? { top: coords.top, left: coords.left } : computeStyle(actualPlacement, distance)}
    >
      {title && <div id={panelId+'-title'} className="font-semibold mb-1 text-[var(--c-text-secondary)]">{title}</div>}
      <div>{body}</div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  ) : null

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        id={btnId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={()=> setOpen(o=>!o)}
        onMouseEnter={()=> setOpen(true)}
        onMouseLeave={()=> setOpen(false)}
        onFocus={()=> setOpen(true)}
  onBlur={(e)=> { if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false) }}
        className="inline-flex items-center justify-center rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-secondary)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface-alt)] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        style={{ width: iconSize+6, height: iconSize+6 }}
      >
        <span className="text-[10px] font-semibold" aria-hidden="true">i</span>
      </button>
      {!portal && panelContent}
      {portal && panelContent && typeof document !== 'undefined' && createPortal(panelContent, document.body)}
    </div>
  )
}

function computeStyle(placement: InfoHintProps['placement'], distance=6): React.CSSProperties {
  switch (placement) {
    case 'bottom': return { top: '100%', marginTop: distance, left: '50%', transform: 'translateX(-50%)' }
    case 'left': return { right: '100%', marginRight: distance, top: '50%', transform: 'translateY(-50%)' }
    case 'right': return { left: '100%', marginLeft: distance, top: '50%', transform: 'translateY(-50%)' }
    case 'top':
    default: return { bottom: '100%', marginBottom: distance, left: '50%', transform: 'translateX(-50%)' }
  }
}

function computePortalCoords(rect: DOMRect, placement: InfoHintProps['placement'], distance: number, panelW = 240, panelH = 120) {
  switch (placement) {
    case 'bottom':
      return { top: rect.bottom + distance, left: Math.round(rect.left + rect.width/2 - panelW/2) }
    case 'left':
      return { top: Math.round(rect.top + rect.height/2 - panelH/2), left: rect.left - distance - panelW }
    case 'right':
      return { top: Math.round(rect.top + rect.height/2 - panelH/2), left: rect.right + distance }
    case 'top':
    default:
      return { top: rect.top - distance - panelH, left: Math.round(rect.left + rect.width/2 - panelW/2) }
  }
}

let _infoHintStyleInjected = false
function ensureInfoHintStyle() {
  if (_infoHintStyleInjected || typeof document === 'undefined') return
  const css = `/* InfoHint Phase A tail */
.infohint-panel[data-tail='true']{position:fixed}
.infohint-panel[data-tail='true']::after{content:'';position:absolute;width:8px;height:8px;background:var(--c-surface);border:1px solid var(--c-border);}
.infohint-panel[data-tail='true'][data-placement='top']::after{left:50%;bottom:-5px;transform:translateX(-50%) rotate(45deg);border-left:none;border-top:none;}
.infohint-panel[data-tail='true'][data-placement='bottom']::after{left:50%;top:-5px;transform:translateX(-50%) rotate(45deg);border-right:none;border-bottom:none;}
.infohint-panel[data-tail='true'][data-placement='left']::after{top:50%;right:-5px;transform:translateY(-50%) rotate(45deg);border-right:none;border-top:none;}
.infohint-panel[data-tail='true'][data-placement='right']::after{top:50%;left:-5px;transform:translateY(-50%) rotate(45deg);border-left:none;border-bottom:none;}`
  const style = document.createElement('style')
  style.dataset.infohint = 'phase-a'
  style.textContent = css
  document.head.appendChild(style)
  _infoHintStyleInjected = true
}

// Phase C: observe trigger/panel size & scroll parents for reactive reposition
interface PhaseCArgs {
  portal: boolean
  open: boolean
  allowShift: boolean
  distance: number
  placement: InfoHintProps['placement']
  panelId: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
  setCoords: React.Dispatch<React.SetStateAction<{top:number;left:number}|null>>
  roRef: React.MutableRefObject<ResizeObserver | null>
  scrollParentsRef: React.MutableRefObject<HTMLElement[]>
  frameRef: React.MutableRefObject<number | null>
}
function useEffectPhaseC(args: PhaseCArgs & { allowObserve?: boolean }) {
  const { portal, open, allowShift, distance, placement, panelId, triggerRef, setCoords, roRef, scrollParentsRef, frameRef, allowObserve } = args
  useEffect(()=>{
    if (!portal || !open) return
    if (allowObserve === false) return
    const trigger = triggerRef.current
    if (!trigger) return
    const panelEl = document.getElementById(panelId)
    if (!panelEl) return

    const recompute = () => {
      if (!trigger) return
      const r = trigger.getBoundingClientRect()
      const pw = panelEl.offsetWidth
      const ph = panelEl.offsetHeight
      let c = computePortalCoords(r, placement, distance, pw, ph)
      if (allowShift) c = shiftWithinViewport(c, placement, pw, ph)
      setCoords(c)
    }

    // ResizeObserver for panel size changes
    const ro = new ResizeObserver(()=>{
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(()=> recompute())
    })
    ro.observe(panelEl)
    roRef.current = ro

    // Scroll parents detection
    const parents: HTMLElement[] = []
    let n: HTMLElement | null = trigger.parentElement
    while (n && n !== document.body) {
      const style = getComputedStyle(n)
      const overflowY = style.overflowY
      const overflowX = style.overflowX
      if (/(auto|scroll|overlay)/.test(overflowY+overflowX)) parents.push(n)
      n = n.parentElement
    }
    const onScroll = () => {
      if (frameRef.current) return
      frameRef.current = requestAnimationFrame(()=> {
        frameRef.current = null
        recompute()
      })
    }
    parents.forEach(p=> p.addEventListener('scroll', onScroll, { passive: true }))
    scrollParentsRef.current = parents

    // Initial compute
    recompute()

    return ()=> {
      ro.disconnect()
      scrollParentsRef.current.forEach(p=> p.removeEventListener('scroll', onScroll))
      scrollParentsRef.current = []
      if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null }
    }
  }, [portal, open, allowShift, distance, placement, panelId, triggerRef, setCoords, roRef, scrollParentsRef, frameRef, allowObserve])
}

// Phase B: simple viewport shift (horizontal primary, vertical minimal) with 4px margin
function shiftWithinViewport(coords: {top:number; left:number}, placement: InfoHintProps['placement'], panelW=240, panelH=120) {
  if (typeof window === 'undefined') return coords
  const margin = 4
  let { top, left } = coords
  const vw = window.innerWidth
  const vh = window.innerHeight
  // Horizontal clamp
  if (left < margin) left = margin
  if (left + panelW > vw - margin) left = Math.max(margin, vw - margin - panelW)
  // Vertical minimal clamp for extreme small viewports
  if (top < margin) top = margin
  if (top + panelH > vh - margin) top = Math.max(margin, vh - margin - panelH)
  return { top, left }
}
