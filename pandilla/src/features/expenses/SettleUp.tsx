import { ArrowRight, Check, CircleCheckBig, Copy, HandCoins, Info, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { formatRelativeDay, todayISO } from '../../domain/dates'
import { now, uid } from '../../domain/ids'
import { formatEUR, moneySummary, parseAmount, simplifyDebts, type Transfer } from '../../domain/money'
import type { Member, Settlement } from '../../domain/types'
import { addSettlement, drop, put } from '../../data/actions'
import { useMe, useMembersById, useTrip, useUpdate } from '../../hooks/useTrip'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { confetti } from '../../ui/confetti'
import { useConfirm } from '../../ui/Confirm'
import { copyText } from '../../ui/copy'
import { Field, TextInput } from '../../ui/Field'
import { haptic } from '../../ui/haptics'
import { MemberPicker } from '../../ui/MemberPicker'
import { Card, Fab, SectionTitle } from '../../ui/misc'
import { Sheet, useSheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { ExpenseSheet } from './ExpenseSheet'

/** Texto listo para pegar en Bizum, Revolut o el chat del grupo. */
export function transferSummary(t: Transfer, from: Member | undefined, to: Member | undefined, tripName: string): string {
  const concept = tripName.length > 30 ? `${tripName.slice(0, 29)}…` : tripName
  const lines = [
    `💸 Saldar cuentas · ${tripName}`,
    `${from?.name ?? '¿?'} → ${to?.name ?? '¿?'}: ${formatEUR(t.cents)}`,
  ]
  if (to?.bizum) lines.push(`Bizum a ${to.name}: ${to.bizum}`)
  if (to?.revolut) lines.push(`Revolut: ${to.revolut.startsWith('@') ? to.revolut : `@${to.revolut}`}`)
  if (!to?.bizum && !to?.revolut) lines.push(`Por Bizum o Revolut a ${to?.name ?? 'quien corresponda'}`)
  lines.push(`Concepto: ${concept}`)
  return lines.join('\n')
}

export function SettleUp() {
  const trip = useTrip()
  const me = useMe()
  const byId = useMembersById()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const settlementSheet = useSheet<Settlement>()
  const expenseSheet = useSheet()

  const { byMember } = useMemo(() => moneySummary(trip.members.map((m) => m.id), trip.expenses, trip.settlements), [trip.members, trip.expenses, trip.settlements])
  const balances = useMemo(() => new Map([...byMember].map(([id, m]) => [id, m.balance])), [byMember])
  const transfers = useMemo(() => simplifyDebts(balances), [balances])
  const maxAbs = Math.max(1, ...[...balances.values()].map(Math.abs))
  const sortedMembers = [...trip.members].sort((a, b) => (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0))
  const settlements = [...trip.settlements].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const debtorsCount = [...balances.values()].filter((v) => v !== 0).length

  const markPaid = (t: Transfer) => {
    const id = uid('s')
    update((current) =>
      put(current, 'settlements', { id, from: t.from, to: t.to, amountCents: t.cents, date: todayISO(), note: 'Saldado desde Pandilla', createdBy: me.id, createdAt: now() }),
    )
    haptic([10, 30, 10])
    const remaining = transfers.length - 1
    if (remaining === 0) confetti()
    toast(remaining === 0 ? '¡Cuentas claras! Nadie debe nada 🎉' : `Pago registrado: ${byId.get(t.from)?.name} → ${byId.get(t.to)?.name}`, {
      tone: 'success',
      action: { label: 'Deshacer', onClick: () => update((current) => drop(current, 'settlements', [id])) },
    })
  }

  const copy = async (t: Transfer) => {
    const ok = await copyText(transferSummary(t, byId.get(t.from), byId.get(t.to), trip.meta.name))
    toast(ok ? 'Resumen copiado: pégalo en Bizum, Revolut o el grupo' : 'No se pudo copiar', { tone: ok ? 'success' : 'danger' })
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">
      {transfers.length === 0 ? (
        <Card className="flex flex-col items-center p-6 text-center">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-success-soft text-success-text">
            <CircleCheckBig className="size-8" />
          </span>
          <h3 className="mt-4 font-display text-xl font-bold">¡Cuentas claras!</h3>
          <p className="mt-1 text-sm text-muted">Nadie debe nada a nadie. Así da gusto.</p>
        </Card>
      ) : (
        <section>
          <SectionTitle>
            Para quedar en paz: {transfers.length} {transfers.length === 1 ? 'transferencia' : 'transferencias'}
          </SectionTitle>
          <p className="mt-1 mb-3 flex items-start gap-1.5 px-1 text-xs text-muted">
            <Info className="mt-px size-3.5 shrink-0" />
            Es el mínimo posible entre {debtorsCount} personas con saldo: no hace falta devolver gasto por gasto.
          </p>
          <ul className="flex flex-col gap-3">
            {transfers.map((t) => {
              const from = byId.get(t.from)
              const to = byId.get(t.to)
              const involvesMe = t.from === me.id || t.to === me.id
              return (
                <li key={`${t.from}-${t.to}`}>
                  <Card className={cn('p-4', involvesMe && 'ring-2 ring-primary/40')}>
                    {involvesMe && (
                      <p className="mb-2 text-xs font-bold tracking-wide text-primary-text uppercase">{t.from === me.id ? 'Te toca pagar' : 'Te tienen que pagar'}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Avatar member={from} size="md" />
                        <span className="truncate font-semibold">{from?.id === me.id ? 'Tú' : from?.name}</span>
                        <ArrowRight className="size-4 shrink-0 text-muted" />
                        <Avatar member={to} size="md" />
                        <span className="truncate font-semibold">{to?.id === me.id ? 'Tú' : to?.name}</span>
                      </div>
                      <span className="tabular shrink-0 font-display text-xl font-extrabold">{formatEUR(t.cents)}</span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      <Button variant="secondary" full icon={<Copy className="size-4" />} onClick={() => copy(t)}>
                        Copiar resumen para Bizum / Revolut
                      </Button>
                      <Button variant="soft" full icon={<Check className="size-4" />} onClick={() => markPaid(t)} className="!bg-success-soft !text-success-text">
                        Marcar como pagado
                      </Button>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>Saldos</SectionTitle>
        <Card className="mt-3 flex flex-col gap-3 p-4">
          {sortedMembers.map((m) => {
            const v = balances.get(m.id) ?? 0
            const width = `${(Math.abs(v) / maxAbs) * 50}%`
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar member={m} size="sm" />
                <span className="w-16 truncate text-sm font-semibold">{m.id === me.id ? 'Tú' : m.name}</span>
                <div className="relative h-6 flex-1 rounded-full bg-surface-2" aria-hidden>
                  <span className="absolute top-0 bottom-0 left-1/2 w-px bg-line-strong" />
                  {v !== 0 && (
                    <span
                      className={cn('absolute top-1 bottom-1 rounded-full transition-all duration-500', v > 0 ? 'left-1/2 bg-success' : 'right-1/2 bg-danger')}
                      style={{ width }}
                    />
                  )}
                </div>
                <span className={cn('tabular w-24 text-right text-sm font-bold', v > 0 ? 'text-success-text' : v < 0 ? 'text-danger-text' : 'text-muted')}>
                  {v > 0 ? '+' : v < 0 ? '−' : ''}
                  {formatEUR(Math.abs(v))}
                </span>
              </div>
            )
          })}
          <p className="text-xs text-muted">Verde: le deben dinero · Rojo: debe dinero</p>
        </Card>
      </section>

      <section>
        <SectionTitle
          action={
            <button type="button" onClick={() => settlementSheet.open()} className="press inline-flex items-center gap-1 text-sm font-semibold text-primary-text">
              <Plus className="size-4" /> Registrar pago
            </button>
          }
        >
          Pagos registrados
        </SectionTitle>
        {settlements.length === 0 ? (
          <p className="mt-3 px-1 text-sm text-muted">Cuando alguien pague su parte, márcalo aquí.</p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface">
            {settlements.map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-b border-line p-3 last:border-b-0">
                <button type="button" onClick={() => settlementSheet.open(s)} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success-text">
                    <HandCoins className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {byId.get(s.from)?.name} → {byId.get(s.to)?.name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {formatRelativeDay(s.date)}
                      {s.note ? ` · ${s.note}` : ''}
                    </span>
                  </span>
                  <span className="tabular text-sm font-bold">{formatEUR(s.amountCents)}</span>
                </button>
                <button
                  type="button"
                  aria-label="Borrar pago"
                  className="press rounded-full p-2 text-muted hover:bg-surface-2"
                  onClick={async () => {
                    if (!(await confirm({ title: '¿Borrar este pago?', message: 'Los saldos volverán a como estaban antes de registrarlo.', confirmLabel: 'Borrar' }))) return
                    update((t) => drop(t, 'settlements', [s.id]))
                    toast('Pago borrado', { action: { label: 'Deshacer', onClick: () => update((t) => put(t, 'settlements', s)) } })
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Fab label="Añadir gasto" onClick={() => expenseSheet.open()} />
      {expenseSheet.state && <ExpenseSheet key={expenseSheet.state.key} open={expenseSheet.state.open} onClose={expenseSheet.close} />}
      {settlementSheet.state && (
        <SettlementSheet key={settlementSheet.state.key} open={settlementSheet.state.open} onClose={settlementSheet.close} settlement={settlementSheet.state.target} />
      )}
    </div>
  )
}

/** Alta o edición manual de un pago entre dos personas. */
export function SettlementSheet({ open, onClose, settlement }: { open: boolean; onClose: () => void; settlement?: Settlement }) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const [from, setFrom] = useState(settlement?.from ?? me.id)
  const [to, setTo] = useState(settlement?.to ?? trip.members.find((m) => m.id !== me.id)?.id ?? me.id)
  const [amountText, setAmountText] = useState(settlement ? (settlement.amountCents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '')
  const [note, setNote] = useState(settlement?.note ?? '')
  const amount = parseAmount(amountText) ?? 0
  const valid = amount > 0 && from !== to

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    if (!valid) return
    const amountCents = Math.round(amount * 100)
    if (settlement) {
      update((t) => put(t, 'settlements', { ...settlement, from, to, amountCents, note: note.trim() }))
    } else {
      update((t) => addSettlement(t, { from, to, amountCents, date: todayISO(), note: note.trim(), createdBy: me.id }).trip)
    }
    toast(settlement ? 'Pago actualizado' : 'Pago registrado', { tone: 'success' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={settlement ? 'Editar pago' : 'Registrar un pago'}
      subtitle="Dinero que una persona le ha dado a otra para saldar cuentas."
      footer={
        <div className="flex gap-3">
          {settlement && (
            <Button
              variant="danger"
              aria-label="Borrar pago"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                if (!(await confirm({ title: '¿Borrar este pago?', confirmLabel: 'Borrar' }))) return
                update((t) => drop(t, 'settlements', [settlement.id]))
                onClose()
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
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">Paga</p>
          <MemberPicker members={trip.members} value={from} onChange={setFrom} meId={me.id} />
        </div>
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">Recibe</p>
          <MemberPicker members={trip.members} value={to} onChange={setTo} meId={me.id} disabledIds={[from]} />
        </div>
        <Field label="Importe (€)" htmlFor="st-amount" error={from === to ? 'Elige dos personas distintas' : undefined}>
          <TextInput id="st-amount" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0,00" className="tabular font-display text-xl font-bold" />
        </Field>
        <Field label="Nota" htmlFor="st-note">
          <TextInput id="st-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bizum, efectivo…" maxLength={60} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
