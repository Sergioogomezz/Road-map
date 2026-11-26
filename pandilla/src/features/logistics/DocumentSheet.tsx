import { Camera, Check, FileText, Loader2, Paperclip, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatDayChip, tripDays } from '../../domain/dates'
import { now, uid } from '../../domain/ids'
import type { DocCategory, FileRef, TripDocument } from '../../domain/types'
import { drop, put } from '../../data/actions'
import { tripStore } from '../../data/app'
import { formatBytes, requestPersistence } from '../../data/fileStore'
import { removeFiles, saveFile } from '../../data/files'
import { useMe, useTrip, useUpdate } from '../../hooks/useTrip'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { useConfirm } from '../../ui/Confirm'
import { Field, Select, TextArea, TextInput } from '../../ui/Field'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { DOC_CATEGORIES, DOC_CATEGORY_LIST } from '../meta'

const MAX_FILE = 25 * 1024 * 1024

/** Borra archivos de un documento eliminado pasado un rato (por si se deshace). */
function deleteFilesLater(tripId: string, ids: string[]) {
  window.setTimeout(() => {
    const trip = tripStore.getSnapshot()
    const stillUsed = new Set(trip?.documents.flatMap((d) => d.files.map((f) => f.id)) ?? [])
    void removeFiles(tripId, ids.filter((id) => !stillUsed.has(id)))
  }, 8000)
}

export function DocumentSheet({ open, onClose, doc, defaultCategory }: { open: boolean; onClose: () => void; doc?: TripDocument; defaultCategory: DocCategory }) {
  const trip = useTrip()
  const me = useMe()
  const update = useUpdate()
  const toast = useToast()
  const confirm = useConfirm()
  const [title, setTitle] = useState(doc?.title ?? '')
  const [category, setCategory] = useState<DocCategory>(doc?.category ?? defaultCategory)
  const [code, setCode] = useState(doc?.code ?? '')
  const [link, setLink] = useState(doc?.link ?? '')
  const [date, setDate] = useState(doc?.date ?? '')
  const [memberId, setMemberId] = useState(doc?.memberId ?? '')
  const [notes, setNotes] = useState(doc?.notes ?? '')
  const [files, setFiles] = useState<FileRef[]>(doc?.files ?? [])
  const [uploading, setUploading] = useState(false)
  const [touched, setTouched] = useState(false)
  const added = useRef<string[]>([])
  const saved = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  // Si se cierra sin guardar, se borran los archivos subidos en esta edición.
  useEffect(() => {
    if (open) return
    if (!saved.current && added.current.length) void removeFiles(trip.id, added.current)
    added.current = []
  }, [open])

  const onPick = async (list: FileList | null) => {
    if (!list?.length) return
    setUploading(true)
    try {
      const refs: FileRef[] = []
      for (const file of Array.from(list)) {
        if (file.size > MAX_FILE) {
          toast(`«${file.name}» pesa más de 25 MB`, { tone: 'danger' })
          continue
        }
        const id = uid('f')
        await saveFile(trip.id, id, file)
        added.current.push(id)
        refs.push({ id, name: file.name || 'foto.jpg', type: file.type || 'application/octet-stream', size: file.size, addedAt: now(), addedBy: me.id })
      }
      if (refs.length) {
        setFiles((f) => [...f, ...refs])
        void requestPersistence()
      }
    } catch {
      toast('No se pudo guardar el archivo en este móvil', { tone: 'danger' })
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
      if (cameraInput.current) cameraInput.current.value = ''
    }
  }

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    setTouched(true)
    if (!title.trim()) return
    const cleanLink = link.trim() && !/^https?:\/\//i.test(link.trim()) ? `https://${link.trim()}` : link.trim()
    const draft: Omit<TripDocument, 'updatedAt'> = {
      id: doc?.id ?? uid('d'),
      title: title.trim(),
      category,
      code: code.trim(),
      link: cleanLink,
      date,
      memberId: memberId || undefined,
      notes: notes.trim(),
      files,
      createdBy: doc?.createdBy ?? me.id,
      createdAt: doc?.createdAt ?? now(),
    }
    saved.current = true
    update((t) => put(t, 'documents', draft))
    const removed = (doc?.files ?? []).filter((f) => !files.some((x) => x.id === f.id)).map((f) => f.id)
    if (removed.length) void removeFiles(trip.id, removed)
    toast(doc ? 'Guardado' : 'Guardado en la bóveda · disponible sin cobertura', { tone: 'success' })
    onClose()
  }

  const remove = async () => {
    if (!doc) return
    if (!(await confirm({ title: `¿Borrar «${doc.title}»?`, message: doc.files.length ? 'También se borrarán sus archivos de este móvil.' : undefined, confirmLabel: 'Borrar' }))) return
    saved.current = true
    update((t) => drop(t, 'documents', [doc.id]))
    deleteFilesLater(trip.id, doc.files.map((f) => f.id))
    onClose()
    toast('Documento borrado', { action: { label: 'Deshacer', onClick: () => update((t) => put(t, 'documents', doc)) } })
  }

  const days = tripDays(trip.meta)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={doc ? 'Editar reserva' : 'Guardar en la bóveda'}
      size="full"
      footer={
        <div className="flex gap-3">
          {doc && (
            <Button variant="danger" onClick={remove} aria-label="Borrar documento" icon={<Trash2 className="size-4" />}>
              Borrar
            </Button>
          )}
          <Button full onClick={() => save()} disabled={uploading} icon={<Check className="size-4" />}>
            Guardar
          </Button>
        </div>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {DOC_CATEGORY_LIST.map((c) => {
            const meta = DOC_CATEGORIES[c]
            const Icon = meta.icon
            return (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  'press flex h-11 items-center gap-2 rounded-2xl border px-3 text-left text-sm font-semibold',
                  category === c ? cn('border-transparent ring-2 ring-current', meta.chip) : 'border-line bg-surface text-fg-2',
                  c === 'otros' && 'col-span-2',
                )}
              >
                <Icon className="size-4 shrink-0" /> <span className="truncate">{meta.label}</span>
              </button>
            )
          })}
        </div>

        <Field label="Título" htmlFor="doc-title" error={touched && !title.trim() ? 'Ponle un título' : undefined}>
          <TextInput id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Vuelo de ida, Hotel, Entradas museo…" maxLength={80} data-autofocus={!doc || undefined} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código de reserva" htmlFor="doc-code">
            <TextInput id="doc-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" autoCapitalize="characters" className="font-mono font-bold tracking-wider" maxLength={40} />
          </Field>
          <Field label="Fecha" htmlFor="doc-date">
            <Select id="doc-date" value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="">Sin fecha</option>
              {days.map((d) => (
                <option key={d.date} value={d.date}>
                  Día {d.index} · {formatDayChip(d.date)}
                </option>
              ))}
              {date && !days.some((d) => d.date === date) && <option value={date}>{formatDayChip(date)}</option>}
            </Select>
          </Field>
        </div>
        <Field label="Enlace" htmlFor="doc-link">
          <TextInput id="doc-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Gestión de la reserva, check-in online…" inputMode="url" autoCapitalize="none" maxLength={400} />
        </Field>
        <Field label="¿De quién es?" htmlFor="doc-member">
          <Select id="doc-member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">De todo el grupo</option>
            {trip.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notas" htmlFor="doc-notes">
          <TextArea id="doc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Horarios, wifi, instrucciones de llegada…" maxLength={600} />
        </Field>

        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-fg-2">Archivos (fotos o PDF)</p>
          {files.length > 0 && (
            <ul className="mb-2 flex flex-col gap-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-2 pl-3">
                  <FileText className="size-5 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{f.name}</span>
                    <span className="text-xs text-muted">{formatBytes(f.size)}</span>
                  </span>
                  <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => setFiles(files.filter((x) => x.id !== f.id))} className="press rounded-full p-2 text-muted hover:bg-surface-3">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading} icon={uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}>
              Foto o PDF
            </Button>
            <Button variant="outline" onClick={() => cameraInput.current?.click()} disabled={uploading} icon={<Camera className="size-4" />}>
              Hacer foto
            </Button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">Se guardan sin comprimir para que los códigos QR se puedan escanear.</p>
          <input ref={fileInput} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => void onPick(e.target.files)} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onPick(e.target.files)} />
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
