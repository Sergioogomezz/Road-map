/**
 * Sincronización en tiempo real con Supabase (opcional).
 *
 * Funciona "offline first": cada cambio se guarda primero en el móvil
 * (LocalTripRepository) y luego se sube en segundo plano. Sin cobertura, el
 * viaje queda pendiente y se sube al volver la conexión. Los cambios de los
 * demás llegan por Supabase Realtime y, como respaldo, la app vuelve a mirar la
 * nube al abrirse, al volver a primer plano y cada pocos segundos. Las copias
 * se fusionan entidad a entidad (`mergeTrips`): dos amigos pueden editar a la
 * vez sin pisarse.
 *
 * Las fotos y PDFs de la bóveda se guardan en Supabase Storage (cubo `pandilla`).
 * Tabla, avisos y cubo: ver `supabase/schema.sql`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeCode } from '../domain/ids'
import type { ID, Trip, TripSummary } from '../domain/types'
import { LocalTripRepository } from './localRepository'
import { mergeTrips } from './merge'
import type { RemoteFiles, TripRepository } from './repository'
import { describeSyncError, syncStatus } from './syncStatus'
import { normalizeTrip } from './tripModel'

interface TripRow {
  id: string
  code: string
  data: unknown
  version: number
}

const TABLE = 'trips'
const BUCKET = 'pandilla'
const PENDING_KEY = 'pandilla:pending-sync'
const COLUMNS = 'id, code, data, version'
/** Cada cuánto se vuelve a mirar la nube mientras la app está a la vista (respaldo del tiempo real). */
const POLL_MS = 15_000

const isDemoId = (id: ID) => id.startsWith('demo-')
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

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
  private realtimeOk = false

  constructor(
    private readonly client: SupabaseClient,
    private readonly local: LocalTripRepository = new LocalTripRepository(),
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.flushPending())
      window.addEventListener('offline', () => syncStatus.set({ phase: 'sin-conexion', message: 'Sin conexión: los cambios se subirán al volver la cobertura' }))
    }
    syncStatus.set({ pending: this.readPending().length })
    void Promise.resolve().then(() => this.flushPending())
  }

  // ── Estado ────────────────────────────────────────────────────────────
  private ok() {
    syncStatus.set({ phase: this.realtimeOk ? 'en-directo' : 'sincronizado', lastSyncAt: Date.now(), message: '' })
  }

  private fail(err: unknown) {
    const { phase, message } = describeSyncError(err)
    syncStatus.set({ phase, message })
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
    syncStatus.set({ pending: set.size })
  }

  flushPending() {
    for (const id of this.readPending()) void this.push(id)
  }

  // ── Lectura ───────────────────────────────────────────────────────────
  private async fetchRow(filter: { id?: ID; code?: string }): Promise<TripRow | null> {
    let query = this.client.from(TABLE).select(COLUMNS)
    query = filter.id ? query.eq('id', filter.id) : query.eq('code', filter.code ?? '')
    const { data, error } = await withTimeout(query.maybeSingle(), 8000)
    if (error) throw error
    return (data as TripRow | null) ?? null
  }

  /**
   * Fusiona una copia de la nube con la del móvil y la guarda. Si el móvil
   * tenía cosas que la nube no, programa la subida.
   */
  private async adopt(row: TripRow): Promise<Trip | null> {
    const remote = normalizeTrip(row.data)
    if (!remote) return null
    const local = await this.local.getTrip(remote.id)
    if (!local) return this.local.saveTrip(remote)
    const merged = mergeTrips(local, remote)
    if (!same(merged, remote)) {
      this.setPending(remote.id, true)
      void this.push(remote.id)
    }
    if (same(merged, local)) return local
    return this.local.saveTrip(merged)
  }

  /** Trae la versión de la nube. Si el viaje aún no está subido (creado sin conexión o antes de conectar Supabase), lo sube. */
  private async pull(id: ID): Promise<Trip | null> {
    try {
      const row = await this.fetchRow({ id })
      this.ok()
      if (row) return await this.adopt(row)
      const local = await this.local.getTrip(id)
      if (local && !local.meta.isDemo) {
        this.setPending(id, true)
        void this.push(id)
      }
      return null
    } catch (err) {
      this.fail(err)
      return null
    }
  }

  listTrips(): Promise<TripSummary[]> {
    return this.local.listTrips()
  }

  /** Abre al instante la copia del móvil; la de la nube llega justo después vía `subscribe`. */
  async getTrip(id: ID): Promise<Trip | null> {
    const cached = await this.local.getTrip(id)
    if (cached || isDemoId(id)) return cached
    try {
      const row = await this.fetchRow({ id })
      this.ok()
      return row ? this.adopt(row) : null
    } catch (err) {
      this.fail(err)
      return null
    }
  }

  async findByCode(code: string): Promise<Trip | null> {
    try {
      const row = await this.fetchRow({ code: normalizeCode(code) })
      this.ok()
      if (row) return this.adopt(row)
    } catch (err) {
      this.fail(err)
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
    const next = previous
      .then(() => this.pushOnce(id))
      .then(() => this.ok())
      .catch((err) => this.fail(err))
    this.pushes.set(id, next)
    return next
  }

  private async pushOnce(id: ID): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const local = await this.local.getTrip(id)
      if (!local || local.meta.isDemo) return this.setPending(id, false)
      const row = await this.fetchRow({ id })

      if (!row) {
        const { error } = await withTimeout(
          this.client.from(TABLE).insert({ id, code: normalizeCode(local.meta.code), data: local, version: 1 }),
          10000,
        )
        if (!error) return this.setPending(id, false)
        if (error.code === '23505') continue // otro móvil lo creó a la vez: fusionamos
        throw error
      }

      const remote = normalizeTrip(row.data)
      const merged = remote ? mergeTrips(remote, local) : local
      if (remote && same(merged, remote)) {
        // La nube ya tiene todo lo nuestro: no hace falta escribir.
        this.setPending(id, false)
        if (!same(merged, local)) this.notify(id, await this.local.saveTrip(merged))
        return
      }
      const { data, error } = await withTimeout(
        this.client
          .from(TABLE)
          .update({ data: merged, code: normalizeCode(merged.meta.code), version: row.version + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('version', row.version)
          .select('version'),
        10000,
      )
      if (error) throw error
      if (data && data.length > 0) {
        this.setPending(id, false)
        if (!same(merged, local)) this.notify(id, await this.local.saveTrip(merged))
        return
      }
      // Versión desfasada: alguien guardó entre medias. Volvemos a leer y fusionar.
    }
  }

  private notify(id: ID, trip: Trip) {
    for (const cb of this.listeners.get(id) ?? []) cb(trip)
  }

  // ── Tiempo real ───────────────────────────────────────────────────────
  subscribe(id: ID, onRemoteChange: (trip: Trip) => void): () => void {
    if (isDemoId(id)) return this.local.subscribe(id, onRemoteChange)
    const set = this.listeners.get(id) ?? new Set()
    set.add(onRemoteChange)
    this.listeners.set(id, set)
    const stopLocal = this.local.subscribe(id, onRemoteChange)

    let refreshing: Promise<void> | null = null
    const refresh = () => {
      refreshing ??= this.pull(id)
        .then((trip) => {
          if (trip) onRemoteChange(trip)
        })
        .finally(() => {
          refreshing = null
        })
      return refreshing
    }

    const channel = this.client
      .channel(`trip-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${id}` }, (payload) => {
        const row = payload.new as Partial<TripRow> | undefined
        // Si el aviso trae el viaje entero lo usamos; si viene recortado (viajes muy grandes), lo pedimos.
        if (row?.data && typeof row.version === 'number') {
          void this.adopt(row as TripRow).then((trip) => trip && onRemoteChange(trip))
          this.ok()
        } else {
          void refresh()
        }
      })
      .on('system', {}, (msg: { extension?: string; status?: string }) => {
        if (msg?.extension !== 'postgres_changes') return
        this.realtimeOk = msg.status === 'ok'
        // Los avisos empiezan a llegar aquí: recuperamos lo que pudo cambiar mientras conectábamos.
        void refresh()
        this.flushPending()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void refresh()
          this.flushPending()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.realtimeOk = false
          if (syncStatus.getSnapshot().phase === 'en-directo') syncStatus.set({ phase: 'sincronizado' })
        }
      })

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const onOnline = () => void refresh()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    void refresh()

    return () => {
      stopLocal()
      set.delete(onRemoteChange)
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      this.realtimeOk = false
      void this.client.removeChannel(channel)
    }
  }
}

/** Fotos y PDFs de la bóveda en Supabase Storage. */
export class SupabaseFiles implements RemoteFiles {
  constructor(private readonly client: SupabaseClient) {}

  async upload(tripId: ID, fileId: ID, blob: Blob): Promise<void> {
    const { error } = await withTimeout(
      this.client.storage.from(BUCKET).upload(`${tripId}/${fileId}`, blob, { contentType: blob.type || 'application/octet-stream', upsert: true }),
      60_000,
    )
    if (error) throw error
  }

  async download(tripId: ID, fileId: ID): Promise<Blob> {
    const { data, error } = await withTimeout(this.client.storage.from(BUCKET).download(`${tripId}/${fileId}`), 60_000)
    if (error || !data) throw error ?? new Error('Archivo no encontrado')
    return data
  }

  async remove(tripId: ID, fileIds: ID[]): Promise<void> {
    if (!fileIds.length) return
    const { error } = await this.client.storage.from(BUCKET).remove(fileIds.map((f) => `${tripId}/${f}`))
    if (error) throw error
  }
}

export async function createSupabaseServices(url: string, anonKey: string): Promise<{ repo: TripRepository; files: RemoteFiles }> {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return { repo: new SupabaseTripRepository(client), files: new SupabaseFiles(client) }
}
