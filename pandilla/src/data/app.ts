/**
 * Servicios de la app: repositorio (local o Supabase), estado del viaje abierto
 * y operaciones de alto nivel (crear, unirse, importar, restaurar el ejemplo…).
 */
import { tripCode, uid, now } from '../domain/ids'
import { todayISO, addDays } from '../domain/dates'
import type { ID, Member, Trip } from '../domain/types'
import { addMember } from './actions'
import { deleteTripFiles, putFile, requestPersistence } from './fileStore'
import { LocalTripRepository } from './localRepository'
import { mergeTrips } from './merge'
import type { RemoteFiles, TripRepository } from './repository'
import { DEMO_TRIP_ID, buildDemoTrip } from './seed'
import { sessionStore } from './session'
import { TripStore } from './store'
import { emptyTrip } from './tripModel'

const SEEDED_KEY = 'pandilla:seeded'

interface Services {
  repo: TripRepository
  files: RemoteFiles | null
}

let servicesPromise: Promise<Services> | null = null

async function createServices(): Promise<Services> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (url && key) {
    try {
      const { createSupabaseServices } = await import('./supabaseRepository')
      return await createSupabaseServices(url, key)
    } catch (err) {
      console.warn('No se pudo iniciar Supabase; se usa el almacenamiento local.', err)
    }
  }
  return { repo: new LocalTripRepository(), files: null }
}

function getServices(): Promise<Services> {
  servicesPromise ??= createServices()
  return servicesPromise
}

export function getRepository(): Promise<TripRepository> {
  return getServices().then((s) => s.repo)
}

/** Archivos en la nube (null si no hay sincronización). */
export function getRemoteFiles(): Promise<RemoteFiles | null> {
  return getServices().then((s) => s.files)
}

export const tripStore = new TripStore(getRepository)

export const isSyncConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Precarga el viaje de ejemplo la primera vez que se abre la app. */
export async function ensureDemoSeeded(): Promise<void> {
  let seeded = false
  try {
    seeded = localStorage.getItem(SEEDED_KEY) === '1'
  } catch {
    /* ignorado */
  }
  if (seeded) return
  await restoreDemo()
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    /* ignorado */
  }
}

/** (Re)crea el viaje de ejemplo con fechas relativas a hoy. */
export async function restoreDemo(): Promise<Trip> {
  const repo = await getRepository()
  const { trip, files } = buildDemoTrip()
  await Promise.all(files.map((f) => putFile(f.id, trip.id, f.blob).catch(() => undefined)))
  await repo.deleteTrip(DEMO_TRIP_ID)
  const saved = await repo.saveTrip(trip)
  if (tripStore.getSnapshot()?.id === DEMO_TRIP_ID) tripStore.open(saved)
  return saved
}

export async function openTrip(tripId: ID): Promise<Trip | null> {
  const repo = await getRepository()
  const trip = await repo.getTrip(tripId)
  tripStore.open(trip)
  return trip
}

export async function enterTrip(trip: Trip, memberId: ID): Promise<void> {
  sessionStore.enter(trip.id, memberId)
  tripStore.open(trip)
  void requestPersistence()
}

/** Entra con un nombre nuevo: se añade al viaje como miembro. */
export async function joinAsNewMember(trip: Trip, name: string): Promise<{ trip: Trip; member: Member }> {
  const repo = await getRepository()
  const existing = trip.members.find((m) => m.name.trim().toLowerCase() === name.trim().toLowerCase())
  if (existing) return { trip, member: existing }
  const result = addMember(trip, name)
  const saved = await repo.saveTrip(result.trip)
  return { trip: saved, member: result.member }
}

/** Guarda en el móvil un viaje recibido por enlace, fusionándolo si ya existía. */
export async function importTrip(incoming: Trip): Promise<Trip> {
  const repo = await getRepository()
  const existing = await repo.getTrip(incoming.id)
  const saved = await repo.saveTrip(existing ? mergeTrips(existing, incoming) : incoming)
  if (tripStore.getSnapshot()?.id === saved.id) tripStore.open(saved)
  return saved
}

export async function findTripByCode(code: string): Promise<Trip | null> {
  const repo = await getRepository()
  return repo.findByCode(code)
}

export interface NewTripInput {
  name: string
  destination: string
  emoji: string
  startDate: string
  endDate: string
  myName: string
  friends: string[]
  accommodationName: string
  accommodationAddress: string
}

export async function createTrip(input: NewTripInput): Promise<{ trip: Trip; me: Member }> {
  const repo = await getRepository()
  const t = now()
  let trip = emptyTrip(uid('t'), {
    name: input.name.trim(),
    destination: input.destination.trim(),
    emoji: input.emoji || '🧳',
    startDate: input.startDate || todayISO(),
    endDate: input.endDate >= input.startDate ? input.endDate : input.startDate || addDays(todayISO(), 3),
    code: tripCode(),
    accommodation: { name: input.accommodationName.trim(), address: input.accommodationAddress.trim() },
    createdAt: t,
    updatedAt: t,
  })
  const first = addMember(trip, input.myName)
  trip = first.trip
  for (const name of input.friends) {
    if (name.trim()) trip = addMember(trip, name).trip
  }
  const saved = await repo.saveTrip(trip)
  return { trip: saved, me: first.member }
}

/** Elimina el viaje de este dispositivo (y sus archivos). */
export async function deleteTripFromDevice(tripId: ID): Promise<void> {
  const repo = await getRepository()
  await repo.deleteTrip(tripId)
  await deleteTripFiles(tripId).catch(() => undefined)
  sessionStore.forgetTrip(tripId)
  if (tripStore.getSnapshot()?.id === tripId) tripStore.close()
}

/** Sale del viaje actual (vuelve a la portada sin borrar nada). */
export function leaveTrip() {
  sessionStore.leave()
  tripStore.close()
}
