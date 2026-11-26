import type { TripMeta } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Fecha local (00:00) a partir de YYYY-MM-DD. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Días naturales de `a` a `b` (b - a). */
export function diffDays(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Momento local de una actividad. Sin hora → inicio del día. */
export function atLocal(date: string, time?: string): Date {
  const d = parseISODate(date)
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
  }
  return d
}

export interface TripDay {
  date: string
  index: number
}

export function tripDays(meta: Pick<TripMeta, 'startDate' | 'endDate'>): TripDay[] {
  const total = Math.max(1, Math.min(60, diffDays(meta.startDate, meta.endDate) + 1))
  return Array.from({ length: total }, (_, i) => ({ date: addDays(meta.startDate, i), index: i + 1 }))
}

export type TripPhase =
  | { phase: 'antes'; daysLeft: number; start: Date }
  | { phase: 'durante'; dayIndex: number; totalDays: number }
  | { phase: 'despues'; daysAgo: number }

export function tripPhase(meta: Pick<TripMeta, 'startDate' | 'endDate'>, now = new Date()): TripPhase {
  const today = toISODate(now)
  const totalDays = tripDays(meta).length
  if (today < meta.startDate) {
    return { phase: 'antes', daysLeft: diffDays(today, meta.startDate), start: parseISODate(meta.startDate) }
  }
  if (today > meta.endDate) return { phase: 'despues', daysAgo: diffDays(meta.endDate, today) }
  return { phase: 'durante', dayIndex: diffDays(meta.startDate, today) + 1, totalDays }
}

export function countdownParts(target: Date, now = new Date()) {
  let s = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
  const days = Math.floor(s / 86400)
  s -= days * 86400
  const hours = Math.floor(s / 3600)
  s -= hours * 3600
  const minutes = Math.floor(s / 60)
  return { days, hours, minutes, seconds: s - minutes * 60 }
}

const fmtWeekdayShort = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
const fmtDayMonth = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const fmtLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtTime = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })

const clean = (s: string) => s.replace('.', '')

/** "sáb 5" */
export function formatDayChip(iso: string): string {
  const d = parseISODate(iso)
  return `${clean(fmtWeekdayShort.format(d))} ${d.getDate()}`
}

/** "5 dic" */
export function formatDayMonth(iso: string): string {
  return clean(fmtDayMonth.format(parseISODate(iso)))
}

/** "sábado, 5 de diciembre" */
export function formatDayLong(iso: string): string {
  return fmtLong.format(parseISODate(iso))
}

/** "5–8 dic 2026" o "28 nov – 2 dic 2026" */
export function formatRange(start: string, end: string): string {
  const a = parseISODate(start)
  const b = parseISODate(end)
  const month = (d: Date) => clean(new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d))
  if (start === end) return `${a.getDate()} ${month(a)} ${a.getFullYear()}`
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ${month(b)} ${b.getFullYear()}`
  }
  return `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)} ${b.getFullYear()}`
}

export function formatClock(d: Date): string {
  return fmtTime.format(d)
}

/** "Hoy", "Ayer", "Mañana" o "jue 3 dic". */
export function formatRelativeDay(iso: string, today = todayISO()): string {
  const diff = diffDays(today, iso)
  if (diff === 0) return 'Hoy'
  if (diff === -1) return 'Ayer'
  if (diff === 1) return 'Mañana'
  const d = parseISODate(iso)
  return `${clean(fmtWeekdayShort.format(d))} ${d.getDate()} ${clean(new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d))}`
}

/** "hace 5 min", "hace 2 h", "ayer, 23:40", "3 dic, 18:05" */
export function formatAgo(ms: number, nowMs = Date.now()): string {
  const diff = Math.max(0, nowMs - ms)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  const d = new Date(ms)
  const dayDiff = diffDays(toISODate(d), toISODate(new Date(nowMs)))
  if (dayDiff === 0) return `hace ${h} h`
  if (dayDiff === 1) return `ayer, ${formatClock(d)}`
  return `${formatDayMonth(toISODate(d))}, ${formatClock(d)}`
}

/** "en 45 min", "en 2 h 10 min", "mañana 09:30", "en 3 días" */
export function formatUntil(target: Date, now = new Date()): string {
  const diffMin = Math.round((target.getTime() - now.getTime()) / 60_000)
  if (diffMin <= 0) return 'ahora'
  if (diffMin < 60) return `en ${diffMin} min`
  const days = diffDays(toISODate(now), toISODate(target))
  if (days === 0) {
    const h = Math.floor(diffMin / 60)
    const m = diffMin % 60
    return m ? `en ${h} h ${m} min` : `en ${h} h`
  }
  if (days === 1) return `mañana ${formatClock(target)}`
  return `en ${days} días`
}
