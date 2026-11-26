import type { ID } from '../domain/types'

/** Quién eres en cada viaje de este dispositivo y qué viaje está abierto. */
export interface Session {
  activeTripId: ID | null
  profiles: Record<ID, ID>
}

const KEY = 'pandilla:session'
type Listener = () => void

function read(): Session {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Session>
      return { activeTripId: parsed.activeTripId ?? null, profiles: parsed.profiles ?? {} }
    }
  } catch {
    /* sin almacenamiento: sesión solo en memoria */
  }
  return { activeTripId: null, profiles: {} }
}

class SessionStore {
  private state: Session = read()
  private listeners = new Set<Listener>()

  getSnapshot = () => this.state

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => {
      this.listeners.delete(l)
    }
  }

  private set(next: Session) {
    this.state = next
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignorado */
    }
    for (const l of this.listeners) l()
  }

  enter(tripId: ID, memberId: ID) {
    this.set({ activeTripId: tripId, profiles: { ...this.state.profiles, [tripId]: memberId } })
  }

  leave() {
    this.set({ ...this.state, activeTripId: null })
  }

  forgetTrip(tripId: ID) {
    const profiles = { ...this.state.profiles }
    delete profiles[tripId]
    this.set({ activeTripId: this.state.activeTripId === tripId ? null : this.state.activeTripId, profiles })
  }
}

export const sessionStore = new SessionStore()
