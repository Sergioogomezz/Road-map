import { ALargeSmall, Copy, MapPin, Navigation, Phone, Settings2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { appleMapsDirections, googleMapsDirections, isAppleDevice, telLink, wazeDirections } from '../../domain/maps'
import { useTrip } from '../../hooks/useTrip'
import { useWakeLock } from '../../hooks/useWakeLock'
import { cn } from '../../ui/cn'
import { copyText } from '../../ui/copy'
import { useFrameLayers } from '../../ui/Frame'
import { useToast } from '../../ui/Toast'

const SIZE_KEY = 'pandilla:taxi-size'

/**
 * Tarjeta a pantalla completa para enseñar al taxista: nombre y dirección del
 * alojamiento en letra enorme, alto contraste y la pantalla siempre encendida.
 */
export function TaxiMode({ onClose, onConfigure }: { onClose: () => void; onConfigure: () => void }) {
  const trip = useTrip()
  const { overlay } = useFrameLayers()
  const toast = useToast()
  const [huge, setHuge] = useState(() => {
    try {
      return localStorage.getItem(SIZE_KEY) === 'xl'
    } catch {
      return false
    }
  })
  const { name, address, phone } = trip.meta.accommodation
  useWakeLock(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggleSize = () => {
    setHuge((v) => {
      try {
        localStorage.setItem(SIZE_KEY, v ? 'normal' : 'xl')
      } catch {
        /* ignorado */
      }
      return !v
    })
  }

  if (!overlay) return null
  const apple = isAppleDevice()
  const target = address || name

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Modo taxi" className="pointer-events-auto absolute inset-0 z-[80] flex animate-fade-in flex-col bg-taxi text-taxi-fg">
      <div className="taxi-stripes h-3 shrink-0" aria-hidden />
      <div className="flex shrink-0 items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={onClose} className="press flex size-11 items-center justify-center rounded-full bg-black/10" aria-label="Cerrar modo taxi">
          <X className="size-6" />
        </button>
        <span className="flex-1 text-center text-sm font-extrabold tracking-[0.3em] uppercase">Taxi</span>
        <button
          type="button"
          onClick={toggleSize}
          aria-pressed={huge}
          className={cn('press flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold', huge ? 'bg-black text-taxi' : 'bg-black/10')}
        >
          <ALargeSmall className="size-5" /> {huge ? 'Normal' : 'Más grande'}
        </button>
      </div>

      {target ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-6 py-4">
            <p className="text-base font-bold opacity-70">Lléveme aquí, por favor · Please take me here</p>
            {trip.meta.taxiPhrase && <p className="mt-1 text-lg font-bold">{trip.meta.taxiPhrase}</p>}
            {name && (
              <p className={cn('mt-6 font-display leading-[1.05] font-extrabold break-words', huge ? 'text-[44px]' : 'text-[34px]')}>{name}</p>
            )}
            {address && (
              <p className={cn('mt-4 leading-[1.12] font-black tracking-tight break-words', huge ? 'text-[56px]' : 'text-[40px]')}>{address}</p>
            )}
          </div>

          <div className="shrink-0 space-y-2.5 px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
            <a
              href={apple ? appleMapsDirections(target) : googleMapsDirections(target)}
              target="_blank"
              rel="noreferrer"
              className="press flex h-16 items-center justify-center gap-3 rounded-3xl bg-black text-lg font-extrabold text-taxi"
            >
              <Navigation className="size-6" /> Cómo llegar ({apple ? 'Apple Maps' : 'Google Maps'})
            </a>
            <div className="grid grid-cols-3 gap-2.5">
              <a
                href={apple ? googleMapsDirections(target) : appleMapsDirections(target)}
                target="_blank"
                rel="noreferrer"
                className="press flex h-14 flex-col items-center justify-center rounded-2xl bg-black/10 text-xs font-bold"
              >
                <MapPin className="size-5" /> {apple ? 'Google' : 'Apple'}
              </a>
              <a href={wazeDirections(target)} target="_blank" rel="noreferrer" className="press flex h-14 flex-col items-center justify-center rounded-2xl bg-black/10 text-xs font-bold">
                <Navigation className="size-5 rotate-45" /> Waze
              </a>
              {phone ? (
                <a href={telLink(phone)} className="press flex h-14 flex-col items-center justify-center rounded-2xl bg-black/10 text-xs font-bold">
                  <Phone className="size-5" /> Llamar
                </a>
              ) : (
                <button
                  type="button"
                  onClick={async () => toast((await copyText([name, address].filter(Boolean).join(', '))) ? 'Dirección copiada' : 'No se pudo copiar', { tone: 'success' })}
                  className="press flex h-14 flex-col items-center justify-center rounded-2xl bg-black/10 text-xs font-bold"
                >
                  <Copy className="size-5" /> Copiar
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="font-display text-3xl font-extrabold">Aún no hay alojamiento</p>
          <p className="mt-2 font-medium opacity-75">Añade el nombre y la dirección para enseñárselos al taxista.</p>
          <button type="button" onClick={onConfigure} className="press mt-6 flex h-14 items-center gap-2 rounded-3xl bg-black px-6 font-bold text-taxi">
            <Settings2 className="size-5" /> Configurar alojamiento
          </button>
        </div>
      )}
    </div>,
    overlay,
  )
}
