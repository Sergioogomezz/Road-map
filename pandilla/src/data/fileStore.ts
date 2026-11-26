/**
 * Archivos de la bóveda (tarjetas de embarque, entradas, PDFs…) guardados en
 * IndexedDB: no tienen el límite de ~5 MB de localStorage y siguen disponibles
 * sin cobertura. Se guardan tal cual, sin comprimir, para que los códigos QR y
 * de barras se puedan escanear.
 */

const DB_NAME = 'pandilla-files'
const STORE = 'files'
const VERSION = 1

interface StoredFile {
  id: string
  tripId: string
  blob: Blob
  savedAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no permite guardar archivos sin conexión'))
      return
    }
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('tripId', 'tripId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir la base de datos de archivos'))
  })
  dbPromise.catch(() => {
    dbPromise = null
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        let result: T | undefined
        if (req) req.onsuccess = () => (result = req.result)
        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(tx.error ?? new Error('Error de IndexedDB'))
        tx.onabort = () => reject(tx.error ?? new Error('Operación cancelada'))
      }),
  )
}

export async function putFile(id: string, tripId: string, blob: Blob): Promise<void> {
  await run('readwrite', (s) => s.put({ id, tripId, blob, savedAt: Date.now() } satisfies StoredFile))
}

export async function getFile(id: string): Promise<Blob | undefined> {
  const rec = await run<StoredFile | undefined>('readonly', (s) => s.get(id) as IDBRequest<StoredFile | undefined>)
  return rec?.blob
}

export async function hasFiles(ids: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  if (!ids.length) return found
  const keys = await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys())
  for (const k of keys ?? []) if (ids.includes(String(k))) found.add(String(k))
  return found
}

export async function deleteFiles(ids: string[]): Promise<void> {
  if (!ids.length) return
  await run('readwrite', (s) => {
    for (const id of ids) s.delete(id)
  })
}

export async function deleteTripFiles(tripId: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const index = tx.objectStore(STORE).index('tripId')
    const req = index.openCursor(IDBKeyRange.only(tripId))
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const est = await navigator.storage?.estimate?.()
    if (!est) return null
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 }
  } catch {
    return null
  }
}

/** Pide al navegador que no borre los datos aunque falte espacio. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`
}
