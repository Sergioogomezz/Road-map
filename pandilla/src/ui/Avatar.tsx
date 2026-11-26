import type { Member } from '../domain/types'
import { cn } from './cn'

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = (s: string) => Array.from(s)[0] ?? ''
  if (parts.length === 1) return first(parts[0]).toLocaleUpperCase('es-ES')
  return (first(parts[0]) + first(parts[1])).toLocaleUpperCase('es-ES')
}

const sizes = {
  xs: 'size-5 text-[9px]',
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-[13px]',
  lg: 'size-12 text-base',
  xl: 'size-16 text-xl',
}

export function Avatar({
  member,
  size = 'md',
  className,
  ring,
}: {
  member: Pick<Member, 'name' | 'color'> | undefined
  size?: keyof typeof sizes
  className?: string
  ring?: boolean
}) {
  const name = member?.name ?? '?'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white',
        sizes[size],
        ring && 'ring-2 ring-surface',
        className,
      )}
      style={{ backgroundColor: member?.color ?? '#9a97a6' }}
      title={name}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ members, max = 4, size = 'sm' }: { members: (Member | undefined)[]; max?: number; size?: keyof typeof sizes }) {
  const list = members.filter((m): m is Member => Boolean(m))
  const shown = list.slice(0, max)
  const rest = list.length - shown.length
  return (
    <span className="inline-flex items-center -space-x-1.5" aria-label={list.map((m) => m.name).join(', ')}>
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} ring />
      ))}
      {rest > 0 && (
        <span className={cn('inline-flex items-center justify-center rounded-full bg-surface-3 font-bold text-fg-2 ring-2 ring-surface', sizes[size])}>
          +{rest}
        </span>
      )}
    </span>
  )
}
