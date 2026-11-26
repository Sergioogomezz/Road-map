/**
 * Archivos de la bóveda: siempre se guardan en el móvil (IndexedDB) para verlos
 * sin cobertura y, si hay sincronización, también en la nube para que el resto
 * del grupo los descargue al abrirlos. Las subidas que fallan (sin conexión)
 * quedan en cola y se reintentan al volver la cobertura.
 */
import type { ID } from '../domain/types'
import { getRemoteFiles } from './app'
import { deleteFiles, getFile, putFile } from './fileStore'

const QUEUE_KEY = 'pandilla:pending-files'
const isLocalOnly = (tripId: ID) => tripId.startsWith('demo-')

interface Pending {
  tripId: ID
  fileId: ID
}

function readQueue(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as Pending[]
  } catch {
    return []
  }
}

function writeQueue(list: Pending[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list))
  } catch {
    /* ignorado */
  }
}

let flushing: Promise<void> | null = null

/** Sube los archivos pendientes (en orden; se detiene al primer fallo de red). */
export function flushFileUploads(): Promise<void> {
  flushing ??= (async () => {
    const remote = await getRemoteFiles()
    if (!remote) return
    for (const item of readQueue()) {
      const blob = await getFile(item.fileId).catch(() => undefined)
      if (blob) {
        try {
          await remote.upload(item.tripId, item.fileId, blob)
        } catch {
          break
        }
      }
      writeQueue(readQueue().filter((p) => p.fileId !== item.fileId))
    }
  })().finally(() => {
    flushing = null
  })
  return flushing
}

export async function saveFile(tripId: ID, fileId: ID, blob: Blob): Promise<void> {
  await putFile(fileId, tripId, blob)
  if (isLocalOnly(tripId) || !(await getRemoteFiles())) return
  writeQueue([...readQueue().filter((p) => p.fileId !== fileId), { tripId, fileId }])
  void flushFileUploads()
}

const downloads = new Map<ID, Promise<Blob | undefined>>()

/** Archivo del móvil; si no está y hay sincronización, se descarga y se guarda para verlo sin cobertura. */
export function loadFile(tripId: ID, fileId: ID): Promise<Blob | undefined> {
  const inFlight = downloads.get(fileId)
  if (inFlight) return inFlight
  const task = (async () => {
    const local = await getFile(fileId).catch(() => undefined)
    if (local || isLocalOnly(tripId)) return local
    const remote = await getRemoteFiles()
    if (!remote) return undefined
    try {
      const blob = await remote.download(tripId, fileId)
      await putFile(fileId, tripId, blob).catch(() => undefined)
      return blob
    } catch {
      return undefined
    }
  })().finally(() => downloads.delete(fileId))
  downloads.set(fileId, task)
  return task
}

export async function removeFiles(tripId: ID, fileIds: ID[]): Promise<void> {
  if (!fileIds.length) return
  writeQueue(readQueue().filter((p) => !fileIds.includes(p.fileId)))
  await deleteFiles(fileIds).catch(() => undefined)
  if (isLocalOnly(tripId)) return
  const remote = await getRemoteFiles()
  await remote?.remove(tripId, fileIds).catch(() => undefined)
}

export async function isSyncingFiles(): Promise<boolean> {
  return Boolean(await getRemoteFiles())
}

/** Arranca los reintentos de subida (al abrir la app y al volver la cobertura). */
export function startFileSync() {
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => void flushFileUploads())
  void flushFileUploads()
}
