import { CloudOff, Copy, ExternalLink, FileText, FolderLock, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatDayChip } from '../../domain/dates'
import type { DocCategory, FileRef, TripDocument } from '../../domain/types'
import { formatBytes, hasFiles, storageEstimate } from '../../data/fileStore'
import { useFileUrl } from '../../hooks/useFileUrl'
import { useMembersById, useTrip } from '../../hooks/useTrip'
import { Avatar } from '../../ui/Avatar'
import { cn } from '../../ui/cn'
import { copyText } from '../../ui/copy'
import { Card, EmptyState, Fab, FilterChip } from '../../ui/misc'
import { useSheet } from '../../ui/Sheet'
import { useToast } from '../../ui/Toast'
import { DOC_CATEGORIES, DOC_CATEGORY_LIST } from '../meta'
import { DocumentSheet } from './DocumentSheet'
import { FileViewer } from './FileViewer'

type Filter = DocCategory | 'todos'

export function Vault() {
  const trip = useTrip()
  const [filter, setFilter] = useState<Filter>('todos')
  const [available, setAvailable] = useState<Set<string> | null>(null)
  const [usage, setUsage] = useState<number | null>(null)
  const sheet = useSheet<TripDocument>()
  const [viewer, setViewer] = useState<{ files: FileRef[]; index: number } | null>(null)

  const allFileIds = useMemo(() => trip.documents.flatMap((d) => d.files.map((f) => f.id)), [trip.documents])
  useEffect(() => {
    let cancelled = false
    hasFiles(allFileIds)
      .then((set) => !cancelled && setAvailable(set))
      .catch(() => !cancelled && setAvailable(new Set()))
    void storageEstimate().then((e) => !cancelled && setUsage(e?.usage ?? null))
    return () => {
      cancelled = true
    }
  }, [allFileIds])

  const docs = useMemo(
    () =>
      [...trip.documents]
        .filter((d) => filter === 'todos' || d.category === filter)
        .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title)),
    [trip.documents, filter],
  )
  const groups = filter === 'todos' ? DOC_CATEGORY_LIST.map((c) => ({ category: c, docs: docs.filter((d) => d.category === c) })).filter((g) => g.docs.length) : [{ category: filter, docs }]

  return (
    <div className="px-4 pb-4">
      <div className="flex items-start gap-3 rounded-3xl bg-success-soft p-4 text-success-text">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-bold">Disponible sin cobertura</p>
          <p className="mt-0.5 opacity-85">
            Códigos, enlaces y archivos se guardan en este móvil{usage !== null ? ` (${formatBytes(usage)} usados)` : ''}. Ábrelos en el aeropuerto aunque no haya datos.
          </p>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <FilterChip active={filter === 'todos'} onClick={() => setFilter('todos')} count={trip.documents.length}>
          Todo
        </FilterChip>
        {DOC_CATEGORY_LIST.map((c) => {
          const Icon = DOC_CATEGORIES[c].icon
          return (
            <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)} count={trip.documents.filter((d) => d.category === c).length}>
              <Icon className="size-4" /> {DOC_CATEGORIES[c].short}
            </FilterChip>
          )
        })}
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={<FolderLock className="size-7" />}
          title="Nada guardado aquí"
          text="Guarda códigos de reserva, enlaces y fotos o PDFs de tarjetas de embarque y entradas."
        />
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.category}>
              {filter === 'todos' && <h3 className="mb-2 px-1 text-[13px] font-bold tracking-wide text-muted uppercase">{DOC_CATEGORIES[g.category].label}</h3>}
              <div className="flex flex-col gap-3">
                {g.docs.map((d) => (
                  <DocCard key={d.id} doc={d} available={available} onEdit={() => sheet.open(d)} onOpenFile={(index) => setViewer({ files: d.files, index })} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Fab label="Guardar reserva" onClick={() => sheet.open()} />
      {sheet.state && (
        <DocumentSheet key={sheet.state.key} open={sheet.state.open} onClose={sheet.close} doc={sheet.state.target} defaultCategory={filter === 'todos' ? 'transporte' : filter} />
      )}
      {viewer && <FileViewer files={viewer.files} index={viewer.index} onClose={() => setViewer(null)} />}
    </div>
  )
}

function DocCard({ doc, available, onEdit, onOpenFile }: { doc: TripDocument; available: Set<string> | null; onEdit: () => void; onOpenFile: (index: number) => void }) {
  const byId = useMembersById()
  const toast = useToast()
  const meta = DOC_CATEGORIES[doc.category]
  const Icon = meta.icon
  const owner = doc.memberId ? byId.get(doc.memberId) : undefined

  return (
    <Card as="article" className="overflow-hidden">
      <button type="button" onClick={onEdit} className="press flex w-full items-start gap-3 p-4 pb-3 text-left">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', meta.chip)}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug font-bold">{doc.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {doc.date && <span className="font-semibold">{formatDayChip(doc.date)}</span>}
            {owner && (
              <span className="inline-flex items-center gap-1">
                <Avatar member={owner} size="xs" /> {owner.name}
              </span>
            )}
            {doc.files.length > 0 && (
              <span>
                {doc.files.length} {doc.files.length === 1 ? 'archivo' : 'archivos'}
              </span>
            )}
          </span>
        </span>
      </button>

      {(doc.code || doc.link) && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {doc.code && (
            <button
              type="button"
              onClick={async () => toast((await copyText(doc.code)) ? `Código ${doc.code} copiado` : 'No se pudo copiar', { tone: 'success' })}
              className="press inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2 px-3 font-mono text-[15px] font-bold tracking-wider"
              aria-label={`Código de reserva ${doc.code}. Toca para copiar`}
            >
              {doc.code}
              <Copy className="size-3.5 text-muted" />
            </button>
          )}
          {doc.link && (
            <a href={doc.link} target="_blank" rel="noreferrer" className="press inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary-soft px-3 text-sm font-semibold text-primary-text">
              <ExternalLink className="size-4" /> Abrir enlace
            </a>
          )}
        </div>
      )}

      {doc.notes && <p className="px-4 pb-3 text-[13px] leading-relaxed whitespace-pre-line text-fg-2">{doc.notes}</p>}

      {doc.files.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-line bg-surface-2/50 px-4 py-3">
          {doc.files.map((f, i) => (
            <FileThumb key={f.id} file={f} missing={available ? !available.has(f.id) : false} onOpen={() => onOpenFile(i)} />
          ))}
        </div>
      )}
    </Card>
  )
}

export function FileThumb({ file, missing, onOpen }: { file: FileRef; missing?: boolean; onOpen: () => void }) {
  const isImage = file.type.startsWith('image/')
  const { url } = useFileUrl(isImage && !missing ? file.id : undefined)
  if (missing) {
    return (
      <div className="flex h-20 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line-strong px-2 text-center text-[11px] text-muted" title={file.name}>
        <CloudOff className="size-4" />
        No está en este móvil
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="press relative flex h-20 w-28 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-line bg-white text-center"
      aria-label={`Ver ${file.name}`}
    >
      {isImage && url ? (
        <img src={url} alt="" className="size-full object-contain p-1" />
      ) : (
        <>
          <FileText className="size-6 text-red-600" />
          <span className="mt-1 line-clamp-2 px-2 text-[10px] leading-tight font-semibold text-neutral-700">{file.name}</span>
        </>
      )}
      <span className="absolute right-1 bottom-1 rounded-md bg-black/55 px-1 text-[9px] font-semibold text-white">{formatBytes(file.size)}</span>
    </button>
  )
}
