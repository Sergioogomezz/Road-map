import { Check } from 'lucide-react'
import type { ID, Member } from '../domain/types'
import { Avatar } from './Avatar'
import { cn } from './cn'

interface BaseProps {
  members: Member[]
  meId?: ID
  className?: string
  disabledIds?: ID[]
  hint?: (m: Member) => string | undefined
}

function Chip({ member, selected, onClick, me, disabled, hint }: { member: Member; selected: boolean; onClick: () => void; me: boolean; disabled?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'press flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm font-semibold transition-colors',
        selected ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-fg-2 hover:bg-surface-2',
      )}
    >
      <span className="relative">
        <Avatar member={member} size="sm" />
        {selected && (
          <span className="absolute -right-1 -bottom-1 flex size-4 animate-pop items-center justify-center rounded-full bg-primary text-primary-fg ring-2 ring-surface">
            <Check className="size-2.5" strokeWidth={4} />
          </span>
        )}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span>
          {member.name}
          {me && <span className="font-normal text-muted"> (tú)</span>}
        </span>
        {hint && <span className="text-[11px] font-normal text-muted">{hint}</span>}
      </span>
    </button>
  )
}

export function MemberPicker({ members, value, onChange, meId, className, disabledIds, hint }: BaseProps & { value: ID | undefined; onChange: (id: ID) => void }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="radiogroup">
      {members.map((m) => (
        <Chip key={m.id} member={m} me={m.id === meId} selected={value === m.id} onClick={() => onChange(m.id)} disabled={disabledIds?.includes(m.id)} hint={hint?.(m)} />
      ))}
    </div>
  )
}

export function MemberMultiPicker({ members, value, onChange, meId, className, disabledIds, hint }: BaseProps & { value: ID[]; onChange: (ids: ID[]) => void }) {
  const toggle = (id: ID) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {members.map((m) => (
        <Chip key={m.id} member={m} me={m.id === meId} selected={value.includes(m.id)} onClick={() => toggle(m.id)} disabled={disabledIds?.includes(m.id)} hint={hint?.(m)} />
      ))}
    </div>
  )
}
