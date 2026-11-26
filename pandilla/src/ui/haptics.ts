/** Pequeña vibración de confirmación (solo Android; iOS la ignora). */
export function haptic(pattern: number | number[] = 8) {
  try {
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(pattern)
  } catch {
    /* no disponible */
  }
}
