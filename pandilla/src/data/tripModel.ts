import { defaultRates } from '../domain/currency'
import { COLLECTIONS, type Trip, type TripMeta, type TripSummary } from '../domain/types'

export function emptyTrip(id: string, meta: TripMeta): Trip {
  return {
    id,
    schema: 1,
    meta,
    rates: defaultRates(),
    members: [],
    activities: [],
    proposals: [],
    votes: [],
    subgroups: [],
    expenses: [],
    settlements: [],
    documents: [],
    checklist: [],
    cars: [],
    quotes: [],
    reactions: [],
    challenges: [],
    scores: [],
    bingoMarks: [],
    tombstones: {},
    updatedAt: meta.updatedAt,
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Valida lo mínimo y completa colecciones que falten (copias antiguas o importadas). */
export function normalizeTrip(raw: unknown): Trip | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || !isObject(raw.meta)) return null
  const meta = raw.meta as Partial<TripMeta>
  if (typeof meta.name !== 'string' || typeof meta.startDate !== 'string' || typeof meta.endDate !== 'string') return null
  const trip = { ...raw } as Record<string, unknown>
  for (const key of COLLECTIONS) if (!Array.isArray(trip[key])) trip[key] = []
  if (!isObject(trip.tombstones)) trip.tombstones = {}
  if (!isObject(trip.rates) || !isObject((trip.rates as Record<string, unknown>).values)) trip.rates = defaultRates()
  trip.meta = {
    emoji: '🧳',
    destination: '',
    code: '',
    accommodation: { name: '', address: '' },
    createdAt: 0,
    updatedAt: 0,
    ...meta,
  }
  if (typeof trip.updatedAt !== 'number') trip.updatedAt = 0
  trip.schema = 1
  return trip as unknown as Trip
}

export function tripSummary(trip: Trip): TripSummary {
  return {
    id: trip.id,
    name: trip.meta.name,
    destination: trip.meta.destination,
    emoji: trip.meta.emoji,
    startDate: trip.meta.startDate,
    endDate: trip.meta.endDate,
    code: trip.meta.code,
    isDemo: Boolean(trip.meta.isDemo),
    memberCount: trip.members.length,
    updatedAt: trip.updatedAt,
  }
}
