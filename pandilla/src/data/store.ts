import type { Trip } from '../domain/types'
import { mergeTrips } from './merge'
import type { TripRepository } from './repository'

type Listener = () => void

/**
 * Estado del viaje abierto. Los componentes lo leen con `useSyncExternalStore`
 * y lo cambian con `update(trip => nuevoTrip)`; el guardado y la sincronización
 * con el repositorio ocurren aquí, fuera de React.
 */
export class TripStore {
  private trip: Trip | null = null
  private listeners = new Set<Listener>()
  private stopRemote: (() => void) | null = null
  private saving: Promise<unknown> = Promise.resolve()
  onError: ((err: unknown) => void) | null = null

  constructor(private readonly getRepo: () => Promise<TripRepository>) {}

  getSnapshot = (): Trip | null => this.trip

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    for (const l of this.listeners) l()
  }

  private openToken = 0

  open(trip: Trip | null) {
    const token = ++this.openToken
    this.stopRemote?.()
    this.stopRemote = null
    this.trip = trip
    this.emit()
    if (trip) {
      void this.getRepo().then((repo) => {
        if (token !== this.openToken) return
        this.stopRemote = repo.subscribe(trip.id, (remote) => this.receive(remote))
      })
    }
  }

  close() {
    this.open(null)
  }

  /** Aplica un cambio local, lo pinta al instante y lo guarda. */
  update(mutator: (trip: Trip) => Trip) {
    const current = this.trip
    if (!current) return
    const next = mutator(current)
    if (next === current) return
    this.trip = next
    this.emit()
    this.persist(next)
  }

  /** Sustituye el viaje entero (p. ej. al importar una copia) y lo guarda. */
  replace(trip: Trip) {
    this.trip = trip
    this.emit()
    this.persist(trip)
  }

  private persist(trip: Trip) {
    this.saving = this.saving
      .then(() => this.getRepo())
      .then((repo) => repo.saveTrip(trip))
      .then((saved) => {
        // Si al guardar se fusionaron cambios ajenos y no hubo otro cambio local entretanto, los mostramos.
        if (saved !== trip && this.trip === trip) {
          this.trip = saved
          this.emit()
        }
      })
      .catch((err) => this.onError?.(err))
  }

  private receive(remote: Trip) {
    if (!this.trip || remote.id !== this.trip.id) return
    const merged = mergeTrips(this.trip, remote)
    this.trip = merged
    this.emit()
    if (JSON.stringify(merged) !== JSON.stringify(remote)) this.persist(merged)
  }

  /** Espera a que terminen los guardados pendientes. */
  flush(): Promise<unknown> {
    return this.saving
  }
}
