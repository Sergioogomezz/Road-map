import { Copy, Info, Link2, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isSyncConfigured } from '../../data/app'
import { useTrip } from '../../hooks/useTrip'
import { AvatarStack } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { copyText, shareOrCopy } from '../../ui/copy'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { buildInvite } from '../shared'

export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trip = useTrip()
  const toast = useToast()
  const [invite, setInvite] = useState<{ url: string; text: string; withSnapshot: boolean } | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void buildInvite(trip).then((i) => !cancelled && setInvite(i))
    return () => {
      cancelled = true
    }
  }, [open, trip])

  const share = async () => {
    const i = invite ?? (await buildInvite(trip))
    const result = await shareOrCopy({ title: trip.meta.name, text: i.text, url: i.url })
    if (result === 'copied') toast('Invitación copiada: pégala en el grupo', { tone: 'success' })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Invitar a la pandilla" subtitle="Con el código o el enlace entran eligiendo su nombre.">
      <div className="flex flex-col items-center pt-2 text-center">
        <AvatarStack members={trip.members} max={7} size="md" />
        <button
          type="button"
          onClick={async () => toast((await copyText(trip.meta.code)) ? 'Código copiado' : 'No se pudo copiar', { tone: 'success' })}
          className="press mt-5 rounded-3xl border-2 border-dashed border-primary/40 bg-primary-soft px-8 py-4 font-display text-4xl font-extrabold tracking-[0.25em] text-primary-text"
          aria-label={`Código del viaje ${trip.meta.code}. Toca para copiarlo`}
        >
          {trip.meta.code}
        </button>
        <p className="mt-2 text-xs text-muted">Toca el código para copiarlo</p>
      </div>
      <div className="mt-6 flex flex-col gap-2.5">
        <Button size="lg" full icon={<Share2 className="size-5" />} onClick={share}>
          Compartir invitación
        </Button>
        <Button
          variant="secondary"
          full
          icon={<Link2 className="size-4" />}
          disabled={!invite}
          onClick={async () => invite && toast((await copyText(invite.url)) ? 'Enlace copiado' : 'No se pudo copiar', { tone: 'success' })}
        >
          Copiar enlace
        </Button>
        <Button
          variant="ghost"
          full
          icon={<Copy className="size-4" />}
          onClick={async () => toast((await copyText(`${trip.meta.name}: código ${trip.meta.code}`)) ? 'Copiado' : 'No se pudo copiar', { tone: 'success' })}
        >
          Copiar solo el código
        </Button>
      </div>
      <div className="mt-5 flex gap-3 rounded-2xl bg-surface-2 p-3.5 text-[13px] leading-relaxed text-fg-2">
        <Info className="mt-0.5 size-4 shrink-0 text-primary-text" />
        {isSyncConfigured ? (
          <p>Los cambios se sincronizan en tiempo real entre todos los móviles del grupo.</p>
        ) : (
          <p>
            Sin servidor conectado, <strong>el enlace lleva dentro una copia del viaje</strong> (los archivos de la bóveda no viajan). Si alguien añade cosas, que vuelva a
            compartir el enlace: al abrirlo se fusiona con lo que ya tenías sin perder nada.
          </p>
        )}
      </div>
    </Sheet>
  )
}
