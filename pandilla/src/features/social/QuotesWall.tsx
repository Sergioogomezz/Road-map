import { Check, Ellipsis, MessageSquareQuote, Pencil, Quote as QuoteIcon, Sparkles, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { formatAgo } from '../../domain/dates'
import { uid } from '../../domain/ids'
import type { ID, Quote } from '../../domain/types'
import { deleteQuote, put, saveQuote, toggleReaction } from '../../data/actions'
import { useMe, useMembersById, useTrip, useUpdate } from '../../hooks/useTrip'
import { ActionSheet } from '../../ui/ActionSheet'
import { Avatar } from '../../ui/Avatar'
import { Button, IconButton } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { useConfirm } from '../../ui/Confirm'
import { Field, TextArea, TextInput } from '../../ui/Field'
import { haptic } from '../../ui/haptics'
import { Card, EmptyState } from '../../ui/misc'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'

const REACTIONS = ['😂', '❤️', '🔥', '💀']
const OTHER = '__otro__'

export function QuotesWall() {
  const trip = useTrip()
  const [editing, setEditing] = useState<{ quote: Quote; key: number } | null>(null)
  const quotes = [...trip.quotes].sort((a, b) => b.saidAt.localeCompare(a.saidAt))

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <Composer />
      {quotes.length === 0 ? (
        <EmptyState icon={<MessageSquareQuote className="size-7" />} title="El muro está vacío" text="La primera frase mítica del viaje está al caer. Apúntala antes de que se olvide." />
      ) : (
        quotes.map((q) => <QuoteCard key={q.id} quote={q} onEdit={() => setEditing({ quote: q, key: Date.now() })} />)
      )}
      {editing && <QuoteSheet key={editing.key} quote={editing.quote} onClose={() => setEditing(null)} />}
    </div>
  )
}

function AuthorPicker({ value, onChange, otherName, onOtherName }: { value: ID; onChange: (id: ID) => void; otherName: string; onOtherName: (s: string) => void }) {
  const trip = useTrip()
  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {trip.members.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={value === m.id}
            onClick={() => onChange(m.id)}
            className={cn('press flex shrink-0 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm font-semibold', value === m.id ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-fg-2')}
          >
            <Avatar member={m} size="sm" /> {m.name}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={value === OTHER}
          onClick={() => onChange(OTHER)}
          className={cn('press shrink-0 rounded-full border px-3.5 py-1 text-sm font-semibold', value === OTHER ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface text-fg-2')}
        >
          Otra persona
        </button>
      </div>
      {value === OTHER && (
        <TextInput value={otherName} onChange={(e) => onOtherName(e.target.value)} placeholder="El camarero, un guía, un desconocido…" aria-label="Quién lo dijo" maxLength={40} className="mt-2" />
      )}
    </div>
  )
}

function Composer() {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const [text, setText] = useState('')
  const [author, setAuthor] = useState<ID>(trip.members.find((m) => m.id !== me.id)?.id ?? me.id)
  const [otherName, setOtherName] = useState('')
  const [context, setContext] = useState('')
  const [expanded, setExpanded] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    update((t) =>
      saveQuote(t, {
        id: uid('q'),
        text: text.trim().replace(/^["«“]|["»”]$/g, ''),
        authorId: author === OTHER ? undefined : author,
        authorName: author === OTHER ? otherName.trim() || 'Alguien' : undefined,
        context: context.trim(),
        saidAt: new Date().toISOString(),
        createdBy: me.id,
      }),
    )
    haptic([10, 20, 10])
    toast('Inmortalizada ✨', { tone: 'success' })
    setText('')
    setContext('')
    setExpanded(false)
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setExpanded(true)}
          rows={expanded ? 3 : 2}
          placeholder="¿Quién ha dicho qué? Apúntalo antes de que se olvide…"
          aria-label="Frase mítica"
          maxLength={280}
          className="font-display text-lg"
        />
        {(expanded || text) && (
          <div className="flex animate-fade-in flex-col gap-3">
            <div>
              <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">¿Quién lo dijo?</p>
              <AuthorPicker value={author} onChange={setAuthor} otherName={otherName} onOtherName={setOtherName} />
            </div>
            <TextInput value={context} onChange={(e) => setContext(e.target.value)} placeholder="Contexto (opcional): dónde, cuándo, por qué…" aria-label="Contexto" maxLength={120} />
            <Button type="submit" disabled={!text.trim()} icon={<Sparkles className="size-4" />}>
              Inmortalizar
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}

function QuoteCard({ quote, onEdit }: { quote: Quote; onEdit: () => void }) {
  const trip = useTrip()
  const me = useMe()
  const byId = useMembersById()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const [menu, setMenu] = useState(false)
  const author = quote.authorId ? byId.get(quote.authorId) : undefined
  const reactions = trip.reactions.filter((r) => r.quoteId === quote.id)
  const mine = reactions.find((r) => r.memberId === me.id)?.emoji

  return (
    <Card as="article" className="relative overflow-hidden p-5">
      <QuoteIcon className="absolute -top-1 -left-1 size-16 rotate-180 text-primary/10" aria-hidden />
      <div className="relative">
        <p className="font-display text-[21px] leading-snug font-semibold text-balance">«{quote.text}»</p>
        <div className="mt-4 flex items-center gap-2.5">
          {author ? <Avatar member={author} size="md" /> : <span className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-sm">🗣️</span>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">— {author?.name ?? quote.authorName ?? 'Alguien'}</p>
            <p className="truncate text-xs text-muted">
              {formatAgo(new Date(quote.saidAt).getTime())}
              {quote.context && ` · ${quote.context}`}
            </p>
          </div>
          <IconButton label="Opciones de la frase" size="sm" onClick={() => setMenu(true)}>
            <Ellipsis className="size-5" />
          </IconButton>
        </div>
        <div className="mt-4 flex gap-2">
          {REACTIONS.map((emoji) => {
            const count = reactions.filter((r) => r.emoji === emoji).length
            const active = mine === emoji
            return (
              <button
                key={emoji}
                type="button"
                aria-pressed={active}
                aria-label={`Reaccionar con ${emoji}`}
                onClick={() => {
                  haptic(6)
                  update((t) => toggleReaction(t, quote.id, me.id, emoji))
                }}
                className={cn(
                  'press inline-flex h-9 items-center gap-1 rounded-full border px-3 text-sm font-semibold transition-colors',
                  active ? 'border-primary bg-primary-soft text-primary-text' : 'border-line bg-surface-2/60 text-fg-2',
                )}
              >
                <span className={cn(active && 'animate-pop')}>{emoji}</span>
                {count > 0 && <span className="tabular text-xs">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>
      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        title="Frase mítica"
        actions={[
          { label: 'Editar', icon: <Pencil className="size-4" />, onSelect: onEdit },
          {
            label: 'Borrar',
            icon: <Trash2 className="size-4" />,
            tone: 'danger',
            onSelect: async () => {
              if (!(await confirm({ title: '¿Borrar esta frase?', confirmLabel: 'Borrar' }))) return
              const saved = trip.reactions.filter((r) => r.quoteId === quote.id)
              update((t) => deleteQuote(t, quote.id))
              toast('Frase borrada', { action: { label: 'Deshacer', onClick: () => update((t) => saved.reduce((acc, r) => put(acc, 'reactions', r), put(t, 'quotes', quote))) } })
            },
          },
        ]}
      />
    </Card>
  )
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function QuoteSheet({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const update = useUpdate()
  const [open, setOpen] = useState(true)
  const [text, setText] = useState(quote.text)
  const [author, setAuthor] = useState<ID>(quote.authorId ?? OTHER)
  const [otherName, setOtherName] = useState(quote.authorName ?? '')
  const [context, setContext] = useState(quote.context)
  const [when, setWhen] = useState(toLocalInput(quote.saidAt))
  const close = () => {
    setOpen(false)
    window.setTimeout(onClose, 230)
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Editar frase"
      footer={
        <Button
          full
          disabled={!text.trim()}
          icon={<Check className="size-4" />}
          onClick={() => {
            const saidAt = new Date(when).toString() === 'Invalid Date' ? quote.saidAt : new Date(when).toISOString()
            update((t) =>
              saveQuote(t, {
                ...quote,
                text: text.trim(),
                authorId: author === OTHER ? undefined : author,
                authorName: author === OTHER ? otherName.trim() || 'Alguien' : undefined,
                context: context.trim(),
                saidAt,
              }),
            )
            close()
          }}
        >
          Guardar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Frase" htmlFor="qt-text">
          <TextArea id="qt-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={280} className="font-display text-lg" />
        </Field>
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">¿Quién lo dijo?</p>
          <AuthorPicker value={author} onChange={setAuthor} otherName={otherName} onOtherName={setOtherName} />
        </div>
        <Field label="Contexto" htmlFor="qt-ctx">
          <TextInput id="qt-ctx" value={context} onChange={(e) => setContext(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Cuándo" htmlFor="qt-when">
          <TextInput id="qt-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  )
}
