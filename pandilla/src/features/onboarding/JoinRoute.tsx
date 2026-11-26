import { ArrowLeft, Link2Off } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Trip } from '../../domain/types'
import { findTripByCode, importTrip, isSyncConfigured } from '../../data/app'
import { decodeTripSnapshot } from '../../data/share'
import { navigate } from '../../hooks/useHashRoute'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/misc'
import { ProfilePicker } from './Onboarding'

/** Abre un enlace de invitación: #/unirse/CODIGO[?d=copia-del-viaje]. */
export function JoinRoute({ code, snapshot }: { code: string; snapshot: string | null }) {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'found'; trip: Trip } | { status: 'missing' }>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let trip: Trip | null = null
      if (snapshot) {
        const decoded = await decodeTripSnapshot(snapshot)
        if (decoded) trip = await importTrip(decoded)
      }
      if (!trip) trip = await findTripByCode(code)
      if (!cancelled) setState(trip ? { status: 'found', trip } : { status: 'missing' })
    })()
    return () => {
      cancelled = true
    }
  }, [code, snapshot])

  if (state.status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary" aria-label="Cargando" />
      </div>
    )
  }

  if (state.status === 'missing') {
    return (
      <div className="pt-safe flex flex-1 flex-col justify-center px-5">
        <EmptyState
          icon={<Link2Off className="size-7" />}
          title="No encontramos ese viaje"
          text={
            isSyncConfigured
              ? `No hay ningún viaje con el código ${code}. Comprueba el enlace con quien te lo envió.`
              : `El viaje ${code} no está en este móvil y el enlace no trae una copia. Pide que te reenvíen la invitación desde la app.`
          }
          action={
            <Button variant="secondary" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('', { replace: true })}>
              Ir al inicio
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ProfilePicker trip={state.trip} onBack={() => navigate('', { replace: true })} />
    </div>
  )
}
