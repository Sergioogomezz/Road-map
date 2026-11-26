import { cn } from './cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  badge?: number
}

/** Control segmentado con indicador deslizante (pestañas dentro de una pantalla). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: SegmentOption<T>[]
  className?: string
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div role="tablist" className={cn('relative grid rounded-2xl bg-surface-2 p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-xl bg-surface shadow-card transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'press relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-colors',
              active ? 'text-fg' : 'text-muted hover:text-fg-2',
            )}
          >
            <span className="truncate">{o.label}</span>
            {o.badge ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{o.badge}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
