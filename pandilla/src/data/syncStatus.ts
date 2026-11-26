/** Estado de la sincronización con la nube, para enseñarlo en la interfaz. */

export type SyncPhase = 'conectando' | 'en-directo' | 'sincronizado' | 'sin-conexion' | 'error'

export interface SyncState {
  phase: SyncPhase
  /** Viajes con cambios pendientes de subir. */
  pending: number
  lastSyncAt: number | null
  /** Explicación legible cuando hay un error. */
  message: string
}

type Listener = () => void

class SyncStatusStore {
  private state: SyncState = { phase: 'conectando', pending: 0, lastSyncAt: null, message: '' }
  private listeners = new Set<Listener>()

  getSnapshot = () => this.state

  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => {
      this.listeners.delete(l)
    }
  }

  set(patch: Partial<SyncState>) {
    const next = { ...this.state, ...patch }
    if (
      next.phase === this.state.phase &&
      next.pending === this.state.pending &&
      next.lastSyncAt === this.state.lastSyncAt &&
      next.message === this.state.message
    ) {
      return
    }
    this.state = next
    for (const l of this.listeners) l()
  }
}

export const syncStatus = new SyncStatusStore()

/** Traduce un error de red o de Supabase a algo que se entienda. */
export function describeSyncError(err: unknown): { phase: 'sin-conexion' | 'error'; message: string } {
  const e = err as { message?: string; code?: string } | undefined
  const text = `${e?.message ?? ''} ${e?.code ?? ''}`
  if ((typeof navigator !== 'undefined' && !navigator.onLine) || /fetch|network|tiempo de espera|timeout|load failed/i.test(text)) {
    return { phase: 'sin-conexion', message: 'Sin conexión: los cambios se subirán al volver la cobertura' }
  }
  if (e?.code === 'PGRST205' || e?.code === '42P01' || /could not find the table|does not exist/i.test(text)) {
    return { phase: 'error', message: 'Falta crear la tabla en Supabase: ejecuta supabase/schema.sql en el SQL Editor' }
  }
  if (/jwt|api key|apikey|401|unauthorized|invalid/i.test(text)) {
    return { phase: 'error', message: 'Supabase rechaza la clave: revisa la URL y la clave pública (anon) en Vercel' }
  }
  return { phase: 'error', message: e?.message ? `Error de Supabase: ${e.message}` : 'Error al sincronizar con Supabase' }
}
