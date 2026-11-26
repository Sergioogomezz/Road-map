import { Check, Crown, Ellipsis, Grid3x3, Minus, Pencil, Plus, RotateCcw, Trash2, Trophy, Undo2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { completedLines, gridSize } from '../../domain/challenges'
import { now, uid } from '../../domain/ids'
import type { BingoMark, Challenge, ChallengeKind, ID, Score } from '../../domain/types'
import { bumpScore, deleteChallenge, markCell, put, resetScores } from '../../data/actions'
import { useMe, useMembersById, useTrip, useUpdate } from '../../hooks/useTrip'
import { ActionSheet } from '../../ui/ActionSheet'
import { Avatar } from '../../ui/Avatar'
import { Button, IconButton } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { useConfirm } from '../../ui/Confirm'
import { confetti } from '../../ui/confetti'
import { Field, TextArea, TextInput } from '../../ui/Field'
import { haptic } from '../../ui/haptics'
import { MemberPicker } from '../../ui/MemberPicker'
import { Card, EmptyState, Fab, ProgressBar } from '../../ui/misc'
import { Segmented } from '../../ui/Segmented'
import { Sheet, useSheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'

export function Challenges() {
  const trip = useTrip()
  const sheet = useSheet<Challenge>()
  const challenges = [...trip.challenges].sort((a, b) => a.createdAt - b.createdAt)

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {challenges.length === 0 ? (
        <EmptyState
          icon={<Trophy className="size-7" />}
          title="Sin retos todavía"
          text="Un contador de retrasos, de «¡qué frío!» o un bingo del viaje le dan otro nivel al grupo."
          action={<Button onClick={() => sheet.open()}>Crear un reto</Button>}
        />
      ) : (
        challenges.map((c) =>
          c.kind === 'contador' ? <CounterCard key={c.id} challenge={c} onEdit={() => sheet.open(c)} /> : <BingoCard key={c.id} challenge={c} onEdit={() => sheet.open(c)} />,
        )
      )}
      <Fab label="Nuevo reto" onClick={() => sheet.open()} />
      {sheet.state && <ChallengeSheet key={sheet.state.key} open={sheet.state.open} onClose={sheet.close} challenge={sheet.state.target} />}
    </div>
  )
}

function ChallengeMenu({ challenge, open, onClose, onEdit }: { challenge: Challenge; open: boolean; onClose: () => void; onEdit: () => void }) {
  const trip = useTrip()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const scores = trip.scores.filter((s) => s.challengeId === challenge.id)
  const marks = trip.bingoMarks.filter((m) => m.challengeId === challenge.id)
  const restore = (t: typeof trip, list: (Score | BingoMark)[]) =>
    list.reduce((acc, item) => ('cellId' in item ? put(acc, 'bingoMarks', item) : put(acc, 'scores', item)), t)

  return (
    <ActionSheet
      open={open}
      onClose={onClose}
      title={`${challenge.emoji} ${challenge.title}`}
      actions={[
        { label: 'Editar reto', icon: <Pencil className="size-4" />, onSelect: onEdit },
        {
          label: challenge.kind === 'bingo' ? 'Borrar todas las marcas' : 'Poner el marcador a cero',
          icon: <RotateCcw className="size-4" />,
          onSelect: async () => {
            if (!(await confirm({ title: '¿Empezar de cero?', confirmLabel: 'Reiniciar' }))) return
            update((t) => (challenge.kind === 'bingo' ? marks.reduce((acc, m) => markCell(acc, challenge.id, m.cellId, null), t) : resetScores(t, challenge.id)))
            toast('Reto reiniciado', { action: { label: 'Deshacer', onClick: () => update((t) => restore(t, [...scores, ...marks])) } })
          },
        },
        {
          label: 'Borrar reto',
          icon: <Trash2 className="size-4" />,
          tone: 'danger',
          onSelect: async () => {
            if (!(await confirm({ title: `¿Borrar «${challenge.title}»?` }))) return
            update((t) => deleteChallenge(t, challenge.id))
            toast('Reto borrado', { action: { label: 'Deshacer', onClick: () => update((t) => restore(put(t, 'challenges', challenge), [...scores, ...marks])) } })
          },
        },
      ]}
    />
  )
}

function CounterCard({ challenge, onEdit }: { challenge: Challenge; onEdit: () => void }) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const [menu, setMenu] = useState(false)
  const [bumped, setBumped] = useState<{ id: ID; n: number } | null>(null)
  const value = (id: ID) => trip.scores.find((s) => s.id === `${challenge.id}:${id}`)?.value ?? 0
  const rows = [...trip.members].sort((a, b) => value(b.id) - value(a.id) || a.name.localeCompare(b.name))
  const top = value(rows[0]?.id)
  const total = rows.reduce((acc, m) => acc + value(m.id), 0)

  const bump = (id: ID, delta: number) => {
    haptic(delta > 0 ? 10 : 4)
    update((t) => bumpScore(t, challenge.id, id, delta))
    setBumped({ id, n: Date.now() })
  }

  return (
    <Card as="article" className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-2xl">{challenge.emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight font-bold">{challenge.title}</h3>
          {challenge.description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{challenge.description}</p>}
        </div>
        <IconButton label="Opciones del reto" size="sm" onClick={() => setMenu(true)}>
          <Ellipsis className="size-5" />
        </IconButton>
      </div>
      <ol className="mt-4 flex flex-col gap-1.5">
        {rows.map((m, i) => {
          const v = value(m.id)
          const leader = v > 0 && v === top
          return (
            <li key={m.id} className={cn('flex items-center gap-3 rounded-2xl py-1.5 pr-1.5 pl-2', leader ? 'bg-taxi/25' : 'bg-surface-2/60')}>
              <span className="w-5 text-center text-sm font-bold text-muted">{leader ? <Crown className="mx-auto size-4 text-amber-600 dark:text-amber-300" /> : i + 1}</span>
              <Avatar member={m} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {m.name}
                {m.id === me.id && <span className="font-normal text-muted"> (tú)</span>}
              </span>
              <IconButton label={`Restar a ${m.name}`} variant="surface" size="sm" disabled={v === 0} onClick={() => bump(m.id, -1)}>
                <Minus className="size-4" />
              </IconButton>
              <span key={bumped?.id === m.id ? bumped.n : 0} className={cn('tabular w-8 text-center font-display text-xl font-extrabold', bumped?.id === m.id && 'animate-pop')}>
                {v}
              </span>
              <IconButton label={`Sumar a ${m.name}`} variant="solid" size="sm" onClick={() => bump(m.id, 1)}>
                <Plus className="size-4" />
              </IconButton>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-xs text-muted">
        {total === 0 ? 'Nadie ha puntuado aún.' : `${total} en total · ${top > 0 ? `va ganando ${rows.filter((m) => value(m.id) === top).map((m) => m.name).join(' y ')}` : ''}`}
      </p>
      <ChallengeMenu challenge={challenge} open={menu} onClose={() => setMenu(false)} onEdit={onEdit} />
    </Card>
  )
}

function BingoCard({ challenge, onEdit }: { challenge: Challenge; onEdit: () => void }) {
  const trip = useTrip()
  const me = useMe()
  const byId = useMembersById()
  const update = useUpdate()
  const toast = useToast()
  const [menu, setMenu] = useState(false)
  const [picking, setPicking] = useState<{ cellId: ID; key: number } | null>(null)
  const marks = trip.bingoMarks.filter((m) => m.challengeId === challenge.id)
  const markOf = (cellId: ID) => marks.find((m) => m.cellId === cellId)
  const size = gridSize(challenge.cells)
  const isSquare = challenge.cells.length === size * size
  const lines = completedLines(challenge.cells, marks)
  const done = challenge.cells.filter((c) => markOf(c.id)).length
  const pickingCell = challenge.cells.find((c) => c.id === picking?.cellId)

  const mark = (cellId: ID, memberId: ID | null) => {
    const before = completedLines(challenge.cells, marks)
    const nextMarks = memberId ? [...marks.filter((m) => m.cellId !== cellId), { id: '', challengeId: challenge.id, cellId, memberId, at: now(), updatedAt: 0 }] : marks.filter((m) => m.cellId !== cellId)
    const after = completedLines(challenge.cells, nextMarks)
    update((t) => markCell(t, challenge.id, cellId, memberId))
    haptic(memberId ? 12 : 4)
    if (memberId && nextMarks.length === challenge.cells.length) {
      confetti()
      toast('¡¡BINGO!! Cartón completo 🎉', { tone: 'success' })
    } else if (after > before) {
      confetti()
      toast(after - before > 1 ? `¡${after - before} LÍNEAS de golpe!` : '¡LÍNEA! 🎯', { tone: 'success' })
    }
  }

  return (
    <Card as="article" className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-2xl">{challenge.emoji}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight font-bold">{challenge.title}</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            {done}/{challenge.cells.length} conseguidos{isSquare ? ` · ${lines} ${lines === 1 ? 'línea' : 'líneas'}` : ''}
          </p>
        </div>
        <IconButton label="Opciones del bingo" size="sm" onClick={() => setMenu(true)}>
          <Ellipsis className="size-5" />
        </IconButton>
      </div>
      {challenge.description && <p className="mt-2 text-[13px] text-muted">{challenge.description}</p>}
      <ProgressBar value={challenge.cells.length ? done / challenge.cells.length : 0} className="mt-3" />
      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {challenge.cells.map((cell) => {
          const m = markOf(cell.id)
          const member = m ? byId.get(m.memberId) : undefined
          return (
            <button
              key={cell.id}
              type="button"
              aria-pressed={Boolean(m)}
              onClick={() => setPicking({ cellId: cell.id, key: Date.now() })}
              className={cn(
                'press relative flex aspect-square flex-col items-center justify-center rounded-2xl border p-1.5 text-center text-[11px] leading-tight font-semibold transition-colors',
                m ? 'border-transparent text-white' : 'border-line bg-surface-2/70 text-fg-2 hover:bg-surface-2',
              )}
              style={member ? { backgroundColor: member.color } : undefined}
            >
              <span className={cn('line-clamp-4', size > 3 && 'text-[10px]')}>{cell.text}</span>
              {member && (
                <span className="absolute top-1 right-1 flex size-5 animate-pop items-center justify-center rounded-full bg-white/90 text-[10px] font-bold" style={{ color: member.color }}>
                  <Check className="size-3" strokeWidth={4} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      {!isSquare && <p className="mt-2 text-xs text-muted">Con 9 o 16 retos se cantan líneas.</p>}

      {picking && pickingCell && (
        <CellSheet
          key={picking.key}
          text={pickingCell.text}
          current={markOf(pickingCell.id)?.memberId}
          meId={me.id}
          onClose={() => setPicking(null)}
          onPick={(id) => mark(pickingCell.id, id)}
        />
      )}
      <ChallengeMenu challenge={challenge} open={menu} onClose={() => setMenu(false)} onEdit={onEdit} />
    </Card>
  )
}

function CellSheet({ text, current, meId, onClose, onPick }: { text: string; current?: ID; meId: ID; onClose: () => void; onPick: (id: ID | null) => void }) {
  const trip = useTrip()
  const [open, setOpen] = useState(true)
  const [who, setWho] = useState<ID>(current ?? meId)
  const close = () => {
    setOpen(false)
    window.setTimeout(onClose, 230)
  }
  return (
    <Sheet
      open={open}
      onClose={close}
      title={text}
      subtitle={current ? 'Conseguido' : '¿Quién lo ha conseguido?'}
      footer={
        <div className="flex gap-3">
          {current && (
            <Button
              variant="secondary"
              icon={<Undo2 className="size-4" />}
              onClick={() => {
                onPick(null)
                close()
              }}
            >
              Desmarcar
            </Button>
          )}
          <Button
            full
            icon={<Check className="size-4" />}
            onClick={() => {
              onPick(who)
              close()
            }}
          >
            {current ? 'Guardar' : '¡Conseguido!'}
          </Button>
        </div>
      }
    >
      <MemberPicker members={trip.members} value={who} onChange={setWho} meId={meId} />
    </Sheet>
  )
}

const EMOJIS = ['⏰', '🥶', '🎯', '🍻', '😂', '📸', '🏆', '💤', '🤦', '🧭', '🌶️', '🎤']

function ChallengeSheet({ open, onClose, challenge }: { open: boolean; onClose: () => void; challenge?: Challenge }) {
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const [kind, setKind] = useState<ChallengeKind>(challenge?.kind ?? 'contador')
  const [emoji, setEmoji] = useState(challenge?.emoji ?? '⏰')
  const [title, setTitle] = useState(challenge?.title ?? '')
  const [description, setDescription] = useState(challenge?.description ?? '')
  const [cellsText, setCellsText] = useState((challenge?.cells ?? []).map((c) => c.text).join('\n'))
  const lines = cellsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 25)
  const valid = title.trim() && (kind === 'contador' || lines.length >= 4)

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    if (!valid) return
    const old = challenge?.cells ?? []
    update((t) =>
      put(t, 'challenges', {
        id: challenge?.id ?? uid('ch'),
        kind,
        emoji,
        title: title.trim(),
        description: description.trim(),
        cells: kind === 'bingo' ? lines.map((text, i) => ({ id: old[i]?.id ?? uid('cell'), text })) : [],
        createdBy: challenge?.createdBy ?? me.id,
        createdAt: challenge?.createdAt ?? now(),
      }),
    )
    toast(challenge ? 'Reto actualizado' : '¡Reto creado! Que empiece el juego', { tone: 'success' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={challenge ? 'Editar reto' : 'Nuevo reto'}
      size="full"
      footer={
        <Button full onClick={() => save()} disabled={!valid} icon={<Check className="size-4" />}>
          Guardar
        </Button>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        {!challenge && (
          <Segmented<ChallengeKind>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'contador', label: 'Contador por persona' },
              { value: 'bingo', label: 'Bingo del viaje' },
            ]}
          />
        )}
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={emoji === e}
              onClick={() => setEmoji(e)}
              className={cn('press flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl', emoji === e ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}
            >
              {e}
            </button>
          ))}
        </div>
        <Field label="Título" htmlFor="ch-title">
          <TextInput
            id="ch-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'contador' ? 'Ej. Retrasos al punto de encuentro' : 'Ej. Bingo de la despedida'}
            maxLength={60}
            data-autofocus={!challenge || undefined}
          />
        </Field>
        <Field label="Reglas (opcional)" htmlFor="ch-desc">
          <TextInput id="ch-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quien más acumule paga la primera ronda…" maxLength={140} />
        </Field>
        {kind === 'bingo' && (
          <Field
            label={`Casillas (${lines.length}) · una por línea`}
            htmlFor="ch-cells"
            hint={lines.length === 9 || lines.length === 16 ? `Cartón de ${gridSize(lines.map((text) => ({ id: '', text })))}×${gridSize(lines.map((text) => ({ id: '', text })))} ✓` : 'Usa 9 (3×3) o 16 (4×4) casillas para jugar a líneas'}
          >
            <TextArea id="ch-cells" rows={9} value={cellsText} onChange={(e) => setCellsText(e.target.value)} placeholder={'Ver un atardecer\nAlguien pierde las llaves\nFoto de grupo con un desconocido\n…'} />
          </Field>
        )}
        {kind === 'bingo' && (
          <p className="flex items-center gap-2 px-1 text-xs text-muted">
            <Grid3x3 className="size-4" /> Cuando alguien consiga una casilla, tócala y elige quién fue.
          </p>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
