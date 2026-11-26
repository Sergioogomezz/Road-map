import { normalizeCode } from '../domain/ids'
import type { ID, Trip, TripSummary } from '../domain/types'
import { mergeTrips } from './merge'
import { StorageFullError, type TripRepository } from './repository'
import { normalizeTrip, tripSummary } from './tripModel'

const PREFIX = 'pandilla:trip:'

function parse(json: string | null): Trip | null {
  if (!json) return null
  try {
    return normalizeTrip(JSON.parse(json))
  } catch {
    return null
  }
}

/**
 * Guarda cada viaje como un documento JSON en localStorage.
 * Las pestañas abiertas se sincronizan en directo con el evento `storage`.
 */
export class LocalTripRepository implements TripRepository {
  readonly mode = 'local' as const
  private lastWritten = new Map<ID, string>()

  /** `storage` se puede inyectar (tests, varios "móviles" simulados). */
  constructor(private readonly storageOverride?: Storage) {}

  private get storage(): Storage | null {
    try {
      return this.storageOverride ?? globalThis.localStorage ?? null
    } catch {
      return null
    }
  }

  private safeGet(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null
    } catch {
      return null
    }
  }

  private keys(): string[] {
    const out: string[] = []
    const storage = this.storage
    if (!storage) return out
    try {
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i)
        if (k?.startsWith(PREFIX)) out.push(k)
      }
    } catch {
      /* almacenamiento bloqueado */
    }
    return out
  }

  async listTrips(): Promise<TripSummary[]> {
    return this.keys()
      .map((k) => parse(this.safeGet(k)))
      .filter((t): t is Trip => t !== null)
      .map(tripSummary)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async getTrip(id: ID): Promise<Trip | null> {
    return parse(this.safeGet(PREFIX + id))
  }

  async findByCode(code: string): Promise<Trip | null> {
    const wanted = normalizeCode(code)
    for (const k of this.keys()) {
      const trip = parse(this.safeGet(k))
      if (trip && normalizeCode(trip.meta.code) === wanted) return trip
    }
    return null
  }

  async saveTrip(trip: Trip): Promise<Trip> {
    const key = PREFIX + trip.id
    const storedRaw = this.safeGet(key)
    let result = trip
    // Si otra pestaña escribió después que nosotros, fusionamos antes de pisar nada.
    if (storedRaw && storedRaw !== this.lastWritten.get(trip.id)) {
      const stored = parse(storedRaw)
      if (stored) result = mergeTrips(stored, trip)
    }
    const json = JSON.stringify(result)
    try {
      if (!this.storage) throw new Error('Almacenamiento no disponible')
      this.storage.setItem(key, json)
    } catch (err) {
      if (err instanceof DOMException) throw new StorageFullError()
      throw err
    }
    this.lastWritten.set(trip.id, json)
    return result
  }

  async deleteTrip(id: ID): Promise<void> {
    try {
      this.storage?.removeItem(PREFIX + id)
    } catch {
      /* nada que borrar */
    }
    this.lastWritten.delete(id)
  }

  subscribe(id: ID, onRemoteChange: (trip: Trip) => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key !== PREFIX + id || !e.newValue || e.newValue === this.lastWritten.get(id)) return
      const trip = parse(e.newValue)
      if (trip) onRemoteChange(trip)
    }
    if (typeof window === 'undefined' || this.storageOverride) return () => {}
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }
}
