import { cn } from '../ui/cn'
import { haptic } from '../ui/haptics'
import { TABS, type TabId } from './tabs'

export function BottomNav({ active, onSelect, badges }: { active: TabId; onSelect: (tab: TabId) => void; badges: Partial<Record<TabId, number | 'dot'>> }) {
  return (
    <nav aria-label="Secciones" className="relative z-40 shrink-0 border-t border-line bg-surface/92 pb-safe backdrop-blur-xl">
      <ul className="grid grid-cols-5 px-1.5 pt-1.5 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = id === active
          const badge = badges[id]
          return (
            <li key={id}>
              <button
                type="button"
                aria-current={selected ? 'page' : undefined}
                onClick={() => {
                  if (!selected) haptic(6)
                  onSelect(id)
                }}
                className="group flex h-[60px] w-full flex-col items-center justify-center gap-1 rounded-2xl outline-offset-[-2px]"
              >
                <span
                  className={cn(
                    'relative flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-active:scale-90',
                    selected ? 'bg-primary-soft text-primary-text' : 'text-muted group-hover:text-fg-2',
                  )}
                >
                  <Icon className={cn('size-[22px] transition-transform duration-300', selected && 'scale-110')} strokeWidth={selected ? 2.4 : 2} />
                  {badge === 'dot' ? (
                    <span className="absolute top-1 right-3 size-2.5 rounded-full bg-accent ring-2 ring-surface" />
                  ) : badge ? (
                    <span className="absolute -top-0.5 right-1.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span className={cn('text-[11px] leading-none font-semibold transition-colors', selected ? 'text-fg' : 'text-muted')}>{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
