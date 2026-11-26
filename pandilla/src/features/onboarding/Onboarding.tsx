import { ArrowLeft, ArrowRight, ChevronRight, Download, Plus, Share, Sparkles, UserPlus, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { addDays, formatRange, todayISO } from '../../domain/dates'
import type { Member, Trip, TripSummary } from '../../domain/types'
import { createTrip, enterTrip, findTripByCode, getRepository, importTrip, isSyncConfigured, joinAsNewMember, restoreDemo } from '../../data/app'
import { decodeTripSnapshot, parseInviteInput } from '../../data/share'
import { useSession } from '../../hooks/useTrip'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { navigate } from '../../hooks/useHashRoute'
import { Avatar, AvatarStack } from '../../ui/Avatar'
import { Button, IconButton } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { confetti } from '../../ui/confetti'
import { copyText, shareOrCopy } from '../../ui/copy'
import { Field, TextInput } from '../../ui/Field'
import { Card } from '../../ui/misc'
import { useToast } from '../../ui/Toast'
import { TRIP_EMOJIS } from '../meta'
import { buildInvite, Logo } from '../shared'

export type OnboardingView =
  | { kind: 'landing' }
  | { kind: 'pick'; trip: Trip }
  | { kind: 'create' }
  | { kind: 'created'; trip: Trip; me: Member }

export function Onboarding({ initial = { kind: 'landing' } }: { initial?: OnboardingView }) {
  const [view, setView] = useState<OnboardingView>(initial)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [view.kind])

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
      <div key={view.kind} className="animate-screen-in">
        {view.kind === 'landing' && <Landing onPick={(trip) => setView({ kind: 'pick', trip })} onCreate={() => setView({ kind: 'create' })} />}
        {view.kind === 'pick' && <ProfilePicker trip={view.trip} onBack={() => setView({ kind: 'landing' })} />}
        {view.kind === 'create' && <CreateTrip onBack={() => setView({ kind: 'landing' })} onCreated={(trip, me) => setView({ kind: 'created', trip, me })} />}
        {view.kind === 'created' && <TripCreated trip={view.trip} me={view.me} />}
      </div>
    </div>
  )
}

// ─── Portada ────────────────────────────────────────────────────────────────

function Landing({ onPick, onCreate }: { onPick: (trip: Trip) => void; onCreate: () => void }) {
  const [trips, setTrips] = useState<TripSummary[] | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const session = useSession()
  const install = useInstallPrompt()
  const toast = useToast()

  const load = () => getRepository().then((r) => r.listTrips()).then(setTrips)
  useEffect(() => {
    void load()
  }, [])

  const openTrip = async (id: string, quickEnter: boolean) => {
    const repo = await getRepository()
    const trip = await repo.getTrip(id)
    if (!trip) return
    const remembered = session.profiles[trip.id]
    if (quickEnter && remembered && trip.members.some((m) => m.id === remembered)) await enterTrip(trip, remembered)
    else onPick(trip)
  }

  const parsed = parseInviteInput(code)
  const isLink = /unirse\//.test(code)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!parsed || parsed.code.length < 4) return
    setBusy(true)
    setError('')
    try {
      let trip: Trip | null = null
      if (parsed.snapshot) {
        const decoded = await decodeTripSnapshot(parsed.snapshot)
        if (decoded) trip = await importTrip(decoded)
      }
      trip ??= await findTripByCode(parsed.code)
      if (trip) onPick(trip)
      else
        setError(
          isSyncConfigured
            ? 'No existe ningún viaje con ese código. Revisa que esté bien escrito.'
            : 'Ese viaje no está en este móvil. Pega aquí el enlace de invitación entero: lleva el viaje dentro.',
        )
    } finally {
      setBusy(false)
    }
  }

  const hasDemo = trips?.some((t) => t.isDemo)

  return (
    <div className="pt-safe px-5 pb-10">
      <div className="flex flex-col items-center pt-10 pb-8 text-center">
        <Logo className="size-20 animate-pop drop-shadow-[0_16px_24px_rgba(98,70,234,0.35)]" />
        <h1 className="mt-5 font-display text-[40px] leading-none font-extrabold tracking-tight">Pandilla</h1>
        <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-muted">
          Viajes en grupo sin dramas: planes, votaciones, gastos y papeles en un solo sitio.
        </p>
      </div>

      <Card className="p-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="trip-code" className="px-1 text-[13px] font-semibold text-fg-2">
            ¿Te han invitado? Escribe el código o pega el enlace
          </label>
          <div className="flex gap-2">
            <TextInput
              id="trip-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError('')
              }}
              placeholder="Código o enlace"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:normal-case',
                isLink ? 'text-sm' : 'font-display text-lg font-bold tracking-[0.2em] uppercase',
              )}
            />
            <Button type="submit" disabled={!parsed || parsed.code.length < 4 || busy} className="shrink-0 px-5" iconRight={<ArrowRight className="size-4" />}>
              Entrar
            </Button>
          </div>
          {error && <p className="px-1 text-sm text-danger-text">{error}</p>}
        </form>
      </Card>

      <div className="mt-8 mb-3 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-bold tracking-wide text-muted uppercase">Tus viajes en este móvil</h2>
      </div>
      <div className="flex flex-col gap-3">
        {trips === null && <div className="h-24 animate-shimmer rounded-3xl bg-[linear-gradient(90deg,var(--surface-2),var(--surface-3),var(--surface-2))] bg-[length:200%_100%]" />}
        {trips?.map((t) => {
          const remembered = session.profiles[t.id]
          return (
            <Card key={t.id} as="article" className="flex items-center gap-3 p-3">
              <button type="button" onClick={() => openTrip(t.id, false)} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="hero-gradient flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl">{t.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-[17px] font-bold">{t.name}</span>
                    {t.isDemo && <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">Ejemplo</span>}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {t.destination ? `${t.destination} · ` : ''}
                    {formatRange(t.startDate, t.endDate)}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <Users className="size-3.5" /> {t.memberCount} {t.memberCount === 1 ? 'persona' : 'personas'} · código {t.code}
                  </span>
                </span>
              </button>
              {remembered ? (
                <Button size="sm" onClick={() => openTrip(t.id, true)} iconRight={<ChevronRight className="size-4" />}>
                  Entrar
                </Button>
              ) : (
                <ChevronRight className="size-5 shrink-0 text-muted" />
              )}
            </Card>
          )
        })}
        {trips?.length === 0 && <p className="px-1 text-sm text-muted">Todavía no hay viajes en este móvil.</p>}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button variant="outline" size="lg" full icon={<Plus className="size-5" />} onClick={onCreate}>
          Crear un viaje nuevo
        </Button>
        {trips && !hasDemo && (
          <Button
            variant="ghost"
            full
            icon={<Sparkles className="size-4" />}
            onClick={async () => {
              await restoreDemo()
              await load()
              toast('Viaje de ejemplo cargado', { tone: 'success' })
            }}
          >
            Cargar el viaje de ejemplo
          </Button>
        )}
      </div>

      {(install.canPrompt || install.showIOSHint) && (
        <div className="mt-8 flex items-start gap-3 rounded-3xl border border-dashed border-line-strong p-4">
          <Download className="mt-0.5 size-5 shrink-0 text-primary-text" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">Instálala como app</p>
            <p className="mt-0.5 text-muted">
              {install.canPrompt ? (
                'Acceso desde la pantalla de inicio y funciona sin cobertura.'
              ) : (
                <>
                  En Safari pulsa <Share className="inline size-3.5 -translate-y-px" /> Compartir y luego «Añadir a pantalla de inicio».
                </>
              )}
            </p>
          </div>
          {install.canPrompt && (
            <Button size="sm" variant="soft" onClick={() => void install.prompt()}>
              Instalar
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ¿Quién eres? ───────────────────────────────────────────────────────────

export function ProfilePicker({ trip: initialTrip, onBack }: { trip: Trip; onBack?: () => void }) {
  const [trip, setTrip] = useState(initialTrip)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const session = useSession()
  const remembered = session.profiles[trip.id]

  const enter = async (memberId: string) => {
    await enterTrip(trip, memberId)
    navigate('inicio', { replace: true })
  }

  const join = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const { trip: updated, member } = await joinAsNewMember(trip, name)
      setTrip(updated)
      await enterTrip(updated, member.id)
      navigate('inicio', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pt-safe px-5 pb-10">
      <div className="flex items-center gap-2 pt-3">
        {onBack && (
          <IconButton label="Volver" variant="soft" onClick={onBack}>
            <ArrowLeft className="size-5" />
          </IconButton>
        )}
      </div>
      <div className="hero-gradient relative mt-3 overflow-hidden rounded-[32px] p-6 text-white">
        <span className="absolute -right-4 -bottom-6 text-[120px] leading-none opacity-25 select-none">{trip.meta.emoji}</span>
        <p className="text-sm font-semibold opacity-85">{formatRange(trip.meta.startDate, trip.meta.endDate)}</p>
        <h1 className="mt-1 font-display text-[30px] leading-tight font-extrabold">{trip.meta.name}</h1>
        {trip.meta.destination && <p className="mt-1 text-sm opacity-90">{trip.meta.destination}</p>}
      </div>

      <h2 className="mt-8 font-display text-2xl font-extrabold">¿Quién eres?</h2>
      <p className="mt-1 text-sm text-muted">Elige tu perfil y entra. Sin registros ni contraseñas.</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {trip.members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => enter(m.id)}
            className={cn(
              'press flex flex-col items-center gap-2 rounded-3xl border bg-surface p-3 pt-4 shadow-card',
              remembered === m.id ? 'border-primary ring-2 ring-primary/30' : 'border-line',
            )}
          >
            <Avatar member={m} size="lg" />
            <span className="w-full truncate text-center text-sm font-semibold">{m.name}</span>
            {remembered === m.id && <span className="-mt-1 text-[11px] font-semibold text-primary-text">Último usado</span>}
          </button>
        ))}
      </div>

      <form onSubmit={join} className="mt-8">
        <Field label="¿No estás en la lista? Escribe tu nombre" htmlFor="new-name">
          <div className="flex gap-2">
            <TextInput id="new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" autoComplete="given-name" maxLength={30} />
            <Button type="submit" disabled={!name.trim() || busy} icon={<UserPlus className="size-4" />} className="shrink-0">
              Unirme
            </Button>
          </div>
        </Field>
      </form>
    </div>
  )
}

// ─── Crear viaje ────────────────────────────────────────────────────────────

function CreateTrip({ onBack, onCreated }: { onBack: () => void; onCreated: (trip: Trip, me: Member) => void }) {
  const today = todayISO()
  const [emoji, setEmoji] = useState('🧳')
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState(addDays(today, 14))
  const [endDate, setEndDate] = useState(addDays(today, 17))
  const [myName, setMyName] = useState('')
  const [friend, setFriend] = useState('')
  const [friends, setFriends] = useState<string[]>([])
  const [accName, setAccName] = useState('')
  const [accAddress, setAccAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  const datesOk = endDate >= startDate
  const valid = name.trim() && myName.trim() && startDate && endDate && datesOk

  const addFriend = () => {
    const clean = friend.trim()
    if (clean && !friends.includes(clean)) setFriends([...friends, clean])
    setFriend('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    setBusy(true)
    try {
      const { trip, me } = await createTrip({
        name,
        destination,
        emoji,
        startDate,
        endDate,
        myName,
        friends: friend.trim() ? [...friends, friend.trim()] : friends,
        accommodationName: accName,
        accommodationAddress: accAddress,
      })
      onCreated(trip, me)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="pt-safe px-5 pb-10">
      <div className="flex items-center gap-3 pt-3">
        <IconButton label="Volver" variant="soft" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </IconButton>
        <h1 className="font-display text-2xl font-extrabold">Nuevo viaje</h1>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">Elige un icono</p>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {TRIP_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={emoji === e}
                onClick={() => setEmoji(e)}
                className={cn('press flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl', emoji === e ? 'bg-primary-soft ring-2 ring-primary' : 'bg-surface-2')}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <Field label="Nombre del viaje" htmlFor="t-name" error={touched && !name.trim() ? 'Ponle un nombre' : undefined}>
          <TextInput id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Puente en Oporto" maxLength={60} data-autofocus />
        </Field>
        <Field label="Destino" htmlFor="t-dest">
          <TextInput id="t-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ciudad, país" maxLength={60} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ida" htmlFor="t-start">
            <TextInput
              id="t-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                if (e.target.value > endDate) setEndDate(e.target.value)
              }}
            />
          </Field>
          <Field label="Vuelta" htmlFor="t-end" error={!datesOk ? 'Antes de la ida' : undefined}>
            <TextInput id="t-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Tu nombre" htmlFor="t-me" error={touched && !myName.trim() ? 'Necesitamos tu nombre' : undefined}>
          <TextInput id="t-me" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Cómo te llama la pandilla" autoComplete="given-name" maxLength={30} />
        </Field>
        <Field label="Amigos (opcional, también pueden unirse con el código)" htmlFor="t-friend">
          <div className="flex gap-2">
            <TextInput
              id="t-friend"
              value={friend}
              onChange={(e) => setFriend(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addFriend()
                }
              }}
              placeholder="Nombre y pulsa Añadir"
              maxLength={30}
            />
            <Button variant="secondary" onClick={addFriend} disabled={!friend.trim()} className="shrink-0">
              Añadir
            </Button>
          </div>
          {friends.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {friends.map((f) => (
                <span key={f} className="inline-flex animate-pop items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-3 text-sm font-semibold">
                  {f}
                  <button type="button" aria-label={`Quitar a ${f}`} onClick={() => setFriends(friends.filter((x) => x !== f))} className="press rounded-full p-1 text-muted hover:bg-surface-3">
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>
        <div className="rounded-3xl border border-line p-4">
          <p className="text-[13px] font-semibold text-fg-2">Alojamiento (para el modo taxi)</p>
          <div className="mt-3 flex flex-col gap-3">
            <TextInput value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="Nombre (hotel, Airbnb…)" aria-label="Nombre del alojamiento" maxLength={80} />
            <TextInput value={accAddress} onChange={(e) => setAccAddress(e.target.value)} placeholder="Dirección exacta" aria-label="Dirección del alojamiento" maxLength={160} />
          </div>
        </div>
        <Button type="submit" size="lg" full disabled={busy} icon={<Sparkles className="size-5" />}>
          Crear viaje
        </Button>
      </div>
    </form>
  )
}

// ─── Viaje creado ───────────────────────────────────────────────────────────

function TripCreated({ trip, me }: { trip: Trip; me: Member }) {
  const toast = useToast()
  useEffect(() => {
    const t = window.setTimeout(() => confetti(), 150)
    return () => window.clearTimeout(t)
  }, [])

  const share = async () => {
    const invite = await buildInvite(trip)
    const result = await shareOrCopy({ title: trip.meta.name, text: invite.text, url: invite.url })
    if (result === 'copied') toast('Invitación copiada: pégala en el grupo', { tone: 'success' })
  }

  return (
    <div className="pt-safe flex min-h-full flex-col items-center px-6 pt-16 pb-10 text-center">
      <span className="hero-gradient flex size-24 animate-pop items-center justify-center rounded-[32px] text-5xl shadow-pop">{trip.meta.emoji}</span>
      <h1 className="mt-6 font-display text-3xl font-extrabold">¡Viaje creado!</h1>
      <p className="mt-2 text-muted">Comparte el código con tu pandilla para que entren.</p>
      <button
        type="button"
        onClick={async () => toast((await copyText(trip.meta.code)) ? 'Código copiado' : 'No se pudo copiar', { tone: 'success' })}
        className="press mt-6 rounded-3xl border-2 border-dashed border-primary/40 bg-primary-soft px-8 py-4 font-display text-4xl font-extrabold tracking-[0.25em] text-primary-text"
        aria-label={`Código ${trip.meta.code}, toca para copiar`}
      >
        {trip.meta.code}
      </button>
      <div className="mt-8 flex w-full flex-col gap-3">
        <Button size="lg" full icon={<Share className="size-5" />} onClick={share}>
          Invitar a la pandilla
        </Button>
        <Button
          size="lg"
          variant="secondary"
          full
          iconRight={<ArrowRight className="size-5" />}
          onClick={async () => {
            await enterTrip(trip, me.id)
            navigate('inicio', { replace: true })
          }}
        >
          Entrar al viaje
        </Button>
      </div>
      {trip.members.length > 1 && (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted">
          <AvatarStack members={trip.members} max={6} /> {trip.members.length} en el viaje
        </div>
      )}
    </div>
  )
}
