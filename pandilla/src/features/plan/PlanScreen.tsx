import { useMemo } from 'react'
import { formatRange } from '../../domain/dates'
import { proposalStatus, tallyVotes } from '../../domain/polls'
import { navigate } from '../../hooks/useHashRoute'
import { useMe, useTrip } from '../../hooks/useTrip'
import { ScreenHeader } from '../../ui/misc'
import { Segmented } from '../../ui/Segmented'
import { Itinerary } from './Itinerary'
import { Polls } from './Polls'

type View = 'itinerario' | 'votaciones'

export function PlanScreen({ sub }: { sub?: string }) {
  const trip = useTrip()
  const me = useMe()
  const view: View = sub === 'votaciones' ? 'votaciones' : 'itinerario'

  const pending = useMemo(() => {
    const ids = trip.members.map((m) => m.id)
    const activityIds = new Set(trip.activities.map((a) => a.id))
    return trip.proposals.filter((p) => {
      const tally = tallyVotes(p.id, trip.votes, ids)
      const status = proposalStatus(p, tally, Boolean(p.activityId && activityIds.has(p.activityId)))
      return (status === 'abierta' || status === 'empate') && ![...tally.si, ...tally.no, ...tally.igual].includes(me.id)
    }).length
  }, [trip, me.id])

  return (
    <>
      <ScreenHeader title="Plan" subtitle={`${trip.meta.destination || trip.meta.name} · ${formatRange(trip.meta.startDate, trip.meta.endDate)}`}>
        <Segmented<View>
          value={view}
          onChange={(v) => navigate(`plan/${v}`, { replace: true })}
          options={[
            { value: 'itinerario', label: 'Itinerario' },
            { value: 'votaciones', label: 'Votaciones', badge: pending },
          ]}
        />
      </ScreenHeader>
      {view === 'itinerario' ? <Itinerary /> : <Polls />}
    </>
  )
}
