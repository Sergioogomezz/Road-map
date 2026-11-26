import {
  BedDouble,
  CarFront,
  Paperclip,
  Plane,
  Receipt,
  ShoppingBag,
  Ticket,
  TramFront,
  Utensils,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityTag, DocCategory, ExpenseCategory } from '../domain/types'

interface Meta {
  label: string
  icon: LucideIcon
  /** Fondo suave + texto. */
  chip: string
  /** Color sólido (puntos, barras). */
  dot: string
}

export const ACTIVITY_TAGS: Record<ActivityTag, Meta> = {
  transporte: { label: 'Transporte', icon: TramFront, chip: 'bg-sky-500/12 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  comida: { label: 'Comida', icon: Utensils, chip: 'bg-orange-500/12 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  ocio: { label: 'Ocio', icon: Sparkles, chip: 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-500' },
  alojamiento: { label: 'Alojamiento', icon: BedDouble, chip: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
}

export const ACTIVITY_TAG_LIST = Object.keys(ACTIVITY_TAGS) as ActivityTag[]

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, Meta> = {
  comida: { label: 'Comida', icon: Utensils, chip: 'bg-orange-500/12 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  transporte: { label: 'Transporte', icon: CarFront, chip: 'bg-sky-500/12 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  alojamiento: { label: 'Alojamiento', icon: BedDouble, chip: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  ocio: { label: 'Ocio', icon: Ticket, chip: 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-500' },
  compras: { label: 'Compras', icon: ShoppingBag, chip: 'bg-amber-500/14 text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
  otros: { label: 'Otros', icon: Receipt, chip: 'bg-slate-500/12 text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
}

export const EXPENSE_CATEGORY_LIST = Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]

export const DOC_CATEGORIES: Record<DocCategory, Meta & { short: string }> = {
  transporte: { label: 'Vuelos y transporte', short: 'Vuelos', icon: Plane, chip: 'bg-sky-500/12 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  alojamiento: { label: 'Alojamiento', short: 'Alojamiento', icon: BedDouble, chip: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  entradas: { label: 'Entradas', short: 'Entradas', icon: Ticket, chip: 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-500' },
  coche: { label: 'Alquiler de coche', short: 'Coche', icon: CarFront, chip: 'bg-amber-500/14 text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
  otros: { label: 'Otros', short: 'Otros', icon: Paperclip, chip: 'bg-slate-500/12 text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
}

export const DOC_CATEGORY_LIST = Object.keys(DOC_CATEGORIES) as DocCategory[]

export const TRIP_EMOJIS = ['🧳', '🏖️', '🏔️', '🌋', '🏙️', '🏕️', '🚐', '✈️', '🎉', '🍷', '🎿', '🌴', '🏰', '🚂']
