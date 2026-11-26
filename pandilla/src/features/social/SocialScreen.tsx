import { navigate } from '../../hooks/useHashRoute'
import { useTrip } from '../../hooks/useTrip'
import { ScreenHeader } from '../../ui/misc'
import { Segmented } from '../../ui/Segmented'
import { Challenges } from './Challenges'
import { QuotesWall } from './QuotesWall'

type View = 'frases' | 'retos'

export function SocialScreen({ sub }: { sub?: string }) {
  const trip = useTrip()
  const view: View = sub === 'retos' ? 'retos' : 'frases'
  return (
    <>
      <ScreenHeader title="Social" subtitle={`${trip.quotes.length} frases míticas · ${trip.challenges.length} retos`}>
        <Segmented<View>
          value={view}
          onChange={(v) => navigate(`social/${v}`, { replace: true })}
          options={[
            { value: 'frases', label: 'Frases míticas' },
            { value: 'retos', label: 'Retos y marcador' },
          ]}
        />
      </ScreenHeader>
      {view === 'frases' ? <QuotesWall /> : <Challenges />}
    </>
  )
}
