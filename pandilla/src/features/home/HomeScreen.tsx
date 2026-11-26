import {
  ArrowRight,
  CalendarPlus,
  CarTaxiFront,
  ChevronRight,
  ClipboardCheck,
  FolderLock,
  MessageSquareQuote,
  PartyPopper,
  Settings2,
  UserPlus,
  Vote,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { Activity } from '../../domain/types'
import { atLocal, countdownParts, formatClock, formatDayLong, formatRange, formatUntil, todayISO, tripPhase } from '../../domain/dates'
import { activitiesOfDay, byTime, isPast, nextActivity } from '../../domain/itinerary'
import { formatEUR, moneySummary } from '../../domain/money'
import { proposalStatus, tallyVotes } from '../../domain/polls'
import { navigate } from '../../hooks/useHashRoute'
import { useNow } from '../../hooks/useNow'
import { useMe, useTrip } from '../../hooks/useTrip'
import { Avatar, AvatarStack } from '../../ui/Avatar'
import { IconButton } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { Card, SectionTitle } from '../../ui/misc'
import { ACTIVITY_TAGS } from '../meta'
import { InviteSheet } from '../settings/InviteSheet'
import { SettingsSheet } from '../settings/SettingsSheet'
import { MapsButtons } from '../shared'
import { SyncBadge } from '../SyncBadge'
import { TaxiMode } from './TaxiMode'

export function HomeScreen() {
  const trip = useTrip()
  const me = useMe()
  const now = useNow(30_000)
  const [taxi, setTaxi] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const minuteKey = Math.floor(now.getTime() / 60_000)
  const next = useMemo(() => nextActivity(trip.activities, new Date(minuteKey * 60_000)), [trip.activities, minuteKey])

  const money = useMemo(() => moneySummary(trip.members.map((m) => m.id), trip.expenses, trip.settlements), [trip.members, trip.expenses, trip.settlements])
  const mine = money.byMember.get(me.id)

  const pendingPolls = useMemo(() => {
    const memberIds = trip.members.map((m) => m.id)
    const activityIds = new Set(trip.activities.map((a) => a.id))
    return trip.proposals.filter((p) => {
      const tally = tallyVotes(p.id, trip.votes, memberIds)
      const status = proposalStatus(p, tally, Boolean(p.activityId && activityIds.has(p.activityId)))
      const voted = [...tally.si, ...tally.no, ...tally.igual].includes(me.id)
      return (status === 'abierta' || status === 'empate') && !voted
    }).length
  }, [trip, me.id])

  const checklistDone = trip.checklist.filter((c) => c.done).length
  const unassigned = trip.checklist.filter((c) => !c.assigneeId).length
  const offlineFiles = trip.documents.reduce((acc, d) => acc + d.files.length, 0)
  const latestQuote = [...trip.quotes].sort((a, b) => b.saidAt.localeCompare(a.saidAt))[0]
  const quoteAuthor = latestQuote?.authorId ? trip.members.find((m) => m.id === latestQuote.authorId)?.name : latestQuote?.authorName
  const today = todayISO()
  const todayLeft = activitiesOfDay(trip.activities, today)
    .filter((a) => a.id !== next?.id && (a.time ? atLocal(a.date, a.time).getTime() > now.getTime() : !isPast(a, now)))
    .sort(byTime)

  return (
    <div>
      {/* Cabecera */}
      <section className="hero-gradient relative overflow-hidden rounded-b-[36px] px-5 pb-6 text-white">
        <span aria-hidden className="pointer-events-none absolute -right-6 -bottom-10 text-[150px] leading-none opacity-20 select-none">
          {trip.meta.emoji}
        </span>
        <div className="pt-safe flex items-center gap-2 pt-3">
          <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-bold tracking-widest backdrop-blur">{trip.meta.code}</span>
          <SyncBadge isDemo={Boolean(trip.meta.isDemo)} />
          <div className="flex-1" />
          <IconButton label="Invitar a la pandilla" className="bg-white/18 text-white hover:bg-white/25" onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-5" />
          </IconButton>
          <button type="button" onClick={() => setSettingsOpen(true)} className="press flex items-center gap-1.5 rounded-full bg-white/18 py-1 pr-2.5 pl-1 backdrop-blur hover:bg-white/25" aria-label="Ajustes y perfil">
            <Avatar member={me} size="sm" />
            <Settings2 className="size-4" />
          </button>
        </div>
        <div className="relative mt-5">
          <p className="text-sm font-semibold text-white/85">
            {trip.meta.destination ? `${trip.meta.destination} · ` : ''}
            {formatRange(trip.meta.startDate, trip.meta.endDate)}
          </p>
          <h1 className="mt-1 font-display text-[32px] leading-[1.05] font-extrabold tracking-tight">{trip.meta.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PhasePill />
            <button type="button" onClick={() => setInviteOpen(true)} className="press flex items-center gap-2 text-sm font-semibold text-white/90">
              <AvatarStack members={trip.members} max={5} size="sm" />
              {trip.members.length}
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* Modo taxi */}
        <button
          type="button"
          onClick={() => setTaxi(true)}
          className="press group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-taxi p-4 text-left text-taxi-fg shadow-[0_14px_30px_-14px_rgba(255,190,0,0.9)]"
        >
          <span className="taxi-stripes absolute inset-y-0 right-0 w-3 opacity-90" aria-hidden />
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-black text-taxi">
            <CarTaxiFront className="size-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base leading-tight font-extrabold min-[400px]:text-lg">Modo taxi · Vuelta a casa</span>
            <span className="block truncate text-sm font-medium opacity-75">{trip.meta.accommodation.name || 'Configura el alojamiento'}</span>
          </span>
          <ArrowRight className="mr-2 size-5 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* Próxima actividad */}
        <Card className="p-4">
          <SectionTitle
            action={
              <button type="button" onClick={() => navigate(`plan/itinerario?dia=${next?.date ?? today}`)} className="press text-sm font-semibold text-primary-text">
                Itinerario
              </button>
            }
          >
            Próxima actividad
          </SectionTitle>
          {next ? (
            <NextActivity activity={next} now={now} />
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                <CalendarPlus className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Nada programado</p>
                <p className="text-sm text-muted">Añade un plan o mira las votaciones.</p>
              </div>
              <IconButton label="Ir al itinerario" variant="soft" onClick={() => navigate('plan/itinerario')}>
                <ChevronRight className="size-5" />
              </IconButton>
            </div>
          )}
          {todayLeft.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
              {todayLeft.slice(0, 3).map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="tabular w-11 font-semibold text-fg-2">{a.time || '—'}</span>
                  <span className={cn('size-2 shrink-0 rounded-full', ACTIVITY_TAGS[a.tag].dot)} />
                  <span className="truncate">{a.title}</span>
                </li>
              ))}
              {todayLeft.length > 3 && <li className="pl-14 text-xs text-muted">y {todayLeft.length - 3} más hoy</li>}
            </ul>
          )}
        </Card>

        {/* Balance */}
        <button type="button" onClick={() => navigate('gastos/saldar')} className="press text-left">
          <Card className="flex items-center gap-4 p-4">
            <BalanceBadge cents={mine?.balance ?? 0} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold tracking-wide text-muted uppercase">Tu balance</p>
              <p className={cn('mt-0.5 font-display text-2xl font-extrabold tabular', (mine?.balance ?? 0) > 0 ? 'text-success-text' : (mine?.balance ?? 0) < 0 ? 'text-danger-text' : 'text-fg')}>
                {(mine?.balance ?? 0) > 0 ? `Te deben ${formatEUR(mine!.balance)}` : (mine?.balance ?? 0) < 0 ? `Debes ${formatEUR(-mine!.balance)}` : 'Estás en paz'}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Has pagado {formatEUR(mine?.paid ?? 0)} · tu parte {formatEUR(mine?.share ?? 0)}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted" />
          </Card>
        </button>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <QuickTile
            icon={<Vote className="size-5" />}
            tint="bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300"
            title="Votaciones"
            text={pendingPolls ? `${pendingPolls} esperan tu voto` : trip.proposals.length ? 'Todo votado' : 'Propón el primer plan'}
            highlight={pendingPolls > 0}
            onClick={() => navigate('plan/votaciones')}
          />
          <QuickTile
            icon={<ClipboardCheck className="size-5" />}
            tint="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
            title="Checklist"
            text={trip.checklist.length ? `${checklistDone}/${trip.checklist.length} listos${unassigned ? ` · ${unassigned} sin dueño` : ''}` : 'Apunta lo que es de todos'}
            onClick={() => navigate('logistica/checklist')}
          />
          <QuickTile
            icon={<FolderLock className="size-5" />}
            tint="bg-sky-500/12 text-sky-700 dark:text-sky-300"
            title="Bóveda"
            text={trip.documents.length ? `${trip.documents.length} reservas · ${offlineFiles} archivos` : 'Guarda vuelos y reservas'}
            onClick={() => navigate('logistica/boveda')}
          />
          <QuickTile
            icon={<PartyPopper className="size-5" />}
            tint="bg-amber-500/14 text-amber-800 dark:text-amber-300"
            title="Retos"
            text={trip.challenges.length ? `${trip.challenges.length} en marcha` : 'Crea un bingo o un marcador'}
            onClick={() => navigate('social/retos')}
          />
        </div>

        {latestQuote && (
          <button type="button" onClick={() => navigate('social')} className="press text-left">
            <Card className="relative overflow-hidden p-5">
              <MessageSquareQuote className="absolute top-4 right-4 size-6 text-primary/30" />
              <p className="text-[13px] font-bold tracking-wide text-muted uppercase">Última frase mítica</p>
              <p className="mt-2 font-display text-lg leading-snug font-semibold">«{latestQuote.text}»</p>
              {quoteAuthor && <p className="mt-2 text-sm text-muted">— {quoteAuthor}</p>}
            </Card>
          </button>
        )}
      </div>

      {taxi && <TaxiMode onClose={() => setTaxi(false)} onConfigure={() => { setTaxi(false); setSettingsOpen(true) }} />}
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}

/** Solo este trozo se repinta cada segundo (cuenta atrás). */
function PhasePill() {
  const trip = useTrip()
  const now = useNow(1000)
  const phase = tripPhase(trip.meta, now)
  if (phase.phase === 'antes') {
    const c = countdownParts(phase.start, now)
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-bold backdrop-blur">
        <span className="size-2 animate-pulse rounded-full bg-taxi" />
        {c.days > 0 ? (
          <span className="tabular">
            Faltan {c.days} {c.days === 1 ? 'día' : 'días'} · {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
          </span>
        ) : (
          <span className="tabular">
            ¡Es mañana! {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
          </span>
        )}
      </span>
    )
  }
  if (phase.phase === 'durante') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-bold backdrop-blur">
        <span className="size-2 animate-pulse rounded-full bg-success" />
        Día {phase.dayIndex} de {phase.totalDays} · {formatDayLong(todayISO()).split(',')[0]}
      </span>
    )
  }
  return <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-bold backdrop-blur">🏁 Viaje terminado</span>
}

function NextActivity({ activity, now }: { activity: Activity; now: Date }) {
  const meta = ACTIVITY_TAGS[activity.tag]
  const Icon = meta.icon
  const when = atLocal(activity.date, activity.time)
  const started = when.getTime() <= now.getTime()
  return (
    <div className="mt-3">
      <div className="flex items-start gap-3">
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl', meta.chip)}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl leading-none font-extrabold tabular">{activity.time || formatClock(when)}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', started ? 'bg-success-soft text-success-text' : 'bg-primary-soft text-primary-text')}>
              {started ? 'Ahora' : formatUntil(when, now)}
            </span>
          </div>
          <p className="mt-1 text-[17px] leading-snug font-bold">{activity.title}</p>
          {activity.location && <p className="mt-0.5 truncate text-sm text-muted">{activity.location}</p>}
        </div>
      </div>
      {activity.notes && <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm leading-relaxed text-fg-2">{activity.notes}</p>}
      {activity.location && <MapsButtons query={activity.location} directions className="mt-3" />}
    </div>
  )
}

function BalanceBadge({ cents }: { cents: number }) {
  const tone = cents > 0 ? 'bg-success-soft text-success-text' : cents < 0 ? 'bg-danger-soft text-danger-text' : 'bg-surface-2 text-fg-2'
  return <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl', tone)}>{cents > 0 ? '🤑' : cents < 0 ? '💸' : '🤝'}</span>
}

function QuickTile({ icon, tint, title, text, onClick, highlight }: { icon: ReactNode; tint: string; title: string; text: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="press text-left">
      <Card className={cn('relative h-full p-4', highlight && 'ring-2 ring-accent/50')}>
        {highlight && <span className="absolute top-3 right-3 size-2.5 animate-pulse rounded-full bg-accent" />}
        <span className={cn('flex size-10 items-center justify-center rounded-2xl', tint)}>{icon}</span>
        <p className="mt-3 font-bold">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{text}</p>
      </Card>
    </button>
  )
}
