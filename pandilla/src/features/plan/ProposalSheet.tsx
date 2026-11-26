import { Check, Sparkles, Utensils } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { now, uid } from '../../domain/ids'
import type { Proposal, ProposalKind } from '../../domain/types'
import { castVote, saveProposal } from '../../data/actions'
import { useMe, useUpdate } from '../../hooks/useTrip'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { Field, TextArea, TextInput } from '../../ui/Field'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'

export function ProposalSheet({ open, onClose, proposal }: { open: boolean; onClose: () => void; proposal?: Proposal }) {
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const [kind, setKind] = useState<ProposalKind>(proposal?.kind ?? 'plan')
  const [title, setTitle] = useState(proposal?.title ?? '')
  const [description, setDescription] = useState(proposal?.description ?? '')
  const [location, setLocation] = useState(proposal?.location ?? '')
  const [price, setPrice] = useState(proposal?.price ?? '')
  const [link, setLink] = useState(proposal?.link ?? '')
  const [touched, setTouched] = useState(false)

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    setTouched(true)
    if (!title.trim()) return
    const cleanLink = link.trim() && !/^https?:\/\//i.test(link.trim()) ? `https://${link.trim()}` : link.trim()
    const draft: Omit<Proposal, 'updatedAt'> = {
      id: proposal?.id ?? uid('p'),
      kind,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      price: price.trim(),
      link: cleanLink,
      createdBy: proposal?.createdBy ?? me.id,
      createdAt: proposal?.createdAt ?? now(),
      decision: proposal?.decision ?? null,
      activityId: proposal?.activityId,
    }
    // Quien propone vota «sí» automáticamente.
    update((t) => {
      const next = saveProposal(t, draft)
      return proposal ? next : castVote(next, draft.id, me.id, 'si')
    })
    toast(proposal ? 'Propuesta actualizada' : '¡Propuesta lanzada! Ya has votado que sí', { tone: 'success' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={proposal ? 'Editar propuesta' : 'Nueva propuesta'}
      size="full"
      footer={
        <Button full onClick={() => save()} icon={<Check className="size-4" />}>
          {proposal ? 'Guardar' : 'Proponer'}
        </Button>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['plan', 'Plan', Sparkles],
              ['restaurante', 'Restaurante', Utensils],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={cn(
                'press flex h-14 items-center justify-center gap-2 rounded-2xl border text-[15px] font-bold',
                kind === value ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-fg-2',
              )}
            >
              <Icon className="size-5" /> {label}
            </button>
          ))}
        </div>
        <Field label="¿Qué propones?" htmlFor="pr-title" error={touched && !title.trim() ? 'Escribe un título' : undefined}>
          <TextInput
            id="pr-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'restaurante' ? 'Ej. Cena en La Taberna del Puerto' : 'Ej. Excursión en kayak'}
            maxLength={90}
            data-autofocus={!proposal || undefined}
          />
        </Field>
        <Field label="Detalles" htmlFor="pr-desc">
          <TextArea id="pr-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Por qué mola, horario, si hay que reservar…" maxLength={400} />
        </Field>
        <Field label="Ubicación" htmlFor="pr-loc">
          <TextInput id="pr-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Dirección o nombre del sitio" maxLength={140} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio aprox." htmlFor="pr-price">
            <TextInput id="pr-price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="≈ 30 € p.p." maxLength={30} />
          </Field>
          <Field label="Enlace" htmlFor="pr-link">
            <TextInput id="pr-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="web, carta…" inputMode="url" autoCapitalize="none" maxLength={300} />
          </Field>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
