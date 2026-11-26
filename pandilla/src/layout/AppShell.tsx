import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import { moneySummary } from '../domain/money'
import { proposalStatus, tallyVotes } from '../domain/polls'
import { HomeScreen } from '../features/home/HomeScreen'
import { useHashRoute } from '../hooks/useHashRoute'
import { useMe, useTrip } from '../hooks/useTrip'
import { useOnline } from '../hooks/useOnline'
import { BottomNav } from './BottomNav'
import { isTab, type TabId } from './tabs'

// Cada pestaña se carga al abrirla por primera vez (el service worker las deja todas en caché).
const PlanScreen = lazy(() => import('../features/plan/PlanScreen').then((m) => ({ default: m.PlanScreen })))
const ExpensesScreen = lazy(() => import('../features/expenses/ExpensesScreen').then((m) => ({ default: m.ExpensesScreen })))
const LogisticsScreen = lazy(() => import('../features/logistics/LogisticsScreen').then((m) => ({ default: m.LogisticsScreen })))
const SocialScreen = lazy(() => import('../features/social/SocialScreen').then((m) => ({ default: m.SocialScreen })))

function ScreenFallback() {
  return (
    <div className="px-5 pt-6" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-surface-2" />
      <div className="mt-4 h-10 animate-pulse rounded-2xl bg-surface-2" />
      <div className="mt-6 h-32 animate-pulse rounded-3xl bg-surface-2" />
      <div className="mt-3 h-32 animate-pulse rounded-3xl bg-surface-2" />
    </div>
  )
}

export function useActiveTab(): [TabId, string | undefined] {
  const [route] = useHashRoute()
  const tab = isTab(route.path[0]) ? route.path[0] : 'inicio'
  return [tab, route.path[1]]
}

export function AppShell() {
  const [tab, sub] = useActiveTab()
  const scroller = useRef<HTMLElement>(null)
  const online = useOnline()

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [tab, sub])

  return (
    <main ref={scroller} id="main-scroller" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {!online && (
        <div className="sticky top-0 z-30 bg-warning-soft px-4 py-1.5 text-center text-xs font-semibold text-warning-text pt-[max(6px,env(safe-area-inset-top))]">
          Sin conexión · todo sigue funcionando y se guarda en el móvil
        </div>
      )}
      <div key={tab} className="min-h-full animate-screen-in pb-32">
        <Suspense fallback={<ScreenFallback />}>
          {tab === 'inicio' && <HomeScreen />}
          {tab === 'plan' && <PlanScreen sub={sub} />}
          {tab === 'gastos' && <ExpensesScreen sub={sub} />}
          {tab === 'logistica' && <LogisticsScreen sub={sub} />}
          {tab === 'social' && <SocialScreen sub={sub} />}
        </Suspense>
      </div>
    </main>
  )
}

export function NavBar() {
  const [tab] = useActiveTab()
  const [, navigate] = useHashRoute()
  const trip = useTrip()
  const me = useMe()

  const badges = useMemo(() => {
    const memberIds = trip.members.map((m) => m.id)
    const activityIds = new Set(trip.activities.map((a) => a.id))
    const pendingVotes = trip.proposals.filter((p) => {
      const tally = tallyVotes(p.id, trip.votes, memberIds)
      const status = proposalStatus(p, tally, Boolean(p.activityId && activityIds.has(p.activityId)))
      const voted = tally.si.includes(me.id) || tally.no.includes(me.id) || tally.igual.includes(me.id)
      return (status === 'abierta' || status === 'empate') && !voted
    }).length
    const myBalance = moneySummary(memberIds, trip.expenses, trip.settlements).byMember.get(me.id)?.balance ?? 0
    return { plan: pendingVotes || undefined, gastos: myBalance <= -100 ? ('dot' as const) : undefined }
  }, [trip, me.id])

  return <BottomNav active={tab} badges={badges} onSelect={(t) => navigate(t === 'inicio' ? 'inicio' : t)} />
}
