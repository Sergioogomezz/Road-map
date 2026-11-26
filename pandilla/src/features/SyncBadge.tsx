import { Cloud, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import { isSyncConfigured } from '../data/app'
import { useSyncStatus } from '../hooks/useSyncStatus'
import { useOnline } from '../hooks/useOnline'
import { cn } from '../ui/cn'

/** Pastilla con el estado de la sincronización (solo si hay Supabase y no es el viaje de ejemplo). */
export function SyncBadge({ isDemo, className }: { isDemo: boolean; className?: string }) {
  const state = useSyncStatus()
  const online = useOnline()
  if (!isSyncConfigured || isDemo) return null
  const phase = online ? state.phase : 'sin-conexion'
  const pending = state.pending > 0
  const { icon, label } =
    phase === 'en-directo'
      ? { icon: <span className="size-2 animate-pulse rounded-full bg-success" />, label: pending ? 'Subiendo…' : 'En directo' }
      : phase === 'sincronizado'
        ? { icon: <Cloud className="size-3.5" />, label: pending ? 'Subiendo…' : 'Sincronizado' }
        : phase === 'sin-conexion'
          ? { icon: <CloudOff className="size-3.5" />, label: 'Sin conexión' }
          : phase === 'error'
            ? { icon: <TriangleAlert className="size-3.5" />, label: 'Error al sincronizar' }
            : { icon: <RefreshCw className="size-3.5 animate-spin" />, label: 'Conectando…' }
  return (
    <span
      title={state.message || label}
      className={cn('inline-flex items-center gap-1.5 rounded-full bg-white/18 px-2.5 py-1 text-xs font-bold whitespace-nowrap backdrop-blur', phase === 'error' && 'bg-danger text-white', className)}
    >
      {icon}
      {label}
      {pending && phase !== 'en-directo' && phase !== 'sincronizado' && <span className="size-1.5 rounded-full bg-taxi" aria-label="cambios pendientes" />}
    </span>
  )
}
