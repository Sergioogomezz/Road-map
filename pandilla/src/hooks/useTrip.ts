import { useCallback, useSyncExternalStore } from 'react'
import type { Member, Trip } from '../domain/types'
import { tripStore } from '../data/app'
import { sessionStore } from '../data/session'

export function useTripState(): Trip | null {
  return useSyncExternalStore(tripStore.subscribe, tripStore.getSnapshot)
}

/** Solo dentro de la app (hay un viaje abierto). */
export function useTrip(): Trip {
  const trip = useTripState()
  if (!trip) throw new Error('No hay ningún viaje abierto')
  return trip
}

export function useSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
}

/** La persona que usa este móvil en el viaje abierto. */
export function useMe(): Member {
  const trip = useTrip()
  const session = useSession()
  const id = session.profiles[trip.id]
  return trip.members.find((m) => m.id === id) ?? trip.members[0]
}

export function useUpdate() {
  return useCallback((mutator: (trip: Trip) => Trip) => tripStore.update(mutator), [])
}

export function useMembersById() {
  const trip = useTrip()
  return new Map(trip.members.map((m) => [m.id, m]))
}
