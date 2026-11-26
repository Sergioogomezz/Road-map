/**
 * Repositorio con sincronización en tiempo real vía Supabase (opcional).
 *
 * Funciona "offline first": cada cambio se guarda primero en el móvil
 * (LocalTripRepository) y luego se sube en segundo plano. Si no hay cobertura,
 * el viaje queda pendiente y se sube al volver la conexión. Los cambios de los
 * demás llegan por Supabase Realtime y se fusionan entidad a entidad
 * (`mergeTrips`), así que dos amigos pueden editar a la vez sin pisarse.
 *
 * Tabla necesaria: ver `supabase/schema.sql`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeCode } from '../domain/ids'
import type { ID, Trip, TripSummary } from '../domain/types'
import { LocalTripRepository } from './localRepository'
import { mergeTrips } from './merge'
import type { TripRepository } from './repository'
import { normalizeTrip } from './tripModel'

interface TripRow {
  id: string
  code: string
  data: unknown
  version: number
}

const TABLE = 'trips'
const PENDING_KEY = 'pandilla:pending-sync'
const COLUMNS = 'id, code, data, version'

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms)
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

export class SupabaseTripRepository implements TripRepository {
  readonly mode = 'remote' as const
  private pushes = new Map<ID, Promise<void>>()
  private listeners = new Map<ID, Set<(trip: Trip) => void>>()

  constructor(
    private readonly client: SupabaseClient,
    private readonly local: LocalTripRepository = new LocalTripRepository(),
  ) {
    if (typeof window !== 'undefined') window.addEventListener('online', () => this.flushPending())
    void Promise.resolve().then(() => this.flushPending())
  }

  // ── Pendientes de subir ───────────────────────────────────────────────
  private readPending(): ID[] {
    try {
      return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as ID[]
    } catch {
      return []
    }
  }

  private setPending(id: ID, pending: boolean) {
    const set = new Set(this.readPending())
    if (pending) set.add(id)
    else set.delete(id)
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify([...set]))
    } catch {
      /* ignorado */
    }
  }

  flushPending() {
    for (const id of this.readPending()) void this.push(id)
  }

  // ── Lectura ───────────────────────────────────────────────────────────
  private async fetchRow(filter: { id?: ID; code?: string }): Promise<TripRow | null> {
    let query = this.client.from(TABLE).select(COLUMNS)
    query = filter.id ? query.eq('id', filter.id) : query.eq('code', filter.code ?? '')
    const { data, error } = await withTimeout(query.maybeSingle(), 6000)
    if (error) throw error
    return (data as TripRow | null) ?? null
  }

  /** Fusiona una copia remota con la local, la guarda en el móvil y la devuelve. */
  private async adopt(row: TripRow): Promise<Trip | null> {
    const remote = normalizeTrip(row.data)
    if (!remote) return null
    const local = await this.local.getTrip(remote.id)
    return this.local.saveTrip(local ? mergeTrips(local, remote) : remote)
  }

  listTrips(): Promise<TripSummary[]> {
    return this.local.listTrips()
  }

  async getTrip(id: ID): Promise<Trip | null> {
    const cached = await this.local.getTrip(id)
    if (cached?.meta.isDemo) return cached
    try {
      const row = await this.fetchRow({ id })
      if (row) return (await this.adopt(row)) ?? this.local.getTrip(id)
    } catch {
      /* sin conexión: copia local */
    }
    return this.local.getTrip(id)
  }

  async findByCode(code: string): Promise<Trip | null> {
    try {
      const row = await this.fetchRow({ code: normalizeCode(code) })
      if (row) return this.adopt(row)
    } catch {
      /* sin conexión: buscamos en el móvil */
    }
    return this.local.findByCode(code)
  }

  // ── Escritura ─────────────────────────────────────────────────────────
  async saveTrip(trip: Trip): Promise<Trip> {
    const saved = await this.local.saveTrip(trip)
    // El viaje de ejemplo vive solo en cada móvil.
    if (trip.meta.isDemo) return saved
    this.setPending(trip.id, true)
    void this.push(trip.id)
    return saved
  }

  /** Borra solo la copia de este móvil: el viaje sigue existiendo para el resto del grupo. */
  async deleteTrip(id: ID): Promise<void> {
    this.setPending(id, false)
    await this.local.deleteTrip(id)
  }

  /** Sube los cambios de un viaje (en serie por viaje, con reintento si alguien escribió a la vez). */
  push(id: ID): Promise<void> {
    const previous = this.pushes.get(id) ?? Promise.resolve()
    const next = previous.then(() => this.pushOnce(id)).catch(() => {
      /* se reintentará con el siguiente cambio o al volver la conexión */
    })
    this.pushes.set(id, next)
    return next
  }

  private async pushOnce(id: ID): Promise<void> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const local = await this.local.getTrip(id)
      if (!local || local.meta.isDemo) return
      const row = await this.fetchRow({ id })

      if (!row) {
        const { error } = await withTimeout(
          this.client.from(TABLE).insert({ id, code: normalizeCode(local.meta.code), data: local, version: 1 }),
          8000,
        )
        if (!error) return this.setPending(id, false)
        if (error.code === '23505') continue // otro móvil lo creó a la vez: fusionamos
        throw error
      }

      const remote = normalizeTrip(row.data)
      const merged = remote ? mergeTrips(remote, local) : local
      const mergedJson = JSON.stringify(merged)
      if (remote && mergedJson === JSON.stringify(remote)) {
        // La nube ya tiene todo lo nuestro: no hace falta escribir.
        this.setPending(id, false)
        if (mergedJson !== JSON.stringify(local)) {
          const saved = await this.local.saveTrip(merged)
          for (const cb of this.listeners.get(id) ?? []) cb(saved)
        }
        return
      }
      const { data, error } = await withTimeout(
        this.client
          .from(TABLE)
          .update({ data: merged, code: normalizeCode(merged.meta.code), version: row.version + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('version', row.version)
          .select('version'),
        8000,
      )
      if (error) throw error
      if (data && data.length > 0) {
        this.setPending(id, false)
        if (JSON.stringify(merged) !== JSON.stringify(local)) {
          const saved = await this.local.saveTrip(merged)
          for (const cb of this.listeners.get(id) ?? []) cb(saved)
        }
        return
      }
      // Versión desfasada: alguien guardó entre medias. Volvemos a leer y fusionar.
    }
  }

  // ── Tiempo real ───────────────────────────────────────────────────────
  subscribe(id: ID, onRemoteChange: (trip: Trip) => void): () => void {
    if (id.startsWith('demo-')) return this.local.subscribe(id, onRemoteChange)
    const set = this.listeners.get(id) ?? new Set()
    set.add(onRemoteChange)
    this.listeners.set(id, set)
    const stopLocal = this.local.subscribe(id, onRemoteChange)

    const channel = this.client
      .channel(`trip-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${id}` }, (payload) => {
        const row = payload.new as Partial<TripRow> | undefined
        if (!row?.data) return
        void this.adopt(row as TripRow).then((trip) => trip && onRemoteChange(trip))
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        // Al (re)conectar: traemos lo que cambió mientras estábamos fuera y subimos lo pendiente.
        void this.fetchRow({ id })
          .then((row) => (row ? this.adopt(row) : null))
          .then((trip) => trip && onRemoteChange(trip))
          .catch(() => {})
        this.flushPending()
      })

    return () => {
      stopLocal()
      set.delete(onRemoteChange)
      void this.client.removeChannel(channel)
    }
  }
}

export async function createSupabaseRepository(url: string, anonKey: string): Promise<TripRepository> {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return new SupabaseTripRepository(client)
}
