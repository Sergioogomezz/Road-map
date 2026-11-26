import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDownUp, CalendarPlus, Check, GripVertical, Vote } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { atLocal, formatDayChip, formatDayLong, todayISO, tripDays } from '../../domain/dates'
import { activitiesOfDay, isChronological, isPast } from '../../domain/itinerary'
import type { Activity } from '../../domain/types'
import { reorderDay, sortDayByTime } from '../../data/actions'
import { useHashRoute } from '../../hooks/useHashRoute'
import { useNow } from '../../hooks/useNow'
import { useTrip, useUpdate } from '../../hooks/useTrip'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { haptic } from '../../ui/haptics'
import { EmptyState, Fab } from '../../ui/misc'
import { useSheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { ACTIVITY_TAGS } from '../meta'
import { LocationLink } from '../shared'
import { ActivitySheet } from './ActivitySheet'

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

export function Itinerary() {
  const trip = useTrip()
  const update = useUpdate()
  const toast = useToast()
  const now = useNow(60_000)
  const [route, navigate] = useHashRoute()
  const sheet = useSheet<{ activity?: Activity; date: string }>()
  const chipsRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => {
    const base = tripDays(trip.meta).map((d) => ({ ...d, outside: false }))
    const known = new Set(base.map((d) => d.date))
    const extra = [...new Set(trip.activities.map((a) => a.date))].filter((d) => !known.has(d)).map((date) => ({ date, index: 0, outside: true }))
    return [...base, ...extra].sort((a, b) => a.date.localeCompare(b.date))
  }, [trip.meta, trip.activities])

  const today = todayISO()
  const requested = route.params.get('dia')
  const selected =
    (requested && days.find((d) => d.date === requested)?.date) || days.find((d) => d.date === today)?.date || days[0]?.date || today
  const list = activitiesOfDay(trip.activities, selected)
  const chronological = isChronological(list)

  useEffect(() => {
    const el = chipsRef.current?.querySelector<HTMLElement>(`[data-date="${selected}"]`)
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [selected])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = list.map((a) => a.id)
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    haptic(10)
    update((t) => reorderDay(t, selected, next))
  }

  return (
    <div className="pb-4">
      <div ref={chipsRef} className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-1 pb-3">
        {days.map((d) => {
          const active = d.date === selected
          const count = trip.activities.filter((a) => a.date === d.date).length
          return (
            <button
              key={d.date}
              data-date={d.date}
              type="button"
              aria-pressed={active}
              onClick={() => navigate(`plan/itinerario?dia=${d.date}`, { replace: true })}
              className={cn(
                'press relative flex min-w-[76px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2 transition-colors',
                active ? 'border-transparent bg-fg text-bg shadow-card' : 'border-line bg-surface text-fg-2',
              )}
            >
              <span className={cn('text-[11px] font-bold tracking-wide uppercase', active ? 'opacity-70' : 'text-muted')}>{d.outside ? 'Fuera' : `Día ${d.index}`}</span>
              <span className="font-display text-[17px] font-bold">{formatDayChip(d.date)}</span>
              <span className={cn('mt-0.5 text-[11px] font-semibold', active ? 'opacity-70' : 'text-muted')}>{count ? `${count} planes` : 'libre'}</span>
              {d.date === today && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" aria-label="Hoy" />}
            </button>
          )
        })}
      </div>

      <div className="px-5 pb-2">
        <h2 className="truncate font-display text-lg font-bold first-letter:uppercase">{formatDayLong(selected)}</h2>
        {!chronological && (
          <button
            type="button"
            onClick={() => {
              update((t) => sortDayByTime(t, selected))
              toast('Ordenado por hora', { tone: 'success' })
            }}
            className="press mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary-soft px-3 text-sm font-semibold text-primary-text"
          >
            <ArrowDownUp className="size-4" /> El orden no sigue la hora · Ordenar por hora
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="size-7" />}
          title="Día libre"
          text="Añade un plan o mira qué ha ganado en las votaciones."
          action={
            <div className="flex gap-2">
              <Button onClick={() => sheet.open({ date: selected })} icon={<CalendarPlus className="size-4" />}>
                Añadir plan
              </Button>
              <Button variant="secondary" onClick={() => navigate('plan/votaciones')} icon={<Vote className="size-4" />}>
                Votaciones
              </Button>
            </div>
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <ol className="relative px-4">
              {list.map((a, i) => (
                <ActivityRow key={a.id} activity={a} now={now} last={i === list.length - 1} onOpen={() => sheet.open({ activity: a, date: a.date })} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
      {list.length > 1 && <p className="px-5 pt-2 text-center text-xs text-muted">Mantén pulsado ⋮⋮ y arrastra para reordenar</p>}

      <Fab label="Añadir plan" onClick={() => sheet.open({ date: selected })} />
      {sheet.state && (
        <ActivitySheet
          key={sheet.state.key}
          open={sheet.state.open}
          onClose={sheet.close}
          activity={sheet.state.target?.activity}
          defaultDate={sheet.state.target?.date ?? selected}
        />
      )}
    </div>
  )
}

function ActivityRow({ activity, now, last, onOpen }: { activity: Activity; now: Date; last: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id })
  const meta = ACTIVITY_TAGS[activity.tag]
  const Icon = meta.icon
  const past = isPast(activity, now)
  const start = activity.time ? atLocal(activity.date, activity.time).getTime() : 0
  const live = Boolean(activity.time) && start <= now.getTime() && now.getTime() - start < 60 * 60_000

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative flex gap-3 pb-3', isDragging && 'z-20')}
    >
      <div className="flex w-12 shrink-0 flex-col items-end pt-3.5">
        <span className={cn('tabular text-[15px] font-bold', past ? 'text-muted' : 'text-fg')}>{activity.time || '—'}</span>
      </div>
      <div className="relative flex w-4 shrink-0 justify-center">
        {!last && <span className="absolute top-6 -bottom-3 w-0.5 rounded-full bg-line-strong" aria-hidden />}
        <span
          className={cn(
            'relative mt-4 flex size-4 items-center justify-center rounded-full ring-4 ring-bg',
            past ? 'bg-surface-3' : meta.dot,
            live && 'animate-pulse',
          )}
        >
          {past && <Check className="size-2.5 text-fg-2" strokeWidth={4} />}
        </span>
      </div>
      <div
        className={cn(
          'relative flex min-w-0 flex-1 items-stretch rounded-3xl border bg-surface shadow-card transition-shadow',
          live ? 'border-primary ring-2 ring-primary/25' : 'border-line',
          past && 'opacity-65',
          isDragging && 'shadow-pop ring-2 ring-primary/40',
        )}
      >
        <div className="relative min-w-0 flex-1 p-3.5">
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Editar ${activity.title}`}
            className="absolute inset-0 rounded-l-3xl transition-colors hover:bg-surface-2/50 active:bg-surface-2"
          />
          <div className="pointer-events-none relative">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', meta.chip)}>
                <Icon className="size-3" /> {meta.label}
              </span>
              {live && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-bold text-success-text">Ahora</span>}
              {activity.proposalId && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">Votado ✓</span>}
            </div>
            <p className="mt-1.5 text-[15px] leading-snug font-bold">{activity.title}</p>
            {activity.location && (
              <div className="pointer-events-auto mt-1 flex max-w-full">
                <LocationLink location={activity.location} />
              </div>
            )}
            {activity.notes && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed whitespace-pre-line text-muted">{activity.notes}</p>}
          </div>
        </div>
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Reordenar ${activity.title}`}
          className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-r-3xl border-l border-line text-muted hover:bg-surface-2 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" />
        </button>
      </div>
    </li>
  )
}
