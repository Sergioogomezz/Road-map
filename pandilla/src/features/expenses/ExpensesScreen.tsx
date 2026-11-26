import { ArrowRight, HandCoins, Receipt, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatRelativeDay } from '../../domain/dates'
import { expenseCents, expenseShares, formatEUR, formatMoney, moneySummary } from '../../domain/money'
import type { Expense, Settlement } from '../../domain/types'
import { navigate } from '../../hooks/useHashRoute'
import { useMe, useMembersById, useTrip } from '../../hooks/useTrip'
import { Avatar } from '../../ui/Avatar'
import { cn } from '../../ui/cn'
import { EmptyState, Fab, FilterChip, ScreenHeader } from '../../ui/misc'
import { Segmented } from '../../ui/Segmented'
import { useSheet } from '../../ui/Sheet'
import { EXPENSE_CATEGORIES } from '../meta'
import { ExpenseSheet, type ExpensePrefill } from './ExpenseSheet'
import { SettleUp, SettlementSheet } from './SettleUp'
import { Subgroups } from './Subgroups'

type View = 'movimientos' | 'saldar' | 'subgrupos'
type Filter = 'todos' | 'mios' | 'incluyen'

export function ExpensesScreen({ sub }: { sub?: string }) {
  const trip = useTrip()
  const me = useMe()
  const view: View = sub === 'saldar' || sub === 'subgrupos' ? sub : 'movimientos'
  const summary = useMemo(() => moneySummary(trip.members.map((m) => m.id), trip.expenses, trip.settlements), [trip.members, trip.expenses, trip.settlements])
  const mine = summary.byMember.get(me.id)
  const balance = mine?.balance ?? 0

  return (
    <>
      <ScreenHeader title="Gastos" subtitle={`${trip.expenses.length} gastos · todo en euros`}>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Stat label="Total viaje" value={formatEUR(summary.totalCents)} />
          <Stat label="Tu parte" value={formatEUR(mine?.share ?? 0)} />
          <button type="button" onClick={() => navigate('gastos/saldar', { replace: true })} className="press text-left">
            <Stat
              label={balance > 0 ? 'Te deben' : balance < 0 ? 'Debes' : 'Balance'}
              value={balance === 0 ? 'En paz' : formatEUR(Math.abs(balance))}
              tone={balance > 0 ? 'success' : balance < 0 ? 'danger' : undefined}
            />
          </button>
        </div>
        <Segmented<View>
          value={view}
          onChange={(v) => navigate(`gastos/${v}`, { replace: true })}
          options={[
            { value: 'movimientos', label: 'Movimientos' },
            { value: 'saldar', label: 'Saldar' },
            { value: 'subgrupos', label: 'Subgrupos' },
          ]}
        />
      </ScreenHeader>
      {view === 'movimientos' && <Movements />}
      {view === 'saldar' && <SettleUp />}
      {view === 'subgrupos' && <Subgroups />}
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div className={cn('rounded-2xl px-3 py-2.5', tone === 'success' ? 'bg-success-soft' : tone === 'danger' ? 'bg-danger-soft' : 'bg-surface')}>
      <p className={cn('text-[11px] font-bold tracking-wide uppercase', tone === 'success' ? 'text-success-text' : tone === 'danger' ? 'text-danger-text' : 'text-muted')}>{label}</p>
      <p className={cn('tabular mt-0.5 truncate font-display text-[17px] font-extrabold', tone === 'success' ? 'text-success-text' : tone === 'danger' ? 'text-danger-text' : 'text-fg')}>{value}</p>
    </div>
  )
}

type Row = { kind: 'expense'; item: Expense; date: string; at: number } | { kind: 'settlement'; item: Settlement; date: string; at: number }

function Movements() {
  const trip = useTrip()
  const me = useMe()
  const byId = useMembersById()
  const [filter, setFilter] = useState<Filter>('todos')
  const [query, setQuery] = useState('')
  const expenseSheet = useSheet<{ expense?: Expense; prefill?: ExpensePrefill }>()
  const settlementSheet = useSheet<Settlement>()

  const rows = useMemo(() => {
    const memberIds = trip.members.map((m) => m.id)
    const q = query.trim().toLowerCase()
    const list: Row[] = []
    for (const e of trip.expenses) {
      const shares = expenseShares(e, memberIds)
      if (filter === 'mios' && e.paidBy !== me.id) continue
      if (filter === 'incluyen' && !shares.has(me.id)) continue
      if (q && !e.title.toLowerCase().includes(q)) continue
      list.push({ kind: 'expense', item: e, date: e.date, at: e.createdAt })
    }
    if (filter === 'todos' && !q) for (const s of trip.settlements) list.push({ kind: 'settlement', item: s, date: s.date, at: s.createdAt })
    if (filter !== 'todos' && !q)
      for (const s of trip.settlements) if (s.from === me.id || s.to === me.id) list.push({ kind: 'settlement', item: s, date: s.date, at: s.createdAt })
    list.sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at)
    const groups: { date: string; rows: Row[]; total: number }[] = []
    for (const r of list) {
      let g = groups[groups.length - 1]
      if (!g || g.date !== r.date) {
        g = { date: r.date, rows: [], total: 0 }
        groups.push(g)
      }
      g.rows.push(r)
      if (r.kind === 'expense') g.total += expenseCents(r.item)
    }
    return groups
  }, [trip.members, trip.expenses, trip.settlements, filter, query, me.id])

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2">
        <div className="no-scrollbar -ml-4 flex flex-1 gap-2 overflow-x-auto pl-4">
          <FilterChip active={filter === 'todos'} onClick={() => setFilter('todos')}>
            Todos
          </FilterChip>
          <FilterChip active={filter === 'mios'} onClick={() => setFilter('mios')}>
            Pagué yo
          </FilterChip>
          <FilterChip active={filter === 'incluyen'} onClick={() => setFilter('incluyen')}>
            Me incluyen
          </FilterChip>
        </div>
      </div>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar gasto"
          aria-label="Buscar gasto"
          className="h-11 w-full rounded-2xl border border-line bg-surface pr-10 pl-10 outline-none focus:border-primary"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Borrar búsqueda" className="press absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-muted">
            <X className="size-4" />
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-7" />}
          title={query ? 'Sin resultados' : 'Sin gastos todavía'}
          text={query ? 'Prueba con otra palabra.' : 'Apunta el primero: vuelos, alojamiento, la compra… y olvidaos de echar cuentas.'}
        />
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {rows.map((g) => (
            <section key={g.date}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h3 className="text-[13px] font-bold tracking-wide text-muted uppercase">{formatRelativeDay(g.date)}</h3>
                {g.total > 0 && <span className="tabular text-xs font-semibold text-muted">{formatEUR(g.total)}</span>}
              </div>
              <ul className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
                {g.rows.map((r) =>
                  r.kind === 'expense' ? (
                    <ExpenseRow key={r.item.id} expense={r.item} onOpen={() => expenseSheet.open({ expense: r.item })} />
                  ) : (
                    <li key={r.item.id} className="border-b border-line last:border-b-0">
                      <button type="button" onClick={() => settlementSheet.open(r.item)} className="press flex w-full items-center gap-3 p-3 text-left hover:bg-surface-2">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success-text">
                          <HandCoins className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                            {byId.get(r.item.from)?.name ?? '¿?'} <ArrowRight className="size-3.5 text-muted" /> {byId.get(r.item.to)?.name ?? '¿?'}
                          </span>
                          <span className="block truncate text-[13px] text-muted">Pago{r.item.note ? ` · ${r.item.note}` : ''}</span>
                        </span>
                        <span className="tabular font-bold text-success-text">{formatEUR(r.item.amountCents)}</span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Fab label="Añadir gasto" onClick={() => expenseSheet.open({})} />
      {expenseSheet.state && (
        <ExpenseSheet
          key={expenseSheet.state.key}
          open={expenseSheet.state.open}
          onClose={expenseSheet.close}
          expense={expenseSheet.state.target?.expense}
          prefill={expenseSheet.state.target?.prefill}
        />
      )}
      {settlementSheet.state && (
        <SettlementSheet key={settlementSheet.state.key} open={settlementSheet.state.open} onClose={settlementSheet.close} settlement={settlementSheet.state.target} />
      )}
    </div>
  )
}

function ExpenseRow({ expense: e, onOpen }: { expense: Expense; onOpen: () => void }) {
  const trip = useTrip()
  const me = useMe()
  const byId = useMembersById()
  const meta = EXPENSE_CATEGORIES[e.category]
  const Icon = meta.icon
  const shares = expenseShares(e, trip.members.map((m) => m.id))
  const myShare = shares.get(me.id) ?? 0
  const payer = byId.get(e.paidBy)
  const splitLabel =
    e.split.mode === 'subgrupo' ? `${e.split.subgroupName} (${shares.size})` : e.split.mode === 'exacto' ? `importes exactos (${shares.size})` : shares.size === trip.members.length ? `todos (${shares.size})` : `entre ${shares.size}`

  return (
    <li className="border-b border-line last:border-b-0">
      <button type="button" onClick={onOpen} className="press flex w-full items-center gap-3 p-3 text-left hover:bg-surface-2">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', meta.chip)}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{e.title}</span>
          <span className="flex items-center gap-1 text-[13px] text-muted">
            <Avatar member={payer} size="xs" />
            <span className="truncate">
              {payer?.id === me.id ? 'Pagaste tú' : `Pagó ${payer?.name ?? '¿?'}`} · {splitLabel}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="tabular font-bold">{formatEUR(expenseCents(e))}</span>
          {e.currency !== 'EUR' ? (
            <span className="tabular text-xs text-muted">{formatMoney(e.amount, e.currency)}</span>
          ) : myShare > 0 ? (
            <span className="tabular text-xs text-muted">tu parte {formatEUR(myShare)}</span>
          ) : (
            <span className="text-xs text-muted">no te incluye</span>
          )}
        </span>
      </button>
    </li>
  )
}
