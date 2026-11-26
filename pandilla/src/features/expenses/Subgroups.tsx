import { CarFront, Check, ChevronRight, Trash2, UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { uid } from '../../domain/ids'
import type { Subgroup } from '../../domain/types'
import { deleteSubgroup, put, saveSubgroup } from '../../data/actions'
import { navigate } from '../../hooks/useHashRoute'
import { useMe, useTrip, useUpdate } from '../../hooks/useTrip'
import { AvatarStack } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { useConfirm } from '../../ui/Confirm'
import { Field, TextInput } from '../../ui/Field'
import { MemberMultiPicker } from '../../ui/MemberPicker'
import { Card, EmptyState, Fab, SectionTitle } from '../../ui/misc'
import { Sheet, useSheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'

const EMOJIS = ['🍽️', '🍻', '🚗', '🚙', '🏠', '🎟️', '🛒', '⛽', '🏄', '🎉', '☕', '🧗']

export function Subgroups() {
  const trip = useTrip()
  const sheet = useSheet<Subgroup>()
  const usage = (id: string) => {
    const n = trip.expenses.filter((e) => e.split.mode === 'subgrupo' && e.split.subgroupId === id).length
    return `${n} ${n === 1 ? 'gasto' : 'gastos'}`
  }
  const carGroups = trip.subgroups.filter((g) => g.carId)
  const custom = trip.subgroups.filter((g) => !g.carId)

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">
      <p className="px-1 text-sm text-muted">
        Grupos para repartir gastos solo entre algunos: los de la cena, los que fueron a la excursión… Los coches crean el suyo automáticamente.
      </p>

      <section>
        <SectionTitle>Siempre disponible</SectionTitle>
        <Card className="mt-3 flex items-center gap-3 p-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-2xl">👥</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Todos</p>
            <p className="text-xs text-muted">{trip.members.length} personas · incluye a quien se una después</p>
          </div>
          <AvatarStack members={trip.members} max={4} />
        </Card>
      </section>

      {carGroups.length > 0 && (
        <section>
          <SectionTitle>Coches</SectionTitle>
          <div className="mt-3 flex flex-col gap-2">
            {carGroups.map((g) => (
              <button key={g.id} type="button" onClick={() => navigate('logistica/coches')} className="press text-left">
                <Card className="flex items-center gap-3 p-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/14 text-2xl">{g.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{g.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <CarFront className="size-3.5" /> Se edita en Logística · {usage(g.id)}
                    </p>
                  </div>
                  <AvatarStack members={g.memberIds.map((id) => trip.members.find((m) => m.id === id))} max={4} />
                  <ChevronRight className="size-4 text-muted" />
                </Card>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Personalizados</SectionTitle>
        {custom.length === 0 ? (
          <EmptyState icon={<UsersRound className="size-7" />} title="Sin subgrupos propios" text="Crea uno para repartir gastos entre unos pocos." />
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {custom.map((g) => (
              <button key={g.id} type="button" onClick={() => sheet.open(g)} className="press text-left">
                <Card className="flex items-center gap-3 p-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-2xl">{g.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-xs text-muted">
                      {g.memberIds.length} personas · {usage(g.id)}
                    </p>
                  </div>
                  <AvatarStack members={g.memberIds.map((id) => trip.members.find((m) => m.id === id))} max={4} />
                  <ChevronRight className="size-4 text-muted" />
                </Card>
              </button>
            ))}
          </div>
        )}
      </section>

      <Fab label="Nuevo subgrupo" onClick={() => sheet.open()} />
      {sheet.state && <SubgroupSheet key={sheet.state.key} open={sheet.state.open} onClose={sheet.close} group={sheet.state.target} />}
    </div>
  )
}

function SubgroupSheet({ open, onClose, group }: { open: boolean; onClose: () => void; group?: Subgroup }) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const [name, setName] = useState(group?.name ?? '')
  const [emoji, setEmoji] = useState(group?.emoji ?? '🍽️')
  const [memberIds, setMemberIds] = useState<string[]>(group?.memberIds ?? [me.id])
  const valid = name.trim() && memberIds.length > 0

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    if (!valid) return
    update((t) => saveSubgroup(t, { id: group?.id ?? uid('g'), name: name.trim(), emoji, memberIds }))
    toast(group ? 'Subgrupo actualizado' : 'Subgrupo creado', { tone: 'success' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={group ? 'Editar subgrupo' : 'Nuevo subgrupo'}
      subtitle="Los gastos ya apuntados no cambian: guardan quién iba en ese momento."
      footer={
        <div className="flex gap-3">
          {group && (
            <Button
              variant="danger"
              aria-label="Borrar subgrupo"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                if (!(await confirm({ title: `¿Borrar «${group.name}»?`, message: 'Los gastos que lo usan mantienen su reparto.' }))) return
                update((t) => deleteSubgroup(t, group.id))
                onClose()
                toast('Subgrupo borrado', { action: { label: 'Deshacer', onClick: () => update((t) => put(t, 'subgroups', group)) } })
              }}
            >
              Borrar
            </Button>
          )}
          <Button full onClick={() => save()} disabled={!valid} icon={<Check className="size-4" />}>
            Guardar
          </Button>
        </div>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
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
        <Field label="Nombre" htmlFor="sg-name">
          <TextInput id="sg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Los de la cena" maxLength={40} data-autofocus={!group || undefined} />
        </Field>
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">¿Quiénes?</p>
          <MemberMultiPicker members={trip.members} value={memberIds} onChange={setMemberIds} meId={me.id} />
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
