import { useEffect } from 'react'

/** Mantiene la pantalla encendida mientras `active` (p. ej. en el modo taxi). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        /* sin permiso o batería baja: no pasa nada */
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && void request()
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => undefined)
    }
  }, [active])
}
