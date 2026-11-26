import type { Expense, ID, Settlement, Split } from './types'
import { currencyDecimals } from './currency'

/** Céntimos de euro (enteros): todas las cuentas internas se hacen así para no arrastrar decimales. */
export type Cents = number

export interface Transfer {
  from: ID
  to: ID
  cents: Cents
}

export interface MemberMoney {
  /** Lo que ha pagado de su bolsillo. */
  paid: Cents
  /** Lo que le corresponde de los gastos. */
  share: Cents
  /** Pagos de liquidación enviados / recibidos. */
  sent: Cents
  received: Cents
  /** > 0: le deben dinero · < 0: debe dinero. */
  balance: Cents
}

/** Importe de un gasto en céntimos de euro. */
export function expenseCents(e: Pick<Expense, 'amount' | 'rate' | 'currency'>): Cents {
  const rate = e.currency === 'EUR' ? 1 : e.rate
  if (!(rate > 0) || !Number.isFinite(e.amount)) return 0
  return Math.round((e.amount / rate) * 100)
}

/** Reparte `total` a partes iguales; los céntimos sobrantes van a los primeros de la lista. */
export function distributeEvenly(total: Cents, ids: ID[]): Map<ID, Cents> {
  const out = new Map<ID, Cents>()
  const unique = [...new Set(ids)]
  if (unique.length === 0) return out
  const base = Math.floor(total / unique.length)
  let remainder = total - base * unique.length
  for (const id of unique) {
    out.set(id, base + (remainder > 0 ? 1 : 0))
    if (remainder > 0) remainder--
  }
  return out
}

/** Reparte `total` en proporción a `weights` con el método del resto mayor (la suma cuadra siempre). */
export function distributeProportionally(total: Cents, weights: [ID, number][]): Map<ID, Cents> {
  const out = new Map<ID, Cents>()
  const valid = weights.filter(([, w]) => w > 0 && Number.isFinite(w))
  const sum = valid.reduce((acc, [, w]) => acc + w, 0)
  if (sum <= 0) return out
  const raw = valid.map(([id, w]) => {
    const exact = (total * w) / sum
    return { id, floor: Math.floor(exact), frac: exact - Math.floor(exact) }
  })
  let remainder = total - raw.reduce((acc, r) => acc + r.floor, 0)
  const byFrac = [...raw].sort((a, b) => b.frac - a.frac)
  for (const r of byFrac) {
    if (remainder <= 0) break
    r.floor += 1
    remainder--
  }
  for (const r of raw) out.set(r.id, (out.get(r.id) ?? 0) + r.floor)
  return out
}

/** Miembros que participan en un reparto. */
export function splitMemberIds(split: Split): ID[] {
  switch (split.mode) {
    case 'iguales':
    case 'subgrupo':
      return split.memberIds
    case 'exacto':
      return Object.entries(split.shares)
        .filter(([, v]) => v > 0)
        .map(([id]) => id)
  }
}

/**
 * Parte de cada persona en un gasto, en céntimos de euro.
 * Siempre suma exactamente el total del gasto (si el reparto está vacío, se lo queda quien pagó).
 */
export function expenseShares(e: Expense, memberOrder: ID[] = []): Map<ID, Cents> {
  const total = expenseCents(e)
  const rank = (id: ID) => {
    const i = memberOrder.indexOf(id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  let shares: Map<ID, Cents>
  if (e.split.mode === 'exacto') {
    shares = distributeProportionally(
      total,
      Object.entries(e.split.shares).sort(([a], [b]) => rank(a) - rank(b)),
    )
  } else {
    shares = distributeEvenly(total, [...e.split.memberIds].sort((a, b) => rank(a) - rank(b)))
  }
  if (shares.size === 0 && total !== 0) shares.set(e.paidBy, total)
  return shares
}

export function moneySummary(
  memberIds: ID[],
  expenses: Expense[],
  settlements: Settlement[],
): { byMember: Map<ID, MemberMoney>; totalCents: Cents } {
  const byMember = new Map<ID, MemberMoney>()
  const get = (id: ID) => {
    let m = byMember.get(id)
    if (!m) {
      m = { paid: 0, share: 0, sent: 0, received: 0, balance: 0 }
      byMember.set(id, m)
    }
    return m
  }
  for (const id of memberIds) get(id)
  let totalCents = 0
  for (const e of expenses) {
    const total = expenseCents(e)
    totalCents += total
    get(e.paidBy).paid += total
    for (const [id, cents] of expenseShares(e, memberIds)) get(id).share += cents
  }
  for (const s of settlements) {
    get(s.from).sent += s.amountCents
    get(s.to).received += s.amountCents
  }
  for (const m of byMember.values()) m.balance = m.paid - m.share + m.sent - m.received
  return { byMember, totalCents }
}

function greedySettle(entries: [ID, Cents][]): Transfer[] {
  const creditors = entries.filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }))
  const debtors = entries.filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }))
  const out: Transfer[] = []
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.v - a.v)
    debtors.sort((a, b) => b.v - a.v)
    const c = creditors[0]
    const d = debtors[0]
    const cents = Math.min(c.v, d.v)
    out.push({ from: d.id, to: c.id, cents })
    c.v -= cents
    d.v -= cents
    if (c.v === 0) creditors.shift()
    if (d.v === 0) debtors.shift()
  }
  return out
}

/** Hasta este número de personas con saldo se calcula el óptimo exacto (2^n estados). */
const EXACT_LIMIT = 18

/**
 * Número mínimo de transferencias para dejar todos los saldos a cero.
 *
 * El mínimo es (personas con saldo) − (máximo de subgrupos disjuntos que suman cero),
 * porque dentro de cada subgrupo que suma cero bastan k−1 pagos. Ese máximo se obtiene
 * con programación dinámica sobre subconjuntos y luego cada subgrupo se liquida
 * emparejando al que más debe con quien más tiene que recibir.
 */
export function simplifyDebts(balances: Map<ID, Cents>): Transfer[] {
  const entries = [...balances].filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const n = entries.length
  if (n === 0) return []
  if (n > EXACT_LIMIT) return greedySettle(entries)

  const size = 1 << n
  const sum = new Float64Array(size)
  const dp = new Int8Array(size)
  for (let mask = 1; mask < size; mask++) {
    const low = mask & -mask
    const i = 31 - Math.clz32(low)
    sum[mask] = sum[mask ^ low] + entries[i][1]
    let best = 0
    for (let rest = mask; rest; rest &= rest - 1) {
      const bit = rest & -rest
      const v = dp[mask ^ bit]
      if (v > best) best = v
    }
    dp[mask] = best + (sum[mask] === 0 ? 1 : 0)
  }

  // Reconstruye una cadena de subconjuntos que alcanza el óptimo y corta en cada suma cero.
  const groups: number[] = []
  let mask = size - 1
  let groupStart = mask
  while (mask) {
    const gain = sum[mask] === 0 ? 1 : 0
    let next = -1
    for (let rest = mask; rest; rest &= rest - 1) {
      const bit = rest & -rest
      if (dp[mask ^ bit] + gain === dp[mask]) {
        next = mask ^ bit
        break
      }
    }
    mask = next
    if (sum[mask] === 0) {
      groups.push(groupStart ^ mask)
      groupStart = mask
    }
  }

  const out: Transfer[] = []
  for (const g of groups) {
    const members: [ID, Cents][] = []
    for (let i = 0; i < n; i++) if (g & (1 << i)) members.push(entries[i])
    out.push(...greedySettle(members))
  }
  return out.sort((a, b) => b.cents - a.cents)
}

const eurFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always',
} as Intl.NumberFormatOptions)

export function formatEUR(cents: Cents): string {
  return eurFormatter.format(cents / 100)
}

/** Sin decimales si el importe es redondo: "340 €", "33,74 €". */
export function formatEURShort(cents: Cents): string {
  if (cents % 100 === 0) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
      useGrouping: 'always',
    } as Intl.NumberFormatOptions).format(cents / 100)
  }
  return formatEUR(cents)
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      useGrouping: 'always',
    } as Intl.NumberFormatOptions).format(amount)
  } catch {
    return `${amount.toLocaleString('es-ES')} ${currency}`
  }
}

/** Importe sin símbolo para mostrar en un campo: 14800 → "14.800", 12.5 → "12,50". */
export function formatAmountInput(amount: number, currency: string): string {
  const decimals = currencyDecimals(currency)
  const rounded = Number(amount.toFixed(decimals))
  const hasDecimals = Math.round(rounded) !== rounded
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: hasDecimals ? decimals : 0,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(rounded)
}

/**
 * Lee importes escritos a la española o a la inglesa:
 * "12,50" · "1.234,56" · "14.800" (miles) · "12.5" · "1,234.56".
 */
export function parseAmount(input: string): number | null {
  let s = input.trim().replace(/[\s€$£¥]/g, '').replace(/[^\d.,-]/g, '')
  if (!s || s === '-' || s === ',' || s === '.') return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSep = lastComma > lastDot ? ',' : '.'
    const thousandSep = decimalSep === ',' ? '.' : ','
    s = s.split(thousandSep).join('').replace(decimalSep, '.')
  } else if (lastComma !== -1) {
    // En español la coma es decimal ("12,5"); varias comas solo pueden ser miles ("1,234,567").
    const parts = s.split(',')
    s = parts.length > 2 ? parts.join('') : `${parts[0]}.${parts[1]}`
  } else if (lastDot !== -1) {
    const parts = s.split('.')
    const after = parts[parts.length - 1]
    // "14.800" o "1.250.000" → separador de miles; "12.5" → decimal.
    if (parts.length > 2 || (after.length === 3 && parts[0].length >= 1 && parts[0].length <= 3)) s = parts.join('')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
