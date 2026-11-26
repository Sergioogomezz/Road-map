import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { addMember } from './actions'
import { LocalTripRepository } from './localRepository'
import { SupabaseTripRepository } from './supabaseRepository'
import { buildDemoTrip } from './seed'
import { MemoryStorage } from './testUtils'
import type { Trip } from '../domain/types'

/**
 * Simulación mínima de la tabla `trips` de Supabase (select/insert/update con
 * control de versión) para probar la lógica de sincronización sin red.
 */
interface Row {
  id: string
  code: string
  data: unknown
  version: number
}

function fakeSupabase() {
  const rows = new Map<string, Row>()
  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
  let beforeUpdate: (() => void) | null = null
  const client = {
    from() {
      return {
        select() {
          const filters: [string, unknown][] = []
          const builder = {
            eq(col: string, val: unknown) {
              filters.push([col, val])
              return builder
            },
            async maybeSingle() {
              const row = [...rows.values()].find((r) => filters.every(([c, v]) => (r as unknown as Record<string, unknown>)[c] === v))
              return { data: row ? clone(row) : null, error: null }
            },
          }
          return builder
        },
        async insert(row: Row) {
          if (rows.has(row.id)) return { error: { code: '23505', message: 'duplicate' } }
          rows.set(row.id, clone(row))
          return { error: null }
        },
        update(values: Partial<Row>) {
          const filters: [string, unknown][] = []
          const builder = {
            eq(col: string, val: unknown) {
              filters.push([col, val])
              return builder
            },
            async select() {
              const hook = beforeUpdate
              beforeUpdate = null
              hook?.()
              const row = [...rows.values()].find((r) => filters.every(([c, v]) => (r as unknown as Record<string, unknown>)[c] === v))
              if (!row) return { data: [], error: null }
              Object.assign(row, clone(values))
              return { data: [{ version: row.version }], error: null }
            },
          }
          return builder
        },
      }
    },
    channel() {
      const ch = {
        on() {
          return ch
        },
        subscribe() {
          return ch
        },
      }
      return ch
    },
    async removeChannel() {
      return 'ok'
    },
  }
  return {
    client: client as unknown as SupabaseClient,
    rows,
    onceBeforeUpdate(fn: () => void) {
      beforeUpdate = fn
    },
  }
}

function device(client: SupabaseClient) {
  return new SupabaseTripRepository(client, new LocalTripRepository(new MemoryStorage()))
}

function sharedTrip(): Trip {
  const { trip } = buildDemoTrip('2026-12-06')
  // Un viaje "real" (no de ejemplo) para que se sincronice.
  return { ...trip, id: 't_shared', meta: { ...trip.meta, isDemo: false, code: 'K7PM3Q' } }
}

describe('sincronización con Supabase (simulada)', () => {
  it('sube un viaje nuevo y otro móvil lo encuentra por código', async () => {
    const db = fakeSupabase()
    const a = device(db.client)
    const b = device(db.client)
    await a.saveTrip(sharedTrip())
    await a.push('t_shared')
    expect(db.rows.get('t_shared')?.version).toBe(1)
    const found = await b.findByCode('k7pm3q')
    expect(found?.meta.name).toBe('Islandia con la pandilla')
  })

  it('dos móviles editando a la vez no se pisan (reintento por versión)', async () => {
    const db = fakeSupabase()
    const a = device(db.client)
    const b = device(db.client)
    await a.saveTrip(sharedTrip())
    await a.push('t_shared')
    const onB = (await b.findByCode('K7PM3Q'))!
    const onA = (await a.getTrip('t_shared'))!

    // B guarda en local; justo antes de que B suba, A sube su cambio → la versión de B queda desfasada.
    await b.saveTrip(addMember(onB, 'Nuevo en B').trip)
    db.onceBeforeUpdate(() => {
      const row = db.rows.get('t_shared')!
      const withA = addMember(onA, 'Nuevo en A').trip
      row.data = JSON.parse(JSON.stringify(withA))
      row.version += 1
    })
    await b.push('t_shared')

    const remote = db.rows.get('t_shared')!
    const names = (remote.data as Trip).members.map((m) => m.name)
    expect(names).toContain('Nuevo en A')
    expect(names).toContain('Nuevo en B')
    expect(remote.version).toBe(3)
    // B también tiene en local lo que añadió A.
    expect((await b.getTrip('t_shared'))?.members.map((m) => m.name)).toContain('Nuevo en A')
  })

  it('el viaje de ejemplo nunca se sube', async () => {
    const db = fakeSupabase()
    const a = device(db.client)
    await a.saveTrip(buildDemoTrip('2026-12-06').trip)
    await a.push('demo-islandia')
    expect(db.rows.size).toBe(0)
  })
})
