import { Check, Globe, Loader2, Trash2, UserPlus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { CURRENCIES, currencyInfo, fetchOnlineRates } from '../../domain/currency'
import type { ID, Member } from '../../domain/types'
import { addMember, MEMBER_COLORS, memberBlockers, removeMember, setRates, updateAccommodation, updateMember, updateMeta } from '../../data/actions'
import { useMe, useTrip, useUpdate } from '../../hooks/useTrip'
import { useOnline } from '../../hooks/useOnline'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { useConfirm } from '../../ui/Confirm'
import { Field, TextArea, TextInput } from '../../ui/Field'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { TRIP_EMOJIS } from '../meta'
import { parseAmount } from '../../domain/money'

interface SheetProps {
  open: boolean
  onClose: () => void
}

// ─── Perfil ─────────────────────────────────────────────────────────────────

export function ProfileSheet({ open, onClose }: SheetProps) {
  const me = useMe()
  return <MemberEditor key={`${me.id}-${open}`} open={open} onClose={onClose} member={me} isMe />
}

function MemberEditor({ open, onClose, member, isMe }: SheetProps & { member: Member; isMe?: boolean }) {
  const trip = useTrip()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const [name, setName] = useState(member.name)
  const [color, setColor] = useState(member.color)
  const [bizum, setBizum] = useState(member.bizum ?? '')
  const [revolut, setRevolut] = useState(member.revolut ?? '')
  const blockers = memberBlockers(trip, member.id)

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    if (!name.trim()) return
    update((t) => updateMember(t, member.id, { name: name.trim(), color, bizum: bizum.trim() || undefined, revolut: revolut.trim() || undefined }))
    toast('Perfil guardado', { tone: 'success' })
    onClose()
  }

  const remove = async () => {
    if (blockers.length) {
      toast(`No se puede quitar: ${blockers.join(', ')}`, { tone: 'danger' })
      return
    }
    if (!(await confirm({ title: `¿Quitar a ${member.name} del viaje?`, message: 'Se borrarán sus votos y reacciones, y saldrá de coches y subgrupos.', confirmLabel: 'Quitar' }))) return
    update((t) => removeMember(t, member.id))
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isMe ? 'Tu perfil' : `Editar a ${member.name}`}
      footer={
        <div className="flex gap-3">
          {!isMe && (
            <Button variant="danger" onClick={remove} icon={<Trash2 className="size-4" />} aria-label="Quitar del viaje">
              Quitar
            </Button>
          )}
          <Button full onClick={() => save()} disabled={!name.trim()} icon={<Check className="size-4" />}>
            Guardar
          </Button>
        </div>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="flex justify-center py-2">
          <Avatar member={{ name: name || '?', color }} size="xl" />
        </div>
        <Field label="Nombre" htmlFor="pf-name">
          <TextInput id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        </Field>
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">Color</p>
          <div className="flex flex-wrap gap-2.5">
            {MEMBER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
                className={cn('press size-9 rounded-full ring-offset-2 ring-offset-surface', c === color && 'ring-2 ring-fg')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <Field label="Bizum (teléfono)" hint="Opcional. Aparece cuando alguien tenga que pagarte." htmlFor="pf-bizum">
          <TextInput id="pf-bizum" value={bizum} onChange={(e) => setBizum(e.target.value)} inputMode="tel" placeholder="6XX XXX XXX" maxLength={20} />
        </Field>
        <Field label="Revolut" hint="Opcional. Tu @usuario de Revolut." htmlFor="pf-revolut">
          <TextInput id="pf-revolut" value={revolut} onChange={(e) => setRevolut(e.target.value)} placeholder="@usuario" maxLength={40} autoCapitalize="none" />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}

// ─── Datos del viaje ────────────────────────────────────────────────────────

export function TripInfoSheet({ open, onClose }: SheetProps) {
  const trip = useTrip()
  return <TripInfoForm key={String(open)} open={open} onClose={onClose} meta={trip.meta} />
}

function TripInfoForm({ open, onClose, meta }: SheetProps & { meta: ReturnType<typeof useTrip>['meta'] }) {
  const update = useUpdate()
  const toast = useToast()
  const [name, setName] = useState(meta.name)
  const [destination, setDestination] = useState(meta.destination)
  const [emoji, setEmoji] = useState(meta.emoji)
  const [startDate, setStartDate] = useState(meta.startDate)
  const [endDate, setEndDate] = useState(meta.endDate)
  const valid = name.trim() && startDate && endDate >= startDate

  const save = () => {
    if (!valid) return
    update((t) => updateMeta(t, { name: name.trim(), destination: destination.trim(), emoji, startDate, endDate }))
    toast('Viaje actualizado', { tone: 'success' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Datos del viaje"
      footer={
        <Button full onClick={save} disabled={!valid} icon={<Check className="size-4" />}>
          Guardar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {TRIP_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={emoji === e}
              onClick={() => setEmoji(e)}
              className={cn('press flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl', emoji === e ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}
            >
              {e}
            </button>
          ))}
        </div>
        <Field label="Nombre" htmlFor="ti-name">
          <TextInput id="ti-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>
        <Field label="Destino" htmlFor="ti-dest">
          <TextInput id="ti-dest" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={60} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ida" htmlFor="ti-start">
            <TextInput id="ti-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Vuelta" htmlFor="ti-end" error={endDate < startDate ? 'Antes de la ida' : undefined}>
            <TextInput id="ti-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
      </div>
    </Sheet>
  )
}

// ─── Alojamiento ────────────────────────────────────────────────────────────

export function AccommodationSheet({ open, onClose }: SheetProps) {
  const trip = useTrip()
  return <AccommodationForm key={String(open)} open={open} onClose={onClose} acc={trip.meta.accommodation} phrase={trip.meta.taxiPhrase ?? ''} />
}

function AccommodationForm({ open, onClose, acc, phrase }: SheetProps & { acc: ReturnType<typeof useTrip>['meta']['accommodation']; phrase: string }) {
  const update = useUpdate()
  const toast = useToast()
  const [form, setForm] = useState({ name: acc.name, address: acc.address, phone: acc.phone ?? '', checkIn: acc.checkIn ?? '', checkOut: acc.checkOut ?? '', notes: acc.notes ?? '' })
  const [taxiPhrase, setTaxiPhrase] = useState(phrase)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = () => {
    update((t) => updateMeta(updateAccommodation(t, form), { taxiPhrase: taxiPhrase.trim() || undefined }))
    toast('Alojamiento guardado', { tone: 'success' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Alojamiento y modo taxi"
      size="full"
      footer={
        <Button full onClick={save} icon={<Check className="size-4" />}>
          Guardar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nombre" htmlFor="ac-name">
          <TextInput id="ac-name" value={form.name} onChange={set('name')} placeholder="Hotel, Airbnb, casa rural…" maxLength={80} />
        </Field>
        <Field label="Dirección exacta" hint="Es lo que verá el taxista en grande y lo que se abre en el GPS." htmlFor="ac-address">
          <TextArea id="ac-address" rows={2} value={form.address} onChange={set('address')} placeholder="Calle, número, código postal, ciudad" maxLength={160} />
        </Field>
        <Field label="Teléfono del alojamiento" htmlFor="ac-phone">
          <TextInput id="ac-phone" value={form.phone} onChange={set('phone')} inputMode="tel" maxLength={25} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in" htmlFor="ac-in">
            <TextInput id="ac-in" type="time" value={form.checkIn} onChange={set('checkIn')} />
          </Field>
          <Field label="Check-out" htmlFor="ac-out">
            <TextInput id="ac-out" type="time" value={form.checkOut} onChange={set('checkOut')} />
          </Field>
        </div>
        <Field label="Notas (llaves, wifi…)" htmlFor="ac-notes">
          <TextArea id="ac-notes" value={form.notes} onChange={set('notes')} maxLength={300} />
        </Field>
        <Field label="Frase para el taxista en el idioma local" hint="Opcional. Se muestra en el modo taxi." htmlFor="ac-phrase">
          <TextInput id="ac-phrase" value={taxiPhrase} onChange={(e) => setTaxiPhrase(e.target.value)} placeholder="Ej. Per favore, mi porti qui" maxLength={120} />
        </Field>
      </div>
    </Sheet>
  )
}

// ─── Personas ───────────────────────────────────────────────────────────────

export function MembersSheet({ open, onClose }: SheetProps) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: ID; key: number } | null>(null)
  const editingMember = trip.members.find((m) => m.id === editing?.id)

  const add = (e: FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    update((t) => addMember(t, clean).trip)
    setName('')
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Personas" subtitle={`${trip.members.length} en el viaje`}>
        <ul className="flex flex-col gap-1">
          {trip.members.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setEditing({ id: m.id, key: Date.now() })} className="press flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-surface-2">
                <Avatar member={m} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {m.name} {m.id === me.id && <span className="font-normal text-muted">(tú)</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{[m.bizum && `Bizum ${m.bizum}`, m.revolut].filter(Boolean).join(' · ') || 'Sin datos de pago'}</span>
                </span>
                <span className="text-sm font-semibold text-primary-text">Editar</span>
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="mt-4 flex gap-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de alguien nuevo" aria-label="Nombre" maxLength={30} />
          <Button type="submit" disabled={!name.trim()} icon={<UserPlus className="size-4" />} className="shrink-0">
            Añadir
          </Button>
        </form>
      </Sheet>
      {editingMember && editing && (
        <MemberEditor key={editing.key} open={Boolean(editing)} onClose={() => setEditing(null)} member={editingMember} isMe={editingMember.id === me.id} />
      )}
    </>
  )
}

// ─── Divisas ────────────────────────────────────────────────────────────────

export function RatesSheet({ open, onClose }: SheetProps) {
  const trip = useTrip()
  const update = useUpdate()
  const toast = useToast()
  const online = useOnline()
  const [loading, setLoading] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const used = useMemo(() => new Set(trip.expenses.map((e) => e.currency)), [trip.expenses])
  const list = useMemo(() => {
    const codes = CURRENCIES.map((c) => c.code).filter((c) => c !== 'EUR')
    return [...codes.filter((c) => used.has(c)), ...codes.filter((c) => !used.has(c))]
  }, [used])

  const refresh = async () => {
    setLoading(true)
    try {
      const { values, date } = await fetchOnlineRates()
      update((t) => setRates(t, values, 'online', date))
      setDrafts({})
      toast(`Tipos del BCE actualizados${date ? ` (${date})` : ''}`, { tone: 'success' })
    } catch {
      toast('No se pudieron descargar. Se mantienen los tipos actuales.', { tone: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  const commit = (code: string) => {
    const raw = drafts[code]
    if (raw === undefined) return
    const value = parseAmount(raw)
    if (value && value > 0 && value !== trip.rates.values[code]) {
      update((t) => setRates(t, { [code]: value }, 'manual'))
      toast(`1 € = ${value.toLocaleString('es-ES')} ${code}`, { tone: 'success' })
    }
    setDrafts((d) => {
      const next = { ...d }
      delete next[code]
      return next
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Divisas" subtitle="Los gastos se convierten a euros con estos tipos. Cada gasto guarda el tipo del día en que se apuntó." size="full">
      <Button full variant="soft" onClick={refresh} disabled={loading || !online} icon={loading ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}>
        {online ? 'Actualizar con los tipos del BCE' : 'Sin conexión para actualizar'}
      </Button>
      <p className="mt-2 text-center text-xs text-muted">
        {trip.rates.source === 'online' ? `Tipos de referencia del BCE del ${trip.rates.date}` : trip.rates.source === 'manual' ? 'Tienes tipos editados a mano' : 'Tipos aproximados para funcionar sin conexión'}
      </p>
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {list.map((code) => {
          const info = currencyInfo(code)
          const value = trip.rates.values[code]
          return (
            <li key={code} className="flex items-center gap-3 py-2.5">
              <span className="text-2xl" aria-hidden>
                {info.flag}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {code} {used.has(code) && <span className="ml-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary-text">EN USO</span>}
                </span>
                <span className="block truncate text-xs text-muted">{info.name}</span>
              </span>
              <span className="text-sm text-muted">1 € =</span>
              <input
                inputMode="decimal"
                aria-label={`Unidades de ${code} por euro`}
                className="tabular h-10 w-24 rounded-xl border border-transparent bg-surface-2 px-2 text-right font-semibold outline-none focus:border-primary focus:bg-surface"
                value={drafts[code] ?? (value ? value.toLocaleString('es-ES', { maximumFractionDigits: 4 }) : '')}
                onChange={(e) => setDrafts((d) => ({ ...d, [code]: e.target.value }))}
                onBlur={() => commit(code)}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}
