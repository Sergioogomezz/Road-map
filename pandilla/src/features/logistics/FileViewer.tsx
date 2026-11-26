import { ChevronLeft, ChevronRight, Download, ExternalLink, Sun, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FileRef } from '../../domain/types'
import { formatBytes } from '../../data/fileStore'
import { useFileUrl } from '../../hooks/useFileUrl'
import { useWakeLock } from '../../hooks/useWakeLock'
import { cn } from '../../ui/cn'
import { useFrameLayers } from '../../ui/Frame'

/** Visor a pantalla completa de los archivos de la bóveda (funciona sin conexión). */
export function FileViewer({ tripId, files, index: initial, onClose }: { tripId: string; files: FileRef[]; index: number; onClose: () => void }) {
  const { overlay } = useFrameLayers()
  const [index, setIndex] = useState(initial)
  const [zoom, setZoom] = useState(false)
  const file = files[index]
  const { url, loading } = useFileUrl(file?.id, tripId)
  useWakeLock(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(files.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [files.length, onClose])

  useEffect(() => {
    setZoom(false)
  }, [index])

  if (!overlay || !file) return null
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf'

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={file.name} className="pointer-events-auto absolute inset-0 z-[80] flex animate-fade-in flex-col bg-neutral-950 text-white">
      <div className="flex shrink-0 items-center gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="press flex size-11 items-center justify-center rounded-full bg-white/10">
          <X className="size-5" />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold">{file.name}</p>
          <p className="text-xs text-white/60">{formatBytes(file.size)}</p>
        </div>
        {isImage && (
          <button type="button" onClick={() => setZoom((z) => !z)} aria-label={zoom ? 'Alejar' : 'Ampliar'} className="press flex size-11 items-center justify-center rounded-full bg-white/10">
            {zoom ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
          </button>
        )}
        {url && (
          <a href={url} download={file.name} aria-label="Descargar" className="press flex size-11 items-center justify-center rounded-full bg-white/10">
            <Download className="size-5" />
          </a>
        )}
      </div>

      <div className={cn('relative min-h-0 flex-1', zoom ? 'overflow-auto' : 'overflow-hidden')}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          </div>
        ) : !url ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center text-white/70">
            <p className="font-semibold text-white">Este archivo no está disponible ahora</p>
            <p className="mt-1 text-sm">Se subió desde otro móvil. Con conexión se descarga solo; si no, pide que te lo pasen.</p>
          </div>
        ) : isImage ? (
          <div className={cn('flex min-h-full items-center justify-center bg-white', zoom ? 'w-[200%] p-0' : 'h-full p-3')} onDoubleClick={() => setZoom((z) => !z)}>
            <img src={url} alt={file.name} className={cn('select-none', zoom ? 'w-full' : 'max-h-full max-w-full object-contain')} draggable={false} />
          </div>
        ) : isPdf ? (
          <iframe src={url} title={file.name} className="size-full bg-white" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-white/80">Vista previa no disponible para este tipo de archivo.</p>
            <a href={url} target="_blank" rel="noreferrer" className="press inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-semibold text-black">
              <ExternalLink className="size-4" /> Abrir
            </a>
          </div>
        )}

      </div>

      <div className="shrink-0 px-4 pt-2 pb-[max(14px,env(safe-area-inset-bottom))]">
        {files.length > 1 && (
          <div className="mb-2 flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Anterior"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="press flex size-11 items-center justify-center rounded-full bg-white/12 disabled:opacity-30"
            >
              <ChevronLeft className="size-6" />
            </button>
            <span className="tabular min-w-14 text-center text-sm font-semibold">
              {index + 1} de {files.length}
            </span>
            <button
              type="button"
              aria-label="Siguiente"
              disabled={index === files.length - 1}
              onClick={() => setIndex((i) => Math.min(files.length - 1, i + 1))}
              className="press flex size-11 items-center justify-center rounded-full bg-white/12 disabled:opacity-30"
            >
              <ChevronRight className="size-6" />
            </button>
          </div>
        )}
        <p className="flex items-center justify-center gap-2 text-xs text-white/60">
          <Sun className="size-3.5" /> Sube el brillo del móvil para que escaneen el código
          {isPdf && url && (
            <a href={url} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-white underline">
              Abrir PDF aparte
            </a>
          )}
        </p>
      </div>
    </div>,
    overlay,
  )
}
