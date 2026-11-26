import { describe, expect, it } from 'vitest'
import type { Expense, Settlement } from './types'
import {
  distributeEvenly,
  distributeProportionally,
  expenseCents,
  expenseShares,
  moneySummary,
  parseAmount,
  simplifyDebts,
  type Cents,
  type Transfer,
} from './money'

const members = ['ana', 'bea', 'carlos', 'dani', 'eva']

function expense(partial: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    updatedAt: 0,
    title: 'Gasto',
    amount: 100,
    currency: 'EUR',
    rate: 1,
    paidBy: 'ana',
    split: { mode: 'iguales', memberIds: members },
    category: 'otros',
    date: '2026-12-05',
    createdBy: 'ana',
    createdAt: 0,
    ...partial,
  }
}

const sumValues = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0)

function settle(balances: Map<string, Cents>, transfers: Transfer[]) {
  const out = new Map(balances)
  for (const t of transfers) {
    out.set(t.from, (out.get(t.from) ?? 0) + t.cents)
    out.set(t.to, (out.get(t.to) ?? 0) - t.cents)
  }
  return out
}

describe('conversión y repartos', () => {
  it('convierte a céntimos de euro con el tipo guardado', () => {
    expect(expenseCents({ amount: 14800, currency: 'ISK', rate: 146.2 })).toBe(10123)
    expect(expenseCents({ amount: 27.7, currency: 'EUR', rate: 1 })).toBe(2770)
    expect(expenseCents({ amount: 50, currency: 'EUR', rate: 999 })).toBe(5000)
  })

  it('reparte a partes iguales sin perder céntimos', () => {
    const shares = distributeEvenly(1000, ['a', 'b', 'c'])
    expect([...shares.values()]).toEqual([334, 333, 333])
    expect(sumValues(shares)).toBe(1000)
  })

  it('reparte en proporción con el método del resto mayor', () => {
    const shares = distributeProportionally(10001, [
      ['a', 1],
      ['b', 1],
      ['c', 1],
    ])
    expect(sumValues(shares)).toBe(10001)
    const values = [...shares.values()].sort()
    expect(values).toEqual([3333, 3334, 3334])
  })

  it('importes exactos en otra divisa suman el total en euros', () => {
    const e = expense({
      amount: 27700,
      currency: 'ISK',
      rate: 146,
      split: { mode: 'exacto', shares: { ana: 4900, bea: 6200, carlos: 4900, dani: 7800, eva: 3900 } },
    })
    const shares = expenseShares(e, members)
    expect(sumValues(shares)).toBe(expenseCents(e))
    // Cada parte se desvía como mucho 1 céntimo de su valor exacto para que la suma cuadre.
    expect(Math.abs(shares.get('dani')! - (7800 / 146) * 100)).toBeLessThanOrEqual(1)
  })

  it('subgrupo usa la copia de miembros guardada en el gasto', () => {
    const e = expense({
      amount: 14800,
      currency: 'ISK',
      rate: 148,
      split: { mode: 'subgrupo', subgroupId: 'car1', subgroupName: 'Coche 1', memberIds: ['ana', 'bea', 'eva'] },
    })
    const shares = expenseShares(e, members)
    expect([...shares.keys()]).toEqual(['ana', 'bea', 'eva'])
    expect(sumValues(shares)).toBe(10000)
  })

  it('un reparto vacío no descuadra: se lo queda quien pagó', () => {
    const e = expense({ split: { mode: 'iguales', memberIds: [] } })
    expect([...expenseShares(e)]).toEqual([['ana', 10000]])
  })
})

describe('saldos', () => {
  it('los saldos siempre suman cero y los pagos los compensan', () => {
    const expenses = [
      expense({ amount: 945, paidBy: 'ana' }),
      expense({ amount: 1140, paidBy: 'bea' }),
      expense({ amount: 18640, currency: 'ISK', rate: 146.3, paidBy: 'eva' }),
      expense({ amount: 340, paidBy: 'dani', split: { mode: 'iguales', memberIds: ['ana', 'bea', 'carlos', 'dani'] } }),
    ]
    const settlements: Settlement[] = [
      { id: 's1', updatedAt: 0, from: 'carlos', to: 'ana', amountCents: 6000, date: '', note: '', createdBy: 'carlos', createdAt: 0 },
    ]
    const { byMember, totalCents } = moneySummary(members, expenses, settlements)
    const total = [...byMember.values()].reduce((acc, m) => acc + m.balance, 0)
    expect(total).toBe(0)
    expect(totalCents).toBe(94500 + 114000 + expenseCents(expenses[2]) + 34000)
    const carlos = byMember.get('carlos')!
    expect(carlos.sent).toBe(6000)
    expect(carlos.balance).toBe(carlos.paid - carlos.share + 6000)
  })
})

describe('simplificación de deudas', () => {
  it('no propone nada si nadie debe', () => {
    expect(simplifyDebts(new Map([['a', 0], ['b', 0]]))).toEqual([])
  })

  it('encuentra el mínimo donde el método voraz se pasa', () => {
    // {B, C, D} y {A, E, F} suman cero → bastan 4 pagos; el voraz necesita 5.
    const balances = new Map<string, Cents>([
      ['A', 400],
      ['B', 300],
      ['C', 300],
      ['D', -600],
      ['E', -200],
      ['F', -200],
    ])
    const transfers = simplifyDebts(balances)
    expect(transfers).toHaveLength(4)
    for (const v of settle(balances, transfers).values()) expect(v).toBe(0)
  })

  it('cuadra siempre y nunca supera n − 1 pagos (prueba aleatoria)', () => {
    let seed = 7
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    for (let round = 0; round < 200; round++) {
      const n = 2 + Math.floor(rand() * 9)
      const balances = new Map<string, Cents>()
      let acc = 0
      for (let i = 0; i < n - 1; i++) {
        const v = Math.round((rand() - 0.5) * 20000)
        balances.set(`p${i}`, v)
        acc += v
      }
      balances.set(`p${n - 1}`, -acc)
      const transfers = simplifyDebts(balances)
      const nonZero = [...balances.values()].filter((v) => v !== 0).length
      expect(transfers.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1))
      for (const t of transfers) expect(t.cents).toBeGreaterThan(0)
      for (const v of settle(balances, transfers).values()) expect(v).toBe(0)
    }
  })

  it('aprovecha parejas que se compensan entre sí', () => {
    const balances = new Map<string, Cents>([
      ['a', 1500],
      ['b', -1500],
      ['c', 2000],
      ['d', -2000],
      ['e', 700],
      ['f', -700],
    ])
    expect(simplifyDebts(balances)).toHaveLength(3)
  })
})

describe('lectura de importes', () => {
  it.each([
    ['12,50', 12.5],
    ['12.5', 12.5],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['14.800', 14800],
    ['14800', 14800],
    ['1.250.000', 1250000],
    [' 45 € ', 45],
    ['0,99', 0.99],
  ])('"%s" → %d', (input, expected) => {
    expect(parseAmount(input)).toBeCloseTo(expected, 6)
  })

  it('devuelve null si no hay número', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
  })
})
