import {
  CalendarCheck,
  CalendarPlus,
  Dices,
  Ellipsis,
  ExternalLink,
  Link2,
  MapPin,
  Pencil,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Trophy,
  Utensils,
  Vote,
  X,
  Meh,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatAgo, formatDayChip } from '../../domain/dates'
import { proposalStatus, tallyVotes, type ProposalStatus, type Tally } from '../../domain/polls'
import type { Proposal, VoteValue } from '../../domain/types'
import { castVote, decideProposal, deleteProposal, put } from '../../data/actions'
import { tripStore } from '../../data/app'
import { navigate } from '../../hooks/useHashRoute'
import { useMe, useMembersById, useTrip, useUpdate } from '../../hooks/useTrip'
import { ActionSheet } from '../../ui/ActionSheet'
import { Avatar, AvatarStack } from '../../ui/Avatar'
import { Button, IconButton } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { confetti } from '../../ui/confetti'
import { useConfirm } from '../../ui/Confirm'
import { haptic } from '../../ui/haptics'
import { Card, EmptyState, Fab, FilterChip } from '../../ui/misc'
import { useSheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { DiceSheet } from './DiceSheet'
import { ProposalSheet } from './ProposalSheet'
import { ScheduleSheet } from './ScheduleSheet'

type Filter = 'abiertas' | 'ganadoras' | 'todas'

export interface ProposalView {
  proposal: Proposal
  tally: Tally
  status: ProposalStatus
}

const STATUS_ORDER: Record<ProposalStatus, number> = { abierta: 0, empate: 1, aprobada: 2, programada: 3, descartada: 4 }

export function useProposalViews(): ProposalView[] {
  const trip = useTrip()
  return useMemo(() => {
    const ids = trip.members.map((m) => m.id)
    const activityIds = new Set(trip.activities.map((a) => a.id))
    return trip.proposals
      .map((p) => {
        const tally = tallyVotes(p.id, trip.votes, ids)
        return { proposal: p, tally, status: proposalStatus(p, tally, Boolean(p.activityId && activityIds.has(p.activityId))) }
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.proposal.createdAt - a.proposal.createdAt)
  }, [trip])
}

export function Polls() {
  const views = useProposalViews()
  const counts = {
    abiertas: views.filter((v) => v.status === 'abierta' || v.status === 'empate').length,
    ganadoras: views.filter((v) => v.status === 'aprobada' || v.status === 'programada').length,
  }
  const [filter, setFilter] = useState<Filter>(counts.abiertas ? 'abiertas' : 'todas')
  const proposalSheet = useSheet<Proposal>()
  const scheduleSheet = useSheet<Proposal>()
  const [diceOpen, setDiceOpen] = useState(false)

  const shown = views.filter((v) =>
    filter === 'abiertas' ? v.status === 'abierta' || v.status === 'empate' : filter === 'ganadoras' ? v.status === 'aprobada' || v.status === 'programada' : true,
  )
  const candidates = views.filter((v) => v.status === 'abierta' || v.status === 'empate' || (v.status === 'aprobada' && !v.proposal.activityId))

  return (
    <div className="px-4 pb-4">
      <div className="relative overflow-hidden rounded-3xl bg-fg p-4 text-bg">
        <Sparkles className="absolute -top-2 -right-2 size-20 opacity-10" />
        <p className="font-display text-lg font-bold">Matar la indecisión</p>
        <p className="mt-1 text-sm opacity-75">Proponed planes o restaurantes y votad en un toque. Gana la mitad más uno.</p>
        {candidates.length >= 2 && (
          <button
            type="button"
            onClick={() => setDiceOpen(true)}
            className="press mt-3 inline-flex h-10 items-center gap-2 rounded-2xl bg-bg/12 px-3.5 text-sm font-bold hover:bg-bg/20"
          >
            <Dices className="size-5" /> ¿Empate? Que decida la suerte
          </button>
        )}
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <FilterChip active={filter === 'abiertas'} onClick={() => setFilter('abiertas')} count={counts.abiertas}>
          Abiertas
        </FilterChip>
        <FilterChip active={filter === 'ganadoras'} onClick={() => setFilter('ganadoras')} count={counts.ganadoras}>
          Ganadoras
        </FilterChip>
        <FilterChip active={filter === 'todas'} onClick={() => setFilter('todas')} count={views.length}>
          Todas
        </FilterChip>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {shown.map((v) => (
          <ProposalCard key={v.proposal.id} view={v} onEdit={() => proposalSheet.open(v.proposal)} onSchedule={() => scheduleSheet.open(v.proposal)} />
        ))}
        {shown.length === 0 && (
          <EmptyState
            icon={<Vote className="size-7" />}
            title={filter === 'abiertas' ? 'Nada pendiente de votar' : 'Sin propuestas todavía'}
            text="¿Una cena especial, una excursión, un bar? Propónlo y que vote la pandilla."
            action={<Button onClick={() => proposalSheet.open()}>Proponer algo</Button>}
          />
        )}
      </div>

      <Fab label="Proponer" onClick={() => proposalSheet.open()} />
      {proposalSheet.state && (
        <ProposalSheet key={proposalSheet.state.key} open={proposalSheet.state.open} onClose={proposalSheet.close} proposal={proposalSheet.state.target} />
      )}
      {scheduleSheet.state?.target && (
        <ScheduleSheet key={scheduleSheet.state.key} open={scheduleSheet.state.open} onClose={scheduleSheet.close} proposal={scheduleSheet.state.target} />
      )}
      <DiceSheet
        open={diceOpen}
        onClose={() => setDiceOpen(false)}
        candidates={candidates}
        onSchedule={(p) => {
          setDiceOpen(false)
          scheduleSheet.open(p)
        }}
      />
    </div>
  )
}

const STATUS_BADGE: Record<ProposalStatus, { label: string; cls: string }> = {
  abierta: { label: 'Abierta', cls: 'bg-surface-2 text-fg-2' },
  empate: { label: 'Empate', cls: 'bg-warning-soft text-warning-text' },
  aprobada: { label: '¡Ganadora!', cls: 'bg-success-soft text-success-text' },
  programada: { label: 'En el itinerario', cls: 'bg-primary-soft text-primary-text' },
  descartada: { label: 'Descartada', cls: 'bg-danger-soft text-danger-text' },
}

const VOTE_BUTTONS: { value: VoteValue; label: string; icon: typeof ThumbsUp; active: string; bar: string }[] = [
  { value: 'si', label: 'Sí', icon: ThumbsUp, active: 'bg-success text-white border-success', bar: 'bg-success' },
  { value: 'igual', label: 'Me da igual', icon: Meh, active: 'bg-fg-2 text-bg border-fg-2', bar: 'bg-muted/60' },
  { value: 'no', label: 'No', icon: ThumbsDown, active: 'bg-danger text-white border-danger', bar: 'bg-danger' },
]

function ProposalCard({ view, onEdit, onSchedule }: { view: ProposalView; onEdit: () => void; onSchedule: () => void }) {
  const { proposal: p, tally, status } = view
  const trip = useTrip()
  const me = useMe()
  const byId = useMembersById()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const [menu, setMenu] = useState(false)
  const myVote: VoteValue | undefined = tally.si.includes(me.id) ? 'si' : tally.no.includes(me.id) ? 'no' : tally.igual.includes(me.id) ? 'igual' : undefined
  const missing = trip.members.filter((m) => ![...tally.si, ...tally.no, ...tally.igual].includes(m.id))
  const activity = p.activityId ? trip.activities.find((a) => a.id === p.activityId) : undefined
  const author = byId.get(p.createdBy)
  const badge = STATUS_BADGE[status]
  const KindIcon = p.kind === 'restaurante' ? Utensils : Sparkles

  const vote = (value: VoteValue) => {
    haptic(myVote === value ? 4 : 12)
    update((t) => castVote(t, p.id, me.id, value))
    // Si este voto decide la votación, lo celebramos y ofrecemos llevarla al itinerario.
    const next = tripStore.getSnapshot()
    const updated = next?.proposals.find((x) => x.id === p.id)
    if (!next || !updated) return
    const nextStatus = proposalStatus(updated, tallyVotes(p.id, next.votes, next.members.map((m) => m.id)), false)
    if (nextStatus === 'aprobada' && status !== 'aprobada') {
      confetti()
      toast(`¡«${p.title}» gana la votación!`, { tone: 'success', duration: 6000, action: { label: 'Al itinerario', onClick: onSchedule } })
    } else if (nextStatus === 'descartada' && status !== 'descartada') {
      toast(`«${p.title}» queda descartada por mayoría`)
    }
  }

  return (
    <Card as="article" className={cn('p-4', status === 'descartada' && 'opacity-70')}>
      <div className="flex items-start gap-3">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', p.kind === 'restaurante' ? 'bg-orange-500/12 text-orange-700 dark:text-orange-300' : 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300')}>
          <KindIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', badge.cls)}>{badge.label}</span>
            <span className="text-[11px] font-semibold text-muted uppercase">{p.kind === 'restaurante' ? 'Restaurante' : 'Plan'}</span>
          </div>
          <h3 className="mt-1 text-[17px] leading-snug font-bold">{p.title}</h3>
        </div>
        <IconButton label="Opciones de la propuesta" size="sm" onClick={() => setMenu(true)} className="-mt-1 -mr-1">
          <Ellipsis className="size-5" />
        </IconButton>
      </div>

      {p.description && <p className="mt-2 text-sm leading-relaxed text-fg-2">{p.description}</p>}
      {(p.location || p.price || p.link) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted">
          {p.location && (
            <span className="inline-flex max-w-full items-center gap-1">
              <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{p.location}</span>
            </span>
          )}
          {p.price && (
            <span className="inline-flex items-center gap-1">
              <Wallet className="size-3.5" /> {p.price}
            </span>
          )}
          {p.link && (
            <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary-text">
              <Link2 className="size-3.5" /> Ver enlace
            </a>
          )}
        </div>
      )}

      {/* Barra de resultados */}
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        {VOTE_BUTTONS.map((b) => (
          <span key={b.value} className={cn('h-full transition-[width] duration-500 ease-out', b.bar)} style={{ width: `${(tally[b.value].length / Math.max(1, tally.total)) * 100}%` }} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Tu voto">
        {VOTE_BUTTONS.map((b) => {
          const Icon = b.icon
          const active = myVote === b.value
          const voters = tally[b.value]
          return (
            <button
              key={b.value}
              type="button"
              aria-pressed={active}
              disabled={status === 'programada'}
              onClick={() => vote(b.value)}
              className={cn(
                'press flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-xs font-bold transition-colors disabled:opacity-60',
                active ? b.active : 'border-line bg-surface text-fg-2 hover:bg-surface-2',
              )}
            >
              <span className="flex items-center gap-1.5">
                <Icon className={cn('size-4', active && 'animate-pop')} /> {b.label}
              </span>
              <span className="flex h-5 items-center gap-1">
                <span className="tabular text-sm">{voters.length}</span>
                {voters.length > 0 && <AvatarStack members={voters.map((id) => byId.get(id))} max={3} size="xs" />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        {author && <Avatar member={author} size="xs" />}
        <span className="min-w-0 flex-1 truncate">
          {author ? `Propuesto por ${author.id === me.id ? 'ti' : author.name}` : 'Propuesta'} · {formatAgo(p.createdAt)}
        </span>
        {(status === 'abierta' || status === 'empate') && missing.length > 0 && (
          <span className="flex shrink-0 items-center gap-1">
            Faltan <AvatarStack members={missing} max={3} size="xs" />
          </span>
        )}
      </div>

      {status === 'aprobada' && (
        <Button full className="mt-3" icon={<CalendarPlus className="size-4" />} onClick={onSchedule}>
          Añadir al itinerario
        </Button>
      )}
      {status === 'programada' && activity && (
        <button
          type="button"
          onClick={() => navigate(`plan/itinerario?dia=${activity.date}`)}
          className="press mt-3 flex w-full items-center gap-2 rounded-2xl bg-primary-soft px-3 py-2.5 text-sm font-semibold text-primary-text"
        >
          <CalendarCheck className="size-4" />
          <span className="flex-1 text-left">
            En el itinerario · {formatDayChip(activity.date)}
            {activity.time && `, ${activity.time}`}
          </span>
          <ExternalLink className="size-4" />
        </button>
      )}

      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title={p.title}
        actions={[
          { label: 'Editar propuesta', icon: <Pencil className="size-4" />, onSelect: onEdit },
          ...(status !== 'programada'
            ? [
                { label: 'Añadir ya al itinerario', icon: <CalendarPlus className="size-4" />, hint: 'Se da por aprobada', onSelect: onSchedule },
                status === 'aprobada' || status === 'descartada' || p.decision
                  ? { label: 'Reabrir votación', icon: <RotateCcw className="size-4" />, onSelect: () => update((t) => decideProposal(t, p.id, null)) }
                  : { label: 'Dar por aprobada', icon: <Trophy className="size-4" />, onSelect: () => update((t) => decideProposal(t, p.id, 'aprobada')) },
                ...(status !== 'descartada'
                  ? [{ label: 'Descartar', icon: <X className="size-4" />, onSelect: () => update((t) => decideProposal(t, p.id, 'descartada')) }]
                  : []),
              ]
            : []),
          {
            label: 'Eliminar propuesta',
            icon: <Trash2 className="size-4" />,
            tone: 'danger' as const,
            onSelect: async () => {
              if (!(await confirm({ title: `¿Eliminar «${p.title}»?`, message: 'Se borrarán también sus votos.' }))) return
              const votes = trip.votes.filter((v) => v.proposalId === p.id)
              update((t) => deleteProposal(t, p.id))
              toast('Propuesta eliminada', {
                action: { label: 'Deshacer', onClick: () => update((t) => votes.reduce((acc, v) => put(acc, 'votes', v), put(t, 'proposals', p))) },
              })
            },
          },
        ]}
      />
    </Card>
  )
}
