import { Check, Pencil, Trash2, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { CURRENCIES, DEFAULT_RATES, currencyDecimals } from '../../domain/currency'
import { addDays, todayISO, tripDays } from '../../domain/dates'
import { now, uid } from '../../domain/ids'
import { distributeEvenly, formatAmountInput, formatEUR, formatMoney, parseAmount } from '../../domain/money'
import type { Expense, ExpenseCategory, ID, Split, SplitMode } from '../../domain/types'
import { drop, put } from '../../data/actions'
import { useMe, useTrip, useUpdate } from '../../hooks/useTrip'
import { AvatarStack, Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { useConfirm } from '../../ui/Confirm'
import { Field, Select, TextInput } from '../../ui/Field'
import { MemberMultiPicker, MemberPicker } from '../../ui/MemberPicker'
import { Segmented } from '../../ui/Segmented'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LIST } from '../meta'

export interface ExpensePrefill {
  title?: string
  category?: ExpenseCategory
  subgroupId?: ID
}

const ALL = '__todos__'

export function ExpenseSheet({ open, onClose, expense, prefill }: { open: boolean; onClose: () => void; expense?: Expense; prefill?: ExpensePrefill }) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const memberIds = trip.members.map((m) => m.id)

  const lastCurrency = useMemo(() => [...trip.expenses].sort((a, b) => b.createdAt - a.createdAt)[0]?.currency ?? 'EUR', [trip.expenses])
  const defaultDate = useMemo(() => {
    const today = todayISO()
    const days = tripDays(trip.meta)
    return today >= trip.meta.startDate && today <= trip.meta.endDate ? today : today < trip.meta.startDate ? today : days[days.length - 1]?.date ?? today
  }, [trip.meta])

  const [title, setTitle] = useState(expense?.title ?? prefill?.title ?? '')
  const [amountText, setAmountText] = useState(expense ? formatAmountInput(expense.amount, expense.currency) : '')
  const [currency, setCurrency] = useState(expense?.currency ?? lastCurrency)
  const [rateOverride, setRateOverride] = useState<number | null>(expense && expense.currency !== 'EUR' ? expense.rate : null)
  const [editingRate, setEditingRate] = useState(false)
  const [rateText, setRateText] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? prefill?.category ?? 'comida')
  const [date, setDate] = useState(expense?.date ?? defaultDate)
  const [paidBy, setPaidBy] = useState<ID>(expense?.paidBy ?? me.id)
  const [mode, setMode] = useState<SplitMode>(expense?.split.mode ?? (prefill?.subgroupId ? 'subgrupo' : 'iguales'))
  const [selected, setSelected] = useState<ID[]>(expense?.split.mode === 'iguales' ? expense.split.memberIds : memberIds)
  const [exact, setExact] = useState<Record<ID, string>>(() =>
    expense?.split.mode === 'exacto'
      ? Object.fromEntries(Object.entries(expense.split.shares).map(([id, v]) => [id, v ? formatAmountInput(v, expense.currency) : '']))
      : {},
  )
  const [subgroupId, setSubgroupId] = useState<ID>(expense?.split.mode === 'subgrupo' ? expense.split.subgroupId : prefill?.subgroupId ?? ALL)
  const [touched, setTouched] = useState(false)

  const amount = parseAmount(amountText) ?? 0
  const decimals = currencyDecimals(currency)
  const rate = currency === 'EUR' ? 1 : rateOverride ?? trip.rates.values[currency] ?? DEFAULT_RATES[currency] ?? 1
  const totalCents = Math.round((amount / rate) * 100)

  const subgroupOptions = [
    { id: ALL, name: 'Todos', emoji: '👥', memberIds },
    ...trip.subgroups.map((g) => ({ id: g.id, name: g.name, emoji: g.emoji, memberIds: g.memberIds.filter((id) => memberIds.includes(id)) })),
  ]
  // Si el subgrupo guardado ya no existe, mostramos la copia que guarda el gasto.
  const savedSplit = expense?.split
  if (savedSplit?.mode === 'subgrupo' && !subgroupOptions.some((o) => o.id === savedSplit.subgroupId)) {
    subgroupOptions.push({ id: savedSplit.subgroupId, name: `${savedSplit.subgroupName} (eliminado)`, emoji: '🗂️', memberIds: savedSplit.memberIds })
  }
  const chosenGroup = subgroupOptions.find((o) => o.id === subgroupId) ?? subgroupOptions[0]

  const exactSum = Object.values(exact).reduce((acc, v) => acc + (parseAmount(v) ?? 0), 0)
  const exactRemaining = Number((amount - exactSum).toFixed(decimals))
  const tolerance = decimals === 0 ? 0.5 : 0.005

  const participants: ID[] = mode === 'iguales' ? selected : mode === 'subgrupo' ? chosenGroup.memberIds : Object.keys(exact).filter((id) => (parseAmount(exact[id]) ?? 0) > 0)
  const perPerson = mode !== 'exacto' && participants.length ? distributeEvenly(totalCents, participants) : null

  const errors = {
    title: !title.trim() ? 'Pon un concepto' : '',
    amount: !(amount > 0) ? 'Importe no válido' : '',
    split:
      mode === 'iguales' && !selected.length
        ? 'Elige al menos una persona'
        : mode === 'subgrupo' && !chosenGroup.memberIds.length
          ? 'Ese subgrupo está vacío'
          : mode === 'exacto' && Math.abs(exactRemaining) > tolerance
            ? exactRemaining > 0
              ? `Faltan ${formatMoney(exactRemaining, currency)} por repartir`
              : `Te pasas en ${formatMoney(-exactRemaining, currency)}`
            : mode === 'exacto' && !participants.length
              ? 'Escribe cuánto le toca a cada uno'
              : '',
  }
  const valid = !errors.title && !errors.amount && !errors.split

  const fillRemaining = () => {
    const empty = memberIds.filter((id) => !(parseAmount(exact[id] ?? '') ?? 0))
    const targets = empty.length ? empty : memberIds
    if (!targets.length || exactRemaining <= 0) return
    const factor = Math.pow(10, decimals)
    const units = Math.round(exactRemaining * factor)
    const base = Math.floor(units / targets.length)
    let rest = units - base * targets.length
    const next = { ...exact }
    for (const id of targets) {
      const add = (base + (rest > 0 ? 1 : 0)) / factor
      if (rest > 0) rest--
      const current = parseAmount(next[id] ?? '') ?? 0
      next[id] = formatAmountInput(current + add, currency)
    }
    setExact(next)
  }

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    setTouched(true)
    if (!valid) return
    let split: Split
    if (mode === 'iguales') split = { mode, memberIds: memberIds.filter((id) => selected.includes(id)) }
    else if (mode === 'subgrupo') split = { mode, subgroupId: chosenGroup.id, subgroupName: chosenGroup.name, memberIds: chosenGroup.memberIds }
    else split = { mode, shares: Object.fromEntries(Object.entries(exact).map(([id, v]) => [id, parseAmount(v) ?? 0]).filter(([, v]) => (v as number) > 0)) }
    const draft: Omit<Expense, 'updatedAt'> = {
      id: expense?.id ?? uid('e'),
      title: title.trim(),
      amount,
      currency,
      rate,
      paidBy,
      split,
      category,
      date,
      createdBy: expense?.createdBy ?? me.id,
      createdAt: expense?.createdAt ?? now(),
    }
    update((t) => put(t, 'expenses', draft))
    toast(expense ? 'Gasto actualizado' : `Gasto apuntado · ${formatEUR(totalCents)}`, { tone: 'success' })
    onClose()
  }

  const remove = async () => {
    if (!expense) return
    if (!(await confirm({ title: `¿Borrar «${expense.title}»?`, message: 'Los saldos se recalcularán al momento.', confirmLabel: 'Borrar' }))) return
    update((t) => drop(t, 'expenses', [expense.id]))
    onClose()
    toast('Gasto borrado', { action: { label: 'Deshacer', onClick: () => update((t) => put(t, 'expenses', expense)) } })
  }

  const dateOptions = useMemo(() => {
    const days = tripDays(trip.meta).map((d) => d.date)
    const extra = [todayISO(), addDays(trip.meta.startDate, -1), date].filter((d) => !days.includes(d))
    return [...new Set([...days, ...extra])].sort()
  }, [trip.meta, date])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={expense ? 'Editar gasto' : 'Nuevo gasto'}
      size="full"
      footer={
        <div className="flex gap-3">
          {expense && (
            <Button variant="danger" onClick={remove} aria-label="Borrar gasto" icon={<Trash2 className="size-4" />}>
              Borrar
            </Button>
          )}
          <Button full onClick={() => save()} disabled={touched && !valid} icon={<Check className="size-4" />}>
            {expense ? 'Guardar' : 'Apuntar gasto'}
          </Button>
        </div>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-5">
        {/* Importe y divisa */}
        <div className="rounded-3xl bg-surface-2 p-4">
          <div className="flex items-end gap-2">
            <input
              value={amountText}
              onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))}
              inputMode="decimal"
              placeholder={decimals ? '0,00' : '0'}
              aria-label="Importe"
              data-autofocus={!expense || undefined}
              className="tabular min-w-0 flex-1 bg-transparent font-display text-[42px] leading-none font-extrabold outline-none placeholder:text-muted/50"
            />
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value)
                  setRateOverride(null)
                  setEditingRate(false)
                }}
                aria-label="Divisa"
                className="h-11 appearance-none rounded-2xl bg-surface px-3 pr-8 font-bold outline-none focus:ring-2 focus:ring-primary"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">▾</span>
            </div>
          </div>
          {touched && errors.amount && <p className="mt-1 text-xs font-medium text-danger-text">{errors.amount}</p>}
          {currency !== 'EUR' && (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-sm">
              <span className="font-display text-lg font-bold text-fg">≈ {formatEUR(totalCents)}</span>
              {editingRate ? (
                <span className="flex items-center gap-1.5 text-muted">
                  1 € =
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={rateText}
                    onChange={(e) => setRateText(e.target.value)}
                    onBlur={() => {
                      const v = parseAmount(rateText)
                      if (v && v > 0) setRateOverride(v)
                      setEditingRate(false)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), (e.target as HTMLInputElement).blur())}
                    aria-label={`Unidades de ${currency} por euro`}
                    className="tabular h-8 w-24 rounded-lg bg-surface px-2 font-semibold text-fg outline-none focus:ring-2 focus:ring-primary"
                  />
                  {currency}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRateText(rate.toLocaleString('es-ES', { maximumFractionDigits: 4 }))
                    setEditingRate(true)
                  }}
                  className="press inline-flex items-center gap-1 text-muted hover:text-fg"
                >
                  1 € = {rate.toLocaleString('es-ES', { maximumFractionDigits: 4 })} {currency}
                  <Pencil className="size-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <Field label="Concepto" htmlFor="ex-title" error={touched ? errors.title : undefined}>
          <TextInput id="ex-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Cena, gasolina, entradas…" maxLength={80} />
        </Field>

        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {EXPENSE_CATEGORY_LIST.map((c) => {
            const meta = EXPENSE_CATEGORIES[c]
            const Icon = meta.icon
            return (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  'press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold',
                  category === c ? cn('border-transparent ring-2 ring-current', meta.chip) : 'border-line bg-surface text-fg-2',
                )}
              >
                <Icon className="size-4" /> {meta.label}
              </button>
            )
          })}
        </div>

        <Field label="Fecha" htmlFor="ex-date">
          <Select id="ex-date" value={date} onChange={(e) => setDate(e.target.value)}>
            {dateOptions.map((d) => {
              const idx = tripDays(trip.meta).find((x) => x.date === d)?.index
              return (
                <option key={d} value={d}>
                  {new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {idx ? ` · día ${idx}` : d < trip.meta.startDate ? ' · antes del viaje' : ''}
                </option>
              )
            })}
          </Select>
        </Field>

        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">¿Quién pagó?</p>
          <MemberPicker members={trip.members} value={paidBy} onChange={setPaidBy} meId={me.id} />
        </div>

        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">¿Cómo se reparte?</p>
          <Segmented<SplitMode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'iguales', label: 'Por igual' },
              { value: 'exacto', label: 'Exacto' },
              { value: 'subgrupo', label: 'Subgrupo' },
            ]}
          />

          <div className="mt-3">
            {mode === 'iguales' && (
              <>
                <div className="mb-2 flex items-center justify-between px-1 text-xs">
                  <span className="text-muted">{selected.length} de {trip.members.length} personas</span>
                  <span className="flex gap-3 font-semibold text-primary-text">
                    <button type="button" onClick={() => setSelected(memberIds)}>
                      Todos
                    </button>
                    <button type="button" onClick={() => setSelected([])}>
                      Nadie
                    </button>
                  </span>
                </div>
                <MemberMultiPicker members={trip.members} value={selected} onChange={setSelected} meId={me.id} />
              </>
            )}

            {mode === 'exacto' && (
              <div className="flex flex-col gap-2">
                {trip.members.map((m) => (
                  <label key={m.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 py-1.5 pr-1.5 pl-2">
                    <Avatar member={m} size="sm" />
                    <span className="flex-1 text-sm font-semibold">
                      {m.name}
                      {m.id === me.id && <span className="font-normal text-muted"> (tú)</span>}
                    </span>
                    <input
                      inputMode="decimal"
                      value={exact[m.id] ?? ''}
                      onChange={(e) => setExact({ ...exact, [m.id]: e.target.value.replace(/[^\d.,]/g, '') })}
                      placeholder="0"
                      aria-label={`Parte de ${m.name}`}
                      className="tabular h-10 w-28 rounded-xl bg-surface px-3 text-right font-semibold outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="w-9 text-xs font-semibold text-muted">{currency}</span>
                  </label>
                ))}
                <div className="mt-1 flex items-center justify-between gap-2 px-1 text-sm">
                  <span className={cn('font-semibold', Math.abs(exactRemaining) <= tolerance ? 'text-success-text' : 'text-warning-text')}>
                    {Math.abs(exactRemaining) <= tolerance
                      ? '✓ Cuadra con el total'
                      : exactRemaining > 0
                        ? `Faltan ${formatMoney(exactRemaining, currency)}`
                        : `Sobran ${formatMoney(-exactRemaining, currency)}`}
                  </span>
                  {exactRemaining > tolerance && (
                    <button type="button" onClick={fillRemaining} className="press rounded-xl bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary-text">
                      Repartir lo que falta
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === 'subgrupo' && (
              <div className="flex flex-col gap-2" role="radiogroup">
                {subgroupOptions.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    role="radio"
                    aria-checked={subgroupId === g.id}
                    onClick={() => setSubgroupId(g.id)}
                    className={cn(
                      'press flex items-center gap-3 rounded-2xl border p-3 text-left',
                      subgroupId === g.id ? 'border-primary bg-primary-soft' : 'border-line bg-surface',
                    )}
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-xl">{g.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{g.name}</span>
                      <span className="block text-xs text-muted">{g.memberIds.length} personas</span>
                    </span>
                    <AvatarStack members={g.memberIds.map((id) => trip.members.find((m) => m.id === id))} max={4} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {touched && errors.split && <p className="mt-2 px-1 text-xs font-medium text-danger-text">{errors.split}</p>}
          {perPerson && amount > 0 && participants.length > 0 && (
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm text-fg-2">
              <Users className="size-4 shrink-0 text-primary-text" />
              {formatEUR(Math.max(...perPerson.values()))} por persona
              {participants.includes(me.id) ? ` · tu parte ${formatEUR(perPerson.get(me.id) ?? 0)}` : ' · no te incluye'}
            </p>
          )}
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
