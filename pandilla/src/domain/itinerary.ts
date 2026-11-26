import { atLocal } from './dates'
import type { Activity } from './types'

export function byOrder(a: Activity, b: Activity): number {
  return a.order - b.order || a.time.localeCompare(b.time) || a.title.localeCompare(b.title)
}

/** Las actividades sin hora van al final del día. */
export function byTime(a: Activity, b: Activity): number {
  const ta = a.time || '99:99'
  const tb = b.time || '99:99'
  return ta.localeCompare(tb) || a.order - b.order
}

export function activitiesOfDay(all: Activity[], date: string): Activity[] {
  return all.filter((a) => a.date === date).sort(byOrder)
}

export function isChronological(list: Activity[]): boolean {
  const timed = list.filter((a) => a.time)
  for (let i = 1; i < timed.length; i++) if (timed[i - 1].time > timed[i].time) return false
  return true
}

/** Orden para insertar una actividad con hora en su sitio cronológico dentro del día. */
export function orderForInsert(day: Activity[], time: string): number {
  const sorted = [...day].sort(byOrder)
  if (!sorted.length) return 1000
  if (!time) return sorted[sorted.length - 1].order + 1000
  const idx = sorted.findIndex((a) => a.time && a.time > time)
  if (idx === -1) return sorted[sorted.length - 1].order + 1000
  const prev = idx > 0 ? sorted[idx - 1].order : sorted[0].order - 2000
  return (prev + sorted[idx].order) / 2
}

/** Siguiente actividad (o la que está en curso, si empezó hace menos de 45 min). */
export function nextActivity(all: Activity[], now = new Date()): Activity | undefined {
  const graceMs = 45 * 60_000
  const timed = all
    .filter((a) => a.time)
    .map((a) => ({ a, at: atLocal(a.date, a.time).getTime() }))
    .filter(({ at }) => at + graceMs >= now.getTime())
    .sort((x, y) => x.at - y.at || x.a.order - y.a.order)
  return timed[0]?.a
}

export function isPast(a: Activity, now = new Date()): boolean {
  if (!a.time) return atLocal(a.date).getTime() + 86_400_000 <= now.getTime()
  return atLocal(a.date, a.time).getTime() + 60 * 60_000 < now.getTime()
}
