import { Check, Hand, ListChecks, Pencil, Plus, Trash2, UserRoundX } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { ChecklistItem } from '../../domain/types'
import { addChecklistItem, drop, put, updateChecklistItem } from '../../data/actions'
import { useMe, useMembersById, useTrip, useUpdate } from '../../hooks/useTrip'
import { ActionSheet } from '../../ui/ActionSheet'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { Field, TextInput } from '../../ui/Field'
import { haptic } from '../../ui/haptics'
import { MemberPicker } from '../../ui/MemberPicker'
import { Card, EmptyState, FilterChip, ProgressBar } from '../../ui/misc'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'

type Filter = 'todo' | 'sin' | 'mio' | 'pendiente'

export function Checklist() {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState<Filter>('todo')
  const [editing, setEditing] = useState<{ item: ChecklistItem; key: number } | null>(null)

  const items = [...trip.checklist].sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt)
  const done = trip.checklist.filter((i) => i.done).length
  const unassigned = trip.checklist.filter((i) => !i.assigneeId).length
  const mine = trip.checklist.filter((i) => i.assigneeId === me.id)
  const shown = items.filter((i) =>
    filter === 'sin' ? !i.assigneeId : filter === 'mio' ? i.assigneeId === me.id : filter === 'pendiente' ? !i.done : true,
  )

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    update((t) => addChecklistItem(t, title, me.id))
    setTitle('')
    haptic()
  }

  return (
    <div className="px-4 pb-4">
      <Card className="p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold tracking-wide text-muted uppercase">Cosas comunes</p>
            <p className="mt-1 font-display text-2xl font-extrabold">
              {done} de {trip.checklist.length} listas
            </p>
          </div>
          <p className="text-right text-xs text-muted">
            Tú llevas {mine.length}
            {unassigned > 0 && (
              <>
                <br />
                <span className="font-semibold text-warning-text">{unassigned} sin dueño</span>
              </>
            )}
          </p>
        </div>
        <ProgressBar value={trip.checklist.length ? done / trip.checklist.length : 0} tone="success" className="mt-3" />
      </Card>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Añadir algo que llevar…" aria-label="Nuevo elemento" maxLength={80} />
        <Button type="submit" disabled={!title.trim()} className="shrink-0" aria-label="Añadir" icon={<Plus className="size-5" />}>
          Añadir
        </Button>
      </form>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <FilterChip active={filter === 'todo'} onClick={() => setFilter('todo')} count={trip.checklist.length}>
          Todo
        </FilterChip>
        <FilterChip active={filter === 'sin'} onClick={() => setFilter('sin')} count={unassigned}>
          Sin dueño
        </FilterChip>
        <FilterChip active={filter === 'mio'} onClick={() => setFilter('mio')} count={mine.length}>
          Lo llevo yo
        </FilterChip>
        <FilterChip active={filter === 'pendiente'} onClick={() => setFilter('pendiente')} count={trip.checklist.length - done}>
          Pendiente
        </FilterChip>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<ListChecks className="size-7" />} title={trip.checklist.length ? 'Nada por aquí' : 'Lista vacía'} text="Botiquín, altavoz, adaptadores, cartas… Apunta lo que es de todos." />
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {shown.map((item) => (
            <ChecklistRow key={item.id} item={item} onEdit={() => setEditing({ item, key: Date.now() })} />
          ))}
        </ul>
      )}

      {editing && <ItemSheet key={editing.key} item={editing.item} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ChecklistRow({ item, onEdit }: { item: ChecklistItem; onEdit: () => void }) {
  const me = useMe()
  const byId = useMembersById()
  const update = useUpdate()
  const toast = useToast()
  const [menu, setMenu] = useState(false)
  const assignee = item.assigneeId ? byId.get(item.assigneeId) : undefined
  const isMine = item.assigneeId === me.id

  const toggleDone = () => {
    haptic(item.done ? 4 : [8, 30, 8])
    update((t) => updateChecklistItem(t, item.id, { done: !item.done, assigneeId: item.assigneeId ?? me.id }))
  }

  const takeIt = () => {
    haptic(12)
    update((t) => updateChecklistItem(t, item.id, { assigneeId: me.id }))
    toast(`Llevas «${item.title}»`, { tone: 'success' })
  }

  return (
    <li className={cn('flex items-center gap-3 rounded-3xl border border-line bg-surface p-2.5 pl-3 shadow-card transition-opacity', item.done && 'opacity-70')}>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? `Desmarcar ${item.title}` : `Marcar ${item.title} como listo`}
        onClick={toggleDone}
        className={cn(
          'press flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          item.done ? 'border-success bg-success text-white' : 'border-line-strong hover:border-success',
        )}
      >
        {item.done && <Check className="size-4 animate-pop" strokeWidth={3.5} />}
      </button>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={cn('block text-[15px] font-semibold transition-colors', item.done && 'text-muted line-through decoration-2')}>{item.title}</span>
        {assignee && (
          <span className="text-xs text-muted">
            {isMine ? 'Lo llevas tú' : `Lo lleva ${assignee.name}`}
            {item.done ? ' · listo' : ''}
          </span>
        )}
      </button>
      {!assignee ? (
        <Button size="sm" variant="soft" icon={<Hand className="size-4" />} onClick={takeIt} className="shrink-0">
          Lo llevo yo
        </Button>
      ) : (
        <button type="button" onClick={() => setMenu(true)} className="press flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 py-1 pr-3 pl-1 text-sm font-semibold" aria-label={`Asignado a ${assignee.name}`}>
          <Avatar member={assignee} size="sm" />
          {isMine ? 'Tú' : assignee.name}
        </button>
      )}
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title={item.title}
        actions={[
          ...(isMine
            ? [{ label: 'Ya no lo llevo yo', icon: <UserRoundX className="size-4" />, onSelect: () => update((t) => updateChecklistItem(t, item.id, { assigneeId: undefined, done: false })) }]
            : [{ label: 'Lo llevo yo en su lugar', icon: <Hand className="size-4" />, onSelect: takeIt }]),
          { label: 'Editar', icon: <Pencil className="size-4" />, onSelect: onEdit },
        ]}
      />
    </li>
  )
}

function ItemSheet({ item, onClose }: { item: ChecklistItem; onClose: () => void }) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const [open, setOpen] = useState(true)
  const [title, setTitle] = useState(item.title)
  const [assigneeId, setAssigneeId] = useState(item.assigneeId)
  const close = () => {
    setOpen(false)
    window.setTimeout(onClose, 230)
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Editar"
      footer={
        <div className="flex gap-3">
          <Button
            variant="danger"
            aria-label="Borrar elemento"
            icon={<Trash2 className="size-4" />}
            onClick={() => {
              update((t) => drop(t, 'checklist', [item.id]))
              close()
              toast('Elemento borrado', { action: { label: 'Deshacer', onClick: () => update((t) => put(t, 'checklist', item)) } })
            }}
          >
            Borrar
          </Button>
          <Button
            full
            disabled={!title.trim()}
            icon={<Check className="size-4" />}
            onClick={() => {
              update((t) => updateChecklistItem(t, item.id, { title: title.trim(), assigneeId, done: assigneeId ? item.done : false }))
              close()
            }}
          >
            Guardar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Qué" htmlFor="ck-title">
          <TextInput id="ck-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[13px] font-semibold text-fg-2">¿Quién lo lleva?</p>
            {assigneeId && (
              <button type="button" onClick={() => setAssigneeId(undefined)} className="press text-xs font-semibold text-primary-text">
                Dejar sin dueño
              </button>
            )}
          </div>
          <MemberPicker members={trip.members} value={assigneeId} onChange={(id) => setAssigneeId(id === assigneeId ? undefined : id)} meId={me.id} />
          <p className="mt-2 px-1 text-xs text-muted">Toca otra vez a la persona para dejarlo sin dueño.</p>
        </div>
      </div>
    </Sheet>
  )
}
