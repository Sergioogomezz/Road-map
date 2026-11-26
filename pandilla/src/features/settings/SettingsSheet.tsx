import {
  BedDouble,
  ChevronRight,
  Cloud,
  Coins,
  Download,
  FileUp,
  HardDrive,
  LogOut,
  MapPinned,
  Palette,
  RefreshCw,
  Repeat,
  Smartphone,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatRange } from '../../domain/dates'
import { deleteTripFromDevice, importTrip, isSyncConfigured, leaveTrip, restoreDemo, tripStore } from '../../data/app'
import { formatBytes, storageEstimate } from '../../data/fileStore'
import { mergeTrips } from '../../data/merge'
import { normalizeTrip } from '../../data/tripModel'
import { navigate } from '../../hooks/useHashRoute'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { useTheme, type ThemePref } from '../../hooks/useTheme'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { useMe, useTrip } from '../../hooks/useTrip'
import { Avatar } from '../../ui/Avatar'
import { cn } from '../../ui/cn'
import { useConfirm } from '../../ui/Confirm'
import { Segmented } from '../../ui/Segmented'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { InviteSheet } from './InviteSheet'
import { AccommodationSheet, MembersSheet, ProfileSheet, RatesSheet, TripInfoSheet } from './TripSheets'

type Sub = 'profile' | 'trip' | 'accommodation' | 'members' | 'rates' | 'invite' | null

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trip = useTrip()
  const me = useMe()
  const toast = useToast()
  const confirm = useConfirm()
  const install = useInstallPrompt()
  const [theme, setTheme] = useTheme()
  const [sub, setSub] = useState<Sub>(null)
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const sync = useSyncStatus()

  useEffect(() => {
    if (open) void storageEstimate().then(setStorage)
  }, [open])

  const exportTrip = () => {
    const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const slug = trip.meta.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    a.href = url
    a.download = `pandilla-${slug || 'viaje'}.json`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast('Copia descargada (sin los archivos de la bóveda)', { tone: 'success' })
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const incoming = normalizeTrip(JSON.parse(await file.text()))
      if (!incoming) throw new Error('Formato no válido')
      if (incoming.id === trip.id) {
        tripStore.replace(mergeTrips(trip, incoming))
        toast('Copia fusionada con el viaje', { tone: 'success' })
      } else {
        await importTrip(incoming)
        toast(`«${incoming.meta.name}» importado. Lo verás en la portada.`, { tone: 'success' })
      }
    } catch {
      toast('Ese archivo no es una copia válida de Pandilla', { tone: 'danger' })
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const switchProfile = () => {
    const code = trip.meta.code
    onClose()
    leaveTrip()
    navigate(`unirse/${code}`)
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Ajustes" size="full">
        <button type="button" onClick={() => setSub('profile')} className="press flex w-full items-center gap-3 rounded-3xl bg-surface-2 p-3 text-left">
          <Avatar member={me} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{me.name}</p>
            <p className="truncate text-sm text-muted">{me.bizum || me.revolut ? [me.bizum && `Bizum ${me.bizum}`, me.revolut].filter(Boolean).join(' · ') : 'Editar perfil y datos para cobrar'}</p>
          </div>
          <ChevronRight className="size-5 text-muted" />
        </button>

        <Group title="Viaje">
          <Row icon={<MapPinned />} label="Datos del viaje" hint={`${trip.meta.name} · ${formatRange(trip.meta.startDate, trip.meta.endDate)}`} onClick={() => setSub('trip')} />
          <Row icon={<BedDouble />} label="Alojamiento y modo taxi" hint={trip.meta.accommodation.name || 'Sin configurar'} onClick={() => setSub('accommodation')} />
          <Row icon={<Users />} label="Personas" hint={`${trip.members.length} en el viaje`} onClick={() => setSub('members')} />
          <Row icon={<UserPlus />} label="Invitar" hint={`Código ${trip.meta.code}`} onClick={() => setSub('invite')} />
          <Row icon={<Coins />} label="Divisas y tipos de cambio" hint={trip.rates.source === 'online' ? `BCE · ${trip.rates.date ?? ''}` : trip.rates.source === 'manual' ? 'Editados a mano' : 'Aproximados (sin conexión)'} onClick={() => setSub('rates')} />
        </Group>

        <Group title="Aplicación">
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-fg-2 [&>svg]:size-[18px]">
              <Palette />
            </span>
            <span className="flex-1 text-[15px] font-semibold">Tema</span>
          </div>
          <div className="px-3 pb-3">
            <Segmented<ThemePref>
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'system', label: 'Sistema' },
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Oscuro' },
              ]}
            />
          </div>
          {install.canPrompt && <Row icon={<Smartphone />} label="Instalar la app" hint="Acceso directo y uso sin cobertura" onClick={() => void install.prompt()} />}
          {install.showIOSHint && <Row icon={<Smartphone />} label="Instalar en iPhone" hint="Safari → Compartir → Añadir a pantalla de inicio" />}
          <Row
            icon={isSyncConfigured ? <Cloud /> : <HardDrive />}
            label={isSyncConfigured ? 'Sincronización en tiempo real' : 'Guardado en este móvil'}
            hint={
              isSyncConfigured
                ? trip.meta.isDemo
                  ? 'El viaje de ejemplo no se comparte'
                  : sync.message ||
                    (sync.pending
                      ? 'Hay cambios pendientes de subir'
                      : sync.lastSyncAt
                        ? `Todo al día · ${new Date(sync.lastSyncAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                        : 'Conectando con Supabase…')
                : `Funciona sin conexión${storage ? ` · ${formatBytes(storage.usage)} usados` : ''}`
            }
          />
        </Group>

        <Group title="Datos">
          <Row icon={<Download />} label="Exportar copia (.json)" onClick={exportTrip} />
          <Row icon={<FileUp />} label="Importar copia" hint="Se fusiona sin borrar nada" onClick={() => fileInput.current?.click()} />
          {trip.meta.isDemo && (
            <Row
              icon={<RefreshCw />}
              label="Restaurar el viaje de ejemplo"
              hint="Vuelve a los datos iniciales con fechas de hoy"
              onClick={async () => {
                if (!(await confirm({ title: '¿Restaurar el ejemplo?', message: 'Se perderán los cambios que hayas hecho en el viaje de ejemplo.', confirmLabel: 'Restaurar', tone: 'primary' }))) return
                await restoreDemo()
                toast('Viaje de ejemplo restaurado', { tone: 'success' })
              }}
            />
          )}
          <Row icon={<Repeat />} label="Cambiar de perfil" hint="Entrar como otra persona del viaje" onClick={switchProfile} />
          <Row
            icon={<LogOut />}
            label="Salir del viaje"
            hint="Vuelve a la portada; el viaje se queda guardado"
            onClick={() => {
              onClose()
              leaveTrip()
              navigate('', { replace: true })
            }}
          />
          <Row
            icon={<Trash2 />}
            danger
            label="Eliminar viaje de este móvil"
            onClick={async () => {
              const ok = await confirm({
                title: `¿Eliminar «${trip.meta.name}»?`,
                message: isSyncConfigured
                  ? 'Se borra de este móvil. El resto del grupo lo conserva y podrás volver a entrar con el código.'
                  : 'Se borran el viaje y sus archivos de este móvil. Si nadie más tiene una copia, no se podrá recuperar.',
              })
              if (!ok) return
              onClose()
              await deleteTripFromDevice(trip.id)
              navigate('', { replace: true })
            }}
          />
        </Group>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onImport(e.target.files?.[0])} />
        <p className="mt-6 text-center text-xs text-muted">Pandilla · hecha para viajar en grupo sin dramas</p>
      </Sheet>

      <ProfileSheet open={sub === 'profile'} onClose={() => setSub(null)} />
      <TripInfoSheet open={sub === 'trip'} onClose={() => setSub(null)} />
      <AccommodationSheet open={sub === 'accommodation'} onClose={() => setSub(null)} />
      <MembersSheet open={sub === 'members'} onClose={() => setSub(null)} />
      <RatesSheet open={sub === 'rates'} onClose={() => setSub(null)} />
      <InviteSheet open={sub === 'invite'} onClose={() => setSub(null)} />
    </>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 px-1 text-[13px] font-bold tracking-wide text-muted uppercase">{title}</h3>
      <div className="overflow-hidden rounded-3xl border border-line">{children}</div>
    </section>
  )
}

function Row({ icon, label, hint, onClick, danger }: { icon: ReactNode; label: string; hint?: string; onClick?: () => void; danger?: boolean }) {
  const content = (
    <>
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl [&>svg]:size-[18px]', danger ? 'bg-danger-soft text-danger-text' : 'bg-surface-2 text-fg-2')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[15px] font-semibold', danger && 'text-danger-text')}>{label}</span>
        {hint && <span className="block truncate text-[13px] text-muted">{hint}</span>}
      </span>
      {onClick && <ChevronRight className="size-4 shrink-0 text-muted" />}
    </>
  )
  const cls = 'flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left last:border-b-0'
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'press hover:bg-surface-2')}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  )
}

