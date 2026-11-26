/**
 * Modelo de datos de un viaje.
 *
 * Todo el viaje es un único documento JSON (`Trip`) formado por colecciones de
 * entidades. Cada entidad lleva `id` y `updatedAt`, y los borrados dejan una
 * "lápida" en `tombstones`. Así dos copias del mismo viaje (otra pestaña, otro
 * móvil o una base de datos en tiempo real) se pueden fusionar entidad a entidad
 * sin perder cambios: ver `data/merge.ts`.
 */

export type ID = string

export interface Entity {
  id: ID
  /** Marca de tiempo (ms) de la última modificación. */
  updatedAt: number
}

export interface Member extends Entity {
  name: string
  color: string
  /** Teléfono para Bizum (opcional). */
  bizum?: string
  /** Usuario de Revolut, p. ej. @laura (opcional). */
  revolut?: string
  joinedAt: number
}

export interface Accommodation {
  name: string
  address: string
  phone?: string
  checkIn?: string
  checkOut?: string
  notes?: string
}

export interface TripMeta {
  name: string
  destination: string
  emoji: string
  /** Fechas locales en formato YYYY-MM-DD. */
  startDate: string
  endDate: string
  /** Código para unirse al viaje (6 caracteres). */
  code: string
  accommodation: Accommodation
  /** Frase para enseñar al taxista en el idioma local (opcional). */
  taxiPhrase?: string
  isDemo?: boolean
  createdAt: number
  updatedAt: number
}

export interface RatesTable {
  base: 'EUR'
  /** Unidades de cada divisa por 1 EUR. */
  values: Record<string, number>
  source: 'aproximado' | 'online' | 'manual'
  /** Fecha de los tipos publicados (online). */
  date?: string
  updatedAt: number
}

export type ActivityTag = 'transporte' | 'comida' | 'ocio' | 'alojamiento'

export interface Activity extends Entity {
  date: string
  /** HH:MM o cadena vacía si no tiene hora. */
  time: string
  title: string
  location: string
  notes: string
  tag: ActivityTag
  order: number
  proposalId?: ID
  createdBy: ID
}

export type ProposalKind = 'plan' | 'restaurante'

export interface Proposal extends Entity {
  title: string
  kind: ProposalKind
  description: string
  location: string
  link: string
  price: string
  createdBy: ID
  createdAt: number
  /** Decisión manual que se impone al recuento. */
  decision: 'aprobada' | 'descartada' | null
  /** Actividad creada a partir de la propuesta. */
  activityId?: ID
}

export type VoteValue = 'si' | 'no' | 'igual'

/** id = `${proposalId}:${memberId}` → un voto por persona y propuesta. */
export interface Vote extends Entity {
  proposalId: ID
  memberId: ID
  value: VoteValue
}

export interface Subgroup extends Entity {
  name: string
  emoji: string
  memberIds: ID[]
  /** Si existe, el subgrupo lo gestiona el organizador de coches. */
  carId?: ID
}

export type ExpenseCategory = 'comida' | 'transporte' | 'alojamiento' | 'ocio' | 'compras' | 'otros'

export type Split =
  | { mode: 'iguales'; memberIds: ID[] }
  /** Importes en la divisa del gasto. */
  | { mode: 'exacto'; shares: Record<ID, number> }
  /** Se guarda una copia de los miembros: el gasto no cambia si luego cambia el subgrupo. */
  | { mode: 'subgrupo'; subgroupId: ID; subgroupName: string; memberIds: ID[] }

export type SplitMode = Split['mode']

export interface Expense extends Entity {
  title: string
  /** Importe en `currency`. */
  amount: number
  currency: string
  /** Unidades de `currency` por 1 EUR en el momento del gasto. */
  rate: number
  paidBy: ID
  split: Split
  category: ExpenseCategory
  date: string
  createdBy: ID
  createdAt: number
}

export interface Settlement extends Entity {
  from: ID
  to: ID
  amountCents: number
  date: string
  note: string
  createdBy: ID
  createdAt: number
}

export type DocCategory = 'transporte' | 'alojamiento' | 'entradas' | 'coche' | 'otros'

export interface FileRef {
  id: ID
  name: string
  type: string
  size: number
  addedAt: number
  addedBy: ID
}

export interface TripDocument extends Entity {
  title: string
  category: DocCategory
  code: string
  link: string
  notes: string
  date: string
  /** Para quién es (p. ej. la tarjeta de embarque de Laura). Vacío = para todos. */
  memberId?: ID
  files: FileRef[]
  createdBy: ID
  createdAt: number
}

export interface ChecklistItem extends Entity {
  title: string
  assigneeId?: ID
  done: boolean
  createdBy: ID
  createdAt: number
}

export interface DriveShift {
  id: ID
  label: string
  date: string
  driverId?: ID
}

export interface Car extends Entity {
  name: string
  model: string
  plate: string
  seats: number
  passengerIds: ID[]
  driverIds: ID[]
  shifts: DriveShift[]
  /** Subgrupo de gastos vinculado (gasolina, peajes, parking…). */
  subgroupId: ID
  createdAt: number
}

export interface Quote extends Entity {
  text: string
  /** Miembro que lo dijo… */
  authorId?: ID
  /** …o un nombre libre (el camarero, un desconocido…). */
  authorName?: string
  context: string
  /** Fecha y hora ISO. */
  saidAt: string
  createdBy: ID
}

/** id = `${quoteId}:${memberId}` */
export interface Reaction extends Entity {
  quoteId: ID
  memberId: ID
  emoji: string
}

export type ChallengeKind = 'contador' | 'bingo'

export interface BingoCell {
  id: ID
  text: string
}

export interface Challenge extends Entity {
  title: string
  emoji: string
  kind: ChallengeKind
  description: string
  cells: BingoCell[]
  createdBy: ID
  createdAt: number
}

/** id = `${challengeId}:${memberId}` */
export interface Score extends Entity {
  challengeId: ID
  memberId: ID
  value: number
}

/** id = `${challengeId}:${cellId}` */
export interface BingoMark extends Entity {
  challengeId: ID
  cellId: ID
  memberId: ID
  at: number
}

export interface Trip {
  id: ID
  schema: 1
  meta: TripMeta
  rates: RatesTable
  members: Member[]
  activities: Activity[]
  proposals: Proposal[]
  votes: Vote[]
  subgroups: Subgroup[]
  expenses: Expense[]
  settlements: Settlement[]
  documents: TripDocument[]
  checklist: ChecklistItem[]
  cars: Car[]
  quotes: Quote[]
  reactions: Reaction[]
  challenges: Challenge[]
  scores: Score[]
  bingoMarks: BingoMark[]
  /** id de entidad borrada → momento del borrado. */
  tombstones: Record<ID, number>
  updatedAt: number
}

export const COLLECTIONS = [
  'members',
  'activities',
  'proposals',
  'votes',
  'subgroups',
  'expenses',
  'settlements',
  'documents',
  'checklist',
  'cars',
  'quotes',
  'reactions',
  'challenges',
  'scores',
  'bingoMarks',
] as const satisfies readonly (keyof Trip)[]

export type CollectionKey = (typeof COLLECTIONS)[number]
export type EntityOf<K extends CollectionKey> = Trip[K][number]

export interface TripSummary {
  id: ID
  name: string
  destination: string
  emoji: string
  startDate: string
  endDate: string
  code: string
  isDemo: boolean
  memberCount: number
  updatedAt: number
}
