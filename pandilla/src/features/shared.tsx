import { Copy, ExternalLink, MapPin, Navigation } from 'lucide-react'
import { useState } from 'react'
import type { Trip } from '../domain/types'
import { appleMapsDirections, appleMapsSearch, googleMapsDirections, googleMapsSearch, isAppleDevice, wazeDirections } from '../domain/maps'
import { encodeTripSnapshot, inviteUrl } from '../data/share'
import { isSyncConfigured } from '../data/app'
import { ActionSheet } from '../ui/ActionSheet'
import { copyText } from '../ui/copy'
import { cn } from '../ui/cn'
import { useToast } from '../ui/Toast'

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6246EA" />
          <stop offset="1" stopColor="#FF6B57" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#logo-g)" />
      <path d="M256 84c-73 0-132 57-132 128 0 96 132 216 132 216s132-120 132-216c0-71-59-128-132-128z" fill="#fff" />
      <circle cx="208" cy="202" r="24" fill="#6246EA" />
      <circle cx="256" cy="182" r="24" fill="#A24FD8" />
      <circle cx="304" cy="202" r="24" fill="#FF6B57" />
      <path d="M202 254c15 20 34 30 54 30s39-10 54-30" fill="none" stroke="#6246EA" strokeWidth="18" strokeLinecap="round" />
    </svg>
  )
}

/** Dos botones directos: Google Maps y Apple Maps. */
export function MapsButtons({ query, directions, className }: { query: string; directions?: boolean; className?: string }) {
  const apple = isAppleDevice()
  const google = (
    <a
      key="g"
      href={directions ? googleMapsDirections(query) : googleMapsSearch(query)}
      target="_blank"
      rel="noreferrer"
      className="press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-surface-3"
    >
      <Navigation className="size-4 text-primary-text" /> Google Maps
    </a>
  )
  const appleLink = (
    <a
      key="a"
      href={directions ? appleMapsDirections(query) : appleMapsSearch(query)}
      target="_blank"
      rel="noreferrer"
      className="press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-surface-3"
    >
      <MapPin className="size-4 text-primary-text" /> Apple Maps
    </a>
  )
  return <div className={cn('flex gap-2', className)}>{apple ? [appleLink, google] : [google, appleLink]}</div>
}

/** Ubicación tocable que abre un menú con apps de mapas y copiar. */
export function LocationLink({ location, className }: { location: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const toast = useToast()
  if (!location) return null
  const go = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={cn('press inline-flex max-w-full items-center gap-1 text-left text-[13px] font-medium text-primary-text hover:underline', className)}
      >
        <MapPin className="size-3.5 shrink-0" />
        <span className="truncate">{location}</span>
      </button>
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={location}
        actions={[
          { label: 'Abrir en Google Maps', icon: <Navigation className="size-4" />, onSelect: () => go(googleMapsSearch(location)) },
          { label: 'Abrir en Apple Maps', icon: <MapPin className="size-4" />, onSelect: () => go(appleMapsSearch(location)) },
          { label: 'Cómo llegar con Waze', icon: <ExternalLink className="size-4" />, onSelect: () => go(wazeDirections(location)) },
          {
            label: 'Copiar dirección',
            icon: <Copy className="size-4" />,
            onSelect: async () => toast((await copyText(location)) ? 'Dirección copiada' : 'No se pudo copiar', { tone: 'success' }),
          },
        ]}
      />
    </>
  )
}

/** Enlace y texto de invitación. Sin servidor, el enlace lleva una copia del viaje. */
export async function buildInvite(trip: Trip): Promise<{ url: string; text: string; withSnapshot: boolean }> {
  let snapshot: string | undefined
  if (!isSyncConfigured) {
    try {
      const encoded = await encodeTripSnapshot(trip)
      if (encoded.length < 120_000) snapshot = encoded
    } catch {
      snapshot = undefined
    }
  }
  const url = inviteUrl(trip.meta.code, snapshot)
  const text = `¡Únete a «${trip.meta.name}» en Pandilla! ${trip.meta.emoji}\nCódigo del viaje: ${trip.meta.code}`
  return { url, text, withSnapshot: Boolean(snapshot) }
}
