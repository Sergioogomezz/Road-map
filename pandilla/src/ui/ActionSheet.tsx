import type { ReactNode } from 'react'
import { cn } from './cn'
import { Sheet } from './Sheet'

export interface Action {
  label: string
  icon?: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
  hint?: string
  disabled?: boolean
}

/** Menú de acciones en hoja inferior (sustituye a los menús contextuales en móvil). */
export function ActionSheet({ open, onClose, title, actions }: { open: boolean; onClose: () => void; title: ReactNode; actions: Action[] }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <ul className="-mx-2 flex flex-col">
        {actions.map((a) => (
          <li key={a.label}>
            <button
              type="button"
              disabled={a.disabled}
              onClick={() => {
                onClose()
                a.onSelect()
              }}
              className={cn(
                'press flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px] font-semibold hover:bg-surface-2 disabled:opacity-40',
                a.tone === 'danger' ? 'text-danger-text' : 'text-fg',
              )}
            >
              {a.icon && <span className={cn('flex size-9 items-center justify-center rounded-xl', a.tone === 'danger' ? 'bg-danger-soft' : 'bg-surface-2')}>{a.icon}</span>}
              <span className="flex flex-col">
                {a.label}
                {a.hint && <span className="text-xs font-normal text-muted">{a.hint}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
