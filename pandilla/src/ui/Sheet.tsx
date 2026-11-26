import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'
import { useFrameLayers } from './Frame'
import { IconButton } from './Button'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** `full`: ocupa casi toda la altura (formularios largos). */
  size?: 'auto' | 'full'
  /** Sin cabecera visible (p. ej. visor). */
  bare?: boolean
  className?: string
}

const EXIT_MS = 220

/** Hojas abiertas, de abajo arriba: Escape solo cierra la de arriba. */
const openStack: symbol[] = []

/**
 * Hoja inferior modal: se cierra con la X, tocando fuera, con Escape o
 * arrastrando hacia abajo desde la cabecera.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, size = 'auto', bare, className }: SheetProps) {
  const { overlay } = useFrameLayers()
  const [mounted, setMounted] = useState(open)
  const [leaving, setLeaving] = useState(false)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [entered, setEntered] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ y: number; t: number } | null>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (open) {
      setMounted(true)
      setLeaving(false)
      setDrag(0)
      setEntered(false)
      return
    }
    if (!mounted) return
    setLeaving(true)
    const t = window.setTimeout(() => {
      setMounted(false)
      setLeaving(false)
    }, EXIT_MS)
    return () => window.clearTimeout(t)
  }, [open, mounted])

  // Foco: entra en la hoja al abrir y vuelve al botón que la abrió al cerrar.
  useEffect(() => {
    if (!open) return
    restoreFocus.current = document.activeElement as HTMLElement | null
    const id = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const auto = panel.querySelector<HTMLElement>('[data-autofocus]')
      ;(auto ?? panel).focus({ preventScroll: true })
    }, 60)
    return () => {
      window.clearTimeout(id)
      restoreFocus.current?.focus?.({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const me = Symbol('sheet')
    openStack.push(me)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === me) {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const i = openStack.indexOf(me)
      if (i !== -1) openStack.splice(i, 1)
    }
  }, [open])

  if (!mounted || !overlay) return null

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) return
    dragStart.current = { y: e.clientY, t: performance.now() }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!dragStart.current) return
    setDrag(Math.max(0, e.clientY - dragStart.current.y))
  }
  const onPointerUp = (e: PointerEvent) => {
    if (!dragStart.current) return
    const dy = e.clientY - dragStart.current.y
    const velocity = dy / Math.max(1, performance.now() - dragStart.current.t)
    dragStart.current = null
    setDragging(false)
    if (dy > 110 || velocity > 0.6) onClose()
    else setDrag(0)
  }

  return createPortal(
    <div className="pointer-events-auto absolute inset-0" role="presentation">
      <div
        className={cn('absolute inset-0 bg-black/45 transition-opacity duration-200', leaving ? 'opacity-0' : 'animate-fade-in')}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] bg-surface shadow-pop outline-none',
          size === 'full' ? 'h-[94%]' : 'max-h-[94%]',
          leaving ? 'translate-y-full transition-transform duration-200 ease-in' : !entered ? 'animate-sheet-in' : !dragging && 'transition-transform duration-200',
          className,
        )}
        style={drag && !leaving ? { transform: `translateY(${drag}px)` } : undefined}
        onAnimationEnd={(e) => e.target === e.currentTarget && setEntered(true)}
      >
        <div
          className="shrink-0 cursor-grab touch-none select-none px-5 pt-2.5 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-strong" />
          <div className={cn('flex items-start gap-3 pb-3', bare && 'sr-only')}>
            <div className="min-w-0 flex-1 pt-1">
              <h2 id={titleId} className="font-display text-xl font-bold leading-tight tracking-tight">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
            </div>
            <IconButton label="Cerrar" variant="soft" size="sm" onClick={onClose} className="mt-0.5">
              <X className="size-4" />
            </IconButton>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-surface px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    overlay,
  )
}

/** Estado típico para abrir una hoja con un objetivo (crear o editar). */
export function useSheet<T = undefined>() {
  const [state, setState] = useState<{ key: number; open: boolean; target: T | undefined } | null>(null)
  return {
    state,
    open: (target?: T) => setState({ key: Date.now(), open: true, target }),
    close: () => setState((s) => (s ? { ...s, open: false } : s)),
  }
}
