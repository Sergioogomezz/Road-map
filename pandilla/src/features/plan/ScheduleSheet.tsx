import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { formatDayChip, todayISO, tripDays } from '../../domain/dates'
import type { ActivityTag, Proposal } from '../../domain/types'
import { scheduleProposal } from '../../data/actions'
import { navigate } from '../../hooks/useHashRoute'
import { useMe, useTrip, useUpdate } from '../../hooks/useTrip'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { confetti } from '../../ui/confetti'
import { Field, TextInput } from '../../ui/Field'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { ACTIVITY_TAGS, ACTIVITY_TAG_LIST } from '../meta'

/** Mueve una propuesta ganadora al itinerario de un día concreto. */
export function ScheduleSheet({ open, onClose, proposal }: { open: boolean; onClose: () => void; proposal: Proposal }) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const days = tripDays(trip.meta)
  const today = todayISO()
  const [date, setDate] = useState(days.find((d) => d.date >= today)?.date ?? days[0].date)
  const [time, setTime] = useState(proposal.kind === 'restaurante' ? '21:00' : '11:00')
  const [tag, setTag] = useState<ActivityTag>(proposal.kind === 'restaurante' ? 'comida' : 'ocio')

  const schedule = () => {
    update((t) => scheduleProposal(t, proposal.id, { date, time, tag }, me.id).trip)
    onClose()
    confetti()
    toast(`«${proposal.title}» añadido al itinerario`, {
      tone: 'success',
      action: { label: 'Ver', onClick: () => navigate(`plan/itinerario?dia=${date}`) },
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Añadir al itinerario"
      subtitle={proposal.title}
      footer={
        <Button full size="lg" onClick={schedule} icon={<CalendarPlus className="size-5" />}>
          Añadir al {formatDayChip(date)}
          {time ? ` a las ${time}` : ''}
        </Button>
      }
    >
      <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">¿Qué día?</p>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            aria-pressed={date === d.date}
            onClick={() => setDate(d.date)}
            className={cn(
              'press flex min-w-[72px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2',
              date === d.date ? 'border-transparent bg-fg text-bg' : 'border-line bg-surface text-fg-2',
            )}
          >
            <span className="text-[11px] font-bold uppercase opacity-70">Día {d.index}</span>
            <span className="font-display font-bold">{formatDayChip(d.date)}</span>
          </button>
        ))}
      </div>
      <Field label="Hora" htmlFor="sch-time" className="mt-4">
        <TextInput id="sch-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <p className="mt-4 mb-2 px-1 text-[13px] font-semibold text-fg-2">Etiqueta</p>
      <div className="grid grid-cols-2 gap-2">
        {ACTIVITY_TAG_LIST.map((t) => {
          const meta = ACTIVITY_TAGS[t]
          const Icon = meta.icon
          return (
            <button
              key={t}
              type="button"
              aria-pressed={tag === t}
              onClick={() => setTag(t)}
              className={cn(
                'press flex h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold',
                tag === t ? cn('border-transparent ring-2 ring-current', meta.chip) : 'border-line bg-surface text-fg-2',
              )}
            >
              <Icon className="size-4" /> {meta.label}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
