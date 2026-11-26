import { useEffect, useState } from 'react'
import { ensureDemoSeeded, openTrip, tripStore } from './data/app'
import { StorageFullError } from './data/repository'
import { sessionStore } from './data/session'
import { JoinRoute } from './features/onboarding/JoinRoute'
import { Onboarding } from './features/onboarding/Onboarding'
import { Logo } from './features/shared'
import { useHashRoute } from './hooks/useHashRoute'
import { useTheme } from './hooks/useTheme'
import { useSession, useTripState } from './hooks/useTrip'
import { AppShell, NavBar } from './layout/AppShell'
import { PwaPrompt } from './layout/PwaPrompt'
import { ConfirmProvider } from './ui/Confirm'
import { Frame } from './ui/Frame'
import { ToastProvider, useToast } from './ui/Toast'

export function App() {
  const [ready, setReady] = useState(false)
  const session = useSession()
  const trip = useTripState()
  const [route] = useHashRoute()
  useTheme()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensureDemoSeeded()
      } catch (err) {
        console.error('No se pudo cargar el viaje de ejemplo', err)
      }
      const s = sessionStore.getSnapshot()
      if (s.activeTripId) {
        const opened = await openTrip(s.activeTripId)
        const memberId = opened ? s.profiles[opened.id] : undefined
        if (!opened || !memberId || !opened.members.some((m) => m.id === memberId)) sessionStore.leave()
      }
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const joinCode = route.path[0] === 'unirse' ? route.path[1] : undefined
  const inApp = ready && !joinCode && Boolean(session.activeTripId) && trip?.id === session.activeTripId

  return (
    <Frame nav={inApp ? <NavBar /> : undefined}>
      <ToastProvider>
        <ConfirmProvider>
          <StoreErrors />
          <PwaPrompt />
          {!ready ? (
            <Splash />
          ) : joinCode ? (
            <JoinRoute key={joinCode} code={joinCode} snapshot={route.params.get('d')} />
          ) : inApp ? (
            <AppShell />
          ) : (
            <Onboarding />
          )}
        </ConfirmProvider>
      </ToastProvider>
    </Frame>
  )
}

function Splash() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Logo className="size-16 animate-pulse" />
    </div>
  )
}

function StoreErrors() {
  const toast = useToast()
  useEffect(() => {
    tripStore.onError = (err) =>
      toast(err instanceof StorageFullError ? 'El móvil no tiene espacio para guardar más cambios' : 'No se pudo guardar el último cambio', { tone: 'danger' })
    return () => {
      tripStore.onError = null
    }
  }, [toast])
  return null
}
