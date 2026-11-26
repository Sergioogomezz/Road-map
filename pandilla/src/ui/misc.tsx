import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { cn } from './cn'
import { useFrameLayers } from './Frame'
import { haptic } from './haptics'

export function Card({ children, className, as: Tag = 'div', ...rest }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'li' } & Record<string, unknown>) {
  return (
    <Tag className={cn('rounded-3xl border border-line bg-surface shadow-card', className)} {...rest}>
      {children}
    </Tag>
  )
}

export function EmptyState({ icon, title, text, action, className }: { icon: ReactNode; title: string; text?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-surface-2 text-3xl text-muted">{icon}</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Botón flotante principal de la pantalla (zona del pulgar). */
export function Fab({ label, onClick, icon }: { label: string; onClick: () => void; icon?: ReactNode }) {
  const { fab } = useFrameLayers()
  if (!fab) return null
  return createPortal(
    <button
      type="button"
      onClick={() => {
        haptic()
        onClick()
      }}
      className="press pointer-events-auto flex h-14 animate-pop items-center gap-2 rounded-[22px] bg-primary pr-5 pl-4 font-semibold text-primary-fg shadow-[0_14px_30px_-10px_var(--primary)]"
    >
      {icon ?? <Plus className="size-6" strokeWidth={2.5} />}
      <span>{label}</span>
    </button>,
    fab,
  )
}

export function ScreenHeader({ title, subtitle, actions, children }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/85 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[28px] leading-none font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children && <div className="px-5 pb-3">{children}</div>}
    </header>
  )
}

export function FilterChip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line bg-surface text-fg-2 hover:bg-surface-2',
      )}
    >
      {children}
      {count !== undefined && <span className={cn('tabular text-xs', active ? 'opacity-70' : 'text-muted')}>{count}</span>}
    </button>
  )
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-1', className)}>
      <h2 className="text-[13px] font-bold tracking-wide text-muted uppercase">{children}</h2>
      {action}
    </div>
  )
}

export function ProgressBar({ value, className, tone = 'primary' }: { value: number; className?: string; tone?: 'primary' | 'success' }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-surface-2', className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', tone === 'success' ? 'bg-success' : 'bg-primary')}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  )
}
