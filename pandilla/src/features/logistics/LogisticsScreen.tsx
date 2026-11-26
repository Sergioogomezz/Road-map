import { navigate } from '../../hooks/useHashRoute'
import { useTrip } from '../../hooks/useTrip'
import { ScreenHeader } from '../../ui/misc'
import { Segmented } from '../../ui/Segmented'
import { Cars } from './Cars'
import { Checklist } from './Checklist'
import { Vault } from './Vault'

type View = 'boveda' | 'checklist' | 'coches'

export function LogisticsScreen({ sub }: { sub?: string }) {
  const trip = useTrip()
  const view: View = sub === 'checklist' || sub === 'coches' ? sub : 'boveda'
  const unassigned = trip.checklist.filter((c) => !c.assigneeId).length

  return (
    <>
      <ScreenHeader title="Logística" subtitle="Reservas, cosas comunes y coches">
        <Segmented<View>
          value={view}
          onChange={(v) => navigate(`logistica/${v}`, { replace: true })}
          options={[
            { value: 'boveda', label: 'Bóveda' },
            { value: 'checklist', label: 'Checklist', badge: unassigned },
            { value: 'coches', label: 'Coches' },
          ]}
        />
      </ScreenHeader>
      {view === 'boveda' && <Vault />}
      {view === 'checklist' && <Checklist />}
      {view === 'coches' && <Cars />}
    </>
  )
}
