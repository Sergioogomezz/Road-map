import { CarFront, Check, ChevronDown, Fuel, KeyRound, Minus, Pencil, Plus, Trash2, TriangleAlert, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { formatDayChip, todayISO, tripDays } from '../../domain/dates'
import { now, uid } from '../../domain/ids'
import { expenseCents, formatEUR } from '../../domain/money'
import type { Car, DriveShift, ID } from '../../domain/types'
import { deleteCar, put, saveCar } from '../../data/actions'
import { useMe, useMembersById, useTrip, useUpdate } from '../../hooks/useTrip'
import { Avatar } from '../../ui/Avatar'
import { Button, IconButton } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { useConfirm } from '../../ui/Confirm'
import { Field, Select, TextInput } from '../../ui/Field'
import { MemberMultiPicker } from '../../ui/MemberPicker'
import { Card, EmptyState, Fab } from '../../ui/misc'
import { Sheet, useSheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { ExpenseSheet, type ExpensePrefill } from '../expenses/ExpenseSheet'

export function Cars() {
  const trip = useTrip()
  const update = useUpdate()
  const carSheet = useSheet<Car>()
  const expenseSheet = useSheet<ExpensePrefill>()
  const riding = new Set(trip.cars.flatMap((c) => c.passengerIds))
  const without = trip.members.filter((m) => !riding.has(m.id))
  const cars = [...trip.cars].sort((a, b) => a.createdAt - b.createdAt)

  return (
    <div className="px-4 pb-4">
      <p className="px-1 text-sm text-muted">
        Quién va en cada coche y quién conduce. Cada coche tiene su subgrupo de gastos para repartir gasolina, peajes y parkings solo entre sus ocupantes.
      </p>

      {cars.length === 0 ? (
        <EmptyState
          icon={<CarFront className="size-7" />}
          title="¿Vais en coche?"
          text="Es opcional: añade los coches del viaje y reparte asientos y turnos de conducción."
          action={
            <Button onClick={() => carSheet.open()} icon={<Plus className="size-4" />}>
              Añadir coche
            </Button>
          }
        />
      ) : (
        <>
          {without.length > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-3xl bg-warning-soft p-3.5 text-sm text-warning-text">
              <TriangleAlert className="size-5 shrink-0" />
              <span className="flex-1">
                Sin coche: <strong>{without.map((m) => m.name).join(', ')}</strong>
              </span>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-4">
            {cars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onEdit={() => carSheet.open(car)}
                onFuel={() => expenseSheet.open({ title: `Gasolina · ${car.name}`, category: 'transporte', subgroupId: car.subgroupId })}
                onAssign={(id) => update((t) => saveCar(t, { ...car, passengerIds: [...car.passengerIds, id] }))}
                unassigned={without.map((m) => m.id)}
              />
            ))}
          </div>
        </>
      )}

      <Fab label="Añadir coche" onClick={() => carSheet.open()} icon={<CarFront className="size-5" />} />
      {carSheet.state && <CarSheet key={carSheet.state.key} open={carSheet.state.open} onClose={carSheet.close} car={carSheet.state.target} />}
      {expenseSheet.state && <ExpenseSheet key={expenseSheet.state.key} open={expenseSheet.state.open} onClose={expenseSheet.close} prefill={expenseSheet.state.target} />}
    </div>
  )
}

function CarCard({ car, onEdit, onFuel, onAssign, unassigned }: { car: Car; onEdit: () => void; onFuel: () => void; onAssign: (id: ID) => void; unassigned: ID[] }) {
  const trip = useTrip()
  const byId = useMembersById()
  const update = useUpdate()
  const [shiftsOpen, setShiftsOpen] = useState(false)
  const carExpenses = trip.expenses.filter((e) => e.split.mode === 'subgrupo' && e.split.subgroupId === car.subgroupId)
  const spent = carExpenses.reduce((acc, e) => acc + expenseCents(e), 0)
  const seats = Array.from({ length: Math.max(car.seats, car.passengerIds.length) }, (_, i) => car.passengerIds[i])
  const today = todayISO()
  const todayShift = car.shifts.find((s) => s.date === today)

  return (
    <Card as="article" className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/14 text-amber-800 dark:text-amber-300">
          <CarFront className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold">{car.name}</h3>
          <p className="truncate text-sm text-muted">{[car.model, car.plate].filter(Boolean).join(' · ') || 'Sin datos del coche'}</p>
          {todayShift?.driverId && (
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-text">
              <KeyRound className="size-3" /> Hoy conduce {byId.get(todayShift.driverId)?.name}
            </p>
          )}
        </div>
        <IconButton label={`Editar ${car.name}`} variant="soft" size="sm" onClick={onEdit}>
          <Pencil className="size-4" />
        </IconButton>
      </div>

      <div className="grid grid-cols-5 gap-2 px-4">
        {seats.map((id, i) => {
          const m = id ? byId.get(id) : undefined
          const driver = id ? car.driverIds.includes(id) : false
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              {m ? (
                <span className="relative">
                  <Avatar member={m} size="lg" />
                  {driver && (
                    <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-fg text-bg ring-2 ring-surface" title="Puede conducir">
                      <KeyRound className="size-3" />
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-line-strong text-xs text-muted">libre</span>
              )}
              <span className="w-full truncate text-center text-[11px] font-semibold text-fg-2">{m?.name ?? ''}</span>
            </div>
          )
        })}
      </div>
      {unassigned.length > 0 && car.passengerIds.length < car.seats && (
        <div className="no-scrollbar mt-1 flex gap-2 overflow-x-auto px-4 pb-1">
          {unassigned.map((id) => (
            <button key={id} type="button" onClick={() => onAssign(id)} className="press inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 text-xs font-semibold text-fg-2">
              <Plus className="size-3.5" /> {byId.get(id)?.name}
            </button>
          ))}
        </div>
      )}

      <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">Gastos de «{car.name}»</p>
          <p className="text-xs text-muted">
            {carExpenses.length} {carExpenses.length === 1 ? 'gasto' : 'gastos'} · {formatEUR(spent)} entre {car.passengerIds.length}
          </p>
        </div>
        <Button size="sm" onClick={onFuel} icon={<Fuel className="size-4" />} disabled={!car.passengerIds.length}>
          Gasolina / peaje
        </Button>
      </div>

      <div className="mt-3 border-t border-line">
        <button type="button" onClick={() => setShiftsOpen((v) => !v)} aria-expanded={shiftsOpen} className="press flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold">
          <KeyRound className="size-4 text-muted" />
          <span className="flex-1">Turnos de conducción ({car.shifts.length})</span>
          <ChevronDown className={cn('size-4 text-muted transition-transform', shiftsOpen && 'rotate-180')} />
        </button>
        {shiftsOpen && (
          <div className="animate-fade-in px-4 pb-4">
            {car.shifts.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {[...car.shifts]
                  .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
                  .map((s) => {
                    const d = s.driverId ? byId.get(s.driverId) : undefined
                    return (
                      <li key={s.id} className={cn('flex items-center gap-2 rounded-2xl px-2.5 py-2', s.date === today ? 'bg-primary-soft' : 'bg-surface-2')}>
                        <span className="w-14 shrink-0 text-xs font-bold text-muted">{s.date ? formatDayChip(s.date) : '—'}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>
                        {d && <Avatar member={d} size="xs" />}
                        <span className="w-14 truncate text-xs font-semibold">{d?.name ?? 'Sin asignar'}</span>
                        <button
                          type="button"
                          aria-label="Quitar turno"
                          onClick={() => update((t) => saveCar(t, { ...car, shifts: car.shifts.filter((x) => x.id !== s.id) }))}
                          className="press rounded-full p-1 text-muted hover:bg-surface-3"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    )
                  })}
              </ul>
            )}
            <ShiftForm car={car} />
          </div>
        )}
      </div>
    </Card>
  )
}

function ShiftForm({ car }: { car: Car }) {
  const trip = useTrip()
  const byId = useMembersById()
  const update = useUpdate()
  const days = tripDays(trip.meta)
  const drivers = car.driverIds.length ? car.driverIds : car.passengerIds
  const [label, setLabel] = useState('')
  const [date, setDate] = useState(days.find((d) => d.date >= todayISO())?.date ?? days[0]?.date ?? '')
  const [driverId, setDriverId] = useState<ID>(drivers[0] ?? '')

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return
    const shift: DriveShift = { id: uid('sh'), label: label.trim(), date, driverId: driverId || undefined }
    update((t) => saveCar(t, { ...car, shifts: [...car.shifts, shift] }))
    setLabel('')
  }

  return (
    <form onSubmit={add} className="mt-3 flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong p-3">
      <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Tramo, p. ej. «Ida al lago»" aria-label="Tramo" maxLength={60} className="h-10" />
      <div className="flex gap-2">
        <Select value={date} onChange={(e) => setDate(e.target.value)} aria-label="Día" className="h-10 text-sm">
          {days.map((d) => (
            <option key={d.date} value={d.date}>
              Día {d.index} · {formatDayChip(d.date)}
            </option>
          ))}
        </Select>
        <Select value={driverId} onChange={(e) => setDriverId(e.target.value)} aria-label="Conductor" className="h-10 text-sm">
          {drivers.map((id) => (
            <option key={id} value={id}>
              {byId.get(id)?.name}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" disabled={!label.trim()} className="h-10 shrink-0" aria-label="Añadir turno" icon={<Plus className="size-4" />} />
      </div>
    </form>
  )
}

function CarSheet({ open, onClose, car }: { open: boolean; onClose: () => void; car?: Car }) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const [name, setName] = useState(car?.name ?? `Coche ${trip.cars.length + 1}`)
  const [model, setModel] = useState(car?.model ?? '')
  const [plate, setPlate] = useState(car?.plate ?? '')
  const [seats, setSeats] = useState(car?.seats ?? 5)
  const [passengers, setPassengers] = useState<ID[]>(car?.passengerIds ?? [])
  const [drivers, setDrivers] = useState<ID[]>(car?.driverIds ?? [])
  const otherCar = (id: ID) => trip.cars.find((c) => c.id !== car?.id && c.passengerIds.includes(id))
  const overSeats = passengers.length > seats
  const valid = name.trim() && !overSeats

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    if (!valid) return
    const draft = {
      id: car?.id ?? uid('car'),
      name: name.trim(),
      model: model.trim(),
      plate: plate.trim().toUpperCase(),
      seats,
      passengerIds: passengers,
      driverIds: drivers.filter((d) => passengers.includes(d)),
      shifts: car?.shifts ?? [],
      subgroupId: car?.subgroupId ?? uid('g'),
      createdAt: car?.createdAt ?? now(),
    }
    update((t) => saveCar(t, draft))
    toast(car ? 'Coche actualizado' : `${draft.name} añadido · subgrupo de gastos creado`, { tone: 'success' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={car ? `Editar ${car.name}` : 'Nuevo coche'}
      size="full"
      footer={
        <div className="flex gap-3">
          {car && (
            <Button
              variant="danger"
              aria-label="Borrar coche"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                if (!(await confirm({ title: `¿Borrar ${car.name}?`, message: 'Se borra también su subgrupo; los gastos ya apuntados mantienen su reparto.' }))) return
                const group = trip.subgroups.find((g) => g.id === car.subgroupId)
                update((t) => deleteCar(t, car.id))
                onClose()
                toast(`${car.name} borrado`, {
                  action: { label: 'Deshacer', onClick: () => update((t) => (group ? put(put(t, 'subgroups', group), 'cars', car) : put(t, 'cars', car))) },
                })
              }}
            >
              Borrar
            </Button>
          )}
          <Button full onClick={() => save()} disabled={!valid} icon={<Check className="size-4" />}>
            Guardar
          </Button>
        </div>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Nombre" htmlFor="car-name">
          <TextInput id="car-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Modelo" htmlFor="car-model">
            <TextInput id="car-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Seat León gris" maxLength={40} />
          </Field>
          <Field label="Matrícula" htmlFor="car-plate">
            <TextInput id="car-plate" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="1234 ABC" autoCapitalize="characters" maxLength={15} />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-3">
          <span className="text-sm font-semibold">Plazas</span>
          <div className="flex items-center gap-3">
            <IconButton label="Menos plazas" variant="surface" size="sm" onClick={() => setSeats((s) => Math.max(2, s - 1))}>
              <Minus className="size-4" />
            </IconButton>
            <span className="tabular w-6 text-center font-display text-xl font-bold">{seats}</span>
            <IconButton label="Más plazas" variant="surface" size="sm" onClick={() => setSeats((s) => Math.min(9, s + 1))}>
              <Plus className="size-4" />
            </IconButton>
          </div>
        </div>
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">
            ¿Quién va? <span className="font-normal text-muted">({passengers.length}/{seats})</span>
          </p>
          <MemberMultiPicker
            members={trip.members}
            value={passengers}
            onChange={(ids) => {
              setPassengers(ids)
              setDrivers((d) => d.filter((x) => ids.includes(x)))
            }}
            meId={me.id}
            hint={(m) => {
              const other = otherCar(m.id)
              return other && !passengers.includes(m.id) ? `va en ${other.name}` : undefined
            }}
          />
          {overSeats && <p className="mt-2 px-1 text-xs font-medium text-danger-text">Hay más personas que plazas</p>}
          {passengers.some((id) => otherCar(id)) && <p className="mt-2 px-1 text-xs text-muted">Quien estaba en otro coche se cambiará a este.</p>}
        </div>
        {passengers.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">¿Quién puede conducir?</p>
            <MemberMultiPicker members={trip.members.filter((m) => passengers.includes(m.id))} value={drivers} onChange={setDrivers} meId={me.id} />
          </div>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
