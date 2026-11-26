import { Check, MapPin, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { formatDayChip, tripDays } from '../../domain/dates'
import { uid } from '../../domain/ids'
import { googleMapsSearch } from '../../domain/maps'
import type { Activity, ActivityTag } from '../../domain/types'
import { deleteActivity, restoreActivity, saveActivity } from '../../data/actions'
import { useMe, useTrip, useUpdate } from '../../hooks/useTrip'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { useConfirm } from '../../ui/Confirm'
import { Field, Select, TextArea, TextInput } from '../../ui/Field'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { ACTIVITY_TAGS, ACTIVITY_TAG_LIST } from '../meta'

export function ActivitySheet({ open, onClose, activity, defaultDate }: { open: boolean; onClose: () => void; activity?: Activity; defaultDate: string }) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const [title, setTitle] = useState(activity?.title ?? '')
  const [tag, setTag] = useState<ActivityTag>(activity?.tag ?? 'ocio')
  const [date, setDate] = useState(activity?.date ?? defaultDate)
  const [time, setTime] = useState(activity?.time ?? '')
  const [location, setLocation] = useState(activity?.location ?? '')
  const [notes, setNotes] = useState(activity?.notes ?? '')
  const [touched, setTouched] = useState(false)

  const days = tripDays(trip.meta)
  const dayOptions = days.some((d) => d.date === date) ? days : [...days, { date, index: 0 }].sort((a, b) => a.date.localeCompare(b.date))
  const proposal = activity?.proposalId ? trip.proposals.find((p) => p.id === activity.proposalId) : undefined

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    setTouched(true)
    if (!title.trim()) return
    const draft = {
      id: activity?.id ?? uid('a'),
      title: title.trim(),
      tag,
      date,
      time,
      location: location.trim(),
      notes: notes.trim(),
      order: activity?.order ?? 0,
      proposalId: activity?.proposalId,
      createdBy: activity?.createdBy ?? me.id,
    }
    update((t) => saveActivity(t, draft))
    toast(activity ? 'Plan actualizado' : 'Plan añadido al itinerario', { tone: 'success' })
    onClose()
  }

  const remove = async () => {
    if (!activity) return
    if (!(await confirm({ title: `¿Borrar «${activity.title}»?`, confirmLabel: 'Borrar' }))) return
    update((t) => deleteActivity(t, activity.id))
    onClose()
    toast('Plan borrado', {
      action: {
        label: 'Deshacer',
        onClick: () => update((t) => restoreActivity(t, activity)),
      },
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={activity ? 'Editar plan' : 'Nuevo plan'}
      subtitle={proposal ? `Viene de la votación «${proposal.title}»` : undefined}
      size="full"
      footer={
        <div className="flex gap-3">
          {activity && (
            <Button variant="danger" onClick={remove} aria-label="Borrar plan" icon={<Trash2 className="size-4" />}>
              Borrar
            </Button>
          )}
          <Button full onClick={() => save()} icon={<Check className="size-4" />}>
            {activity ? 'Guardar' : 'Añadir'}
          </Button>
        </div>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="¿Qué hacemos?" htmlFor="act-title" error={touched && !title.trim() ? 'Escribe un título' : undefined}>
          <TextInput id="act-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Cena en el puerto" maxLength={80} data-autofocus={!activity || undefined} />
        </Field>

        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">Etiqueta</p>
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
                    'press flex h-12 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold',
                    tag === t ? cn('border-transparent ring-2 ring-current', meta.chip) : 'border-line bg-surface text-fg-2',
                  )}
                >
                  <Icon className="size-4" /> {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Día" htmlFor="act-date">
            <Select id="act-date" value={date} onChange={(e) => setDate(e.target.value)}>
              {dayOptions.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.index ? `Día ${d.index} · ` : ''}
                  {formatDayChip(d.date)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Hora"
            htmlFor="act-time"
            hint={
              time ? (
                <button type="button" onClick={() => setTime('')} className="font-semibold text-primary-text">
                  Quitar la hora
                </button>
              ) : (
                'Sin hora: va al final del día'
              )
            }
          >
            <TextInput id="act-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        <Field
          label="Ubicación"
          htmlFor="act-location"
          hint={
            location.trim() ? (
              <a href={googleMapsSearch(location)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary-text">
                <MapPin className="size-3" /> Comprobar en el mapa
              </a>
            ) : (
              'Dirección o nombre del sitio: se abrirá en Google Maps o Apple Maps'
            )
          }
        >
          <TextInput id="act-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej. Mercado da Ribeira, Lisboa" maxLength={140} />
        </Field>

        <Field label="Notas rápidas" htmlFor="act-notes">
          <TextArea id="act-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reserva a nombre de…, llevar bañador, punto de encuentro…" maxLength={500} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
