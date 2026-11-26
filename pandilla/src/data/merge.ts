import { COLLECTIONS, type Entity, type Trip } from '../domain/types'

function mergeList<T extends Entity>(a: T[], b: T[], tombstones: Record<string, number>): T[] {
  const byId = new Map<string, T>()
  for (const x of a) byId.set(x.id, x)
  for (const y of b) {
    const x = byId.get(y.id)
    if (!x || y.updatedAt > x.updatedAt) byId.set(y.id, y)
  }
  const out: T[] = []
  for (const e of byId.values()) {
    const deletedAt = tombstones[e.id]
    if (deletedAt === undefined || e.updatedAt > deletedAt) out.push(e)
  }
  return out
}

/**
 * Fusiona dos copias del mismo viaje sin perder cambios de ninguna:
 * por cada entidad gana la versión más reciente y los borrados se respetan
 * salvo que la entidad se haya editado después de borrarse.
 */
export function mergeTrips(a: Trip, b: Trip): Trip {
  if (a.id !== b.id) throw new Error('No se pueden fusionar viajes distintos')
  const tombstones: Record<string, number> = { ...a.tombstones }
  for (const [id, at] of Object.entries(b.tombstones)) tombstones[id] = Math.max(tombstones[id] ?? 0, at)
  const merged: Trip = {
    ...a,
    meta: b.meta.updatedAt > a.meta.updatedAt ? b.meta : a.meta,
    rates: b.rates.updatedAt > a.rates.updatedAt ? b.rates : a.rates,
    tombstones,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  }
  const target = merged as unknown as Record<string, Entity[]>
  for (const key of COLLECTIONS) {
    target[key] = mergeList(a[key] as Entity[], b[key] as Entity[], tombstones)
  }
  return merged
}
