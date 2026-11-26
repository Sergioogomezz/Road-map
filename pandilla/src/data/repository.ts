import type { ID, Trip, TripSummary } from '../domain/types'

/**
 * Puerto de persistencia. La app solo habla con esta interfaz, así que cambiar
 * localStorage por una base de datos en tiempo real (Supabase, Firebase, un API
 * propio…) es escribir otra implementación: ver `supabaseRepository.ts`.
 */
export interface TripRepository {
  readonly mode: 'local' | 'remote'
  /** Viajes disponibles en este dispositivo. */
  listTrips(): Promise<TripSummary[]>
  getTrip(id: ID): Promise<Trip | null>
  findByCode(code: string): Promise<Trip | null>
  /** Guarda y devuelve la versión final (fusionada si había cambios de otros). */
  saveTrip(trip: Trip): Promise<Trip>
  deleteTrip(id: ID): Promise<void>
  /** Avisa cuando el viaje cambia desde fuera (otra pestaña, otro móvil). */
  subscribe(id: ID, onRemoteChange: (trip: Trip) => void): () => void
}

export class StorageFullError extends Error {
  constructor() {
    super('No queda espacio en el almacenamiento del navegador')
    this.name = 'StorageFullError'
  }
}

/** Almacén remoto de los archivos de la bóveda (opcional: solo con sincronización). */
export interface RemoteFiles {
  upload(tripId: ID, fileId: ID, blob: Blob): Promise<void>
  download(tripId: ID, fileId: ID): Promise<Blob>
  remove(tripId: ID, fileIds: ID[]): Promise<void>
}
