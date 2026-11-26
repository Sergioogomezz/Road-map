/**
 * Mutaciones del viaje: funciones puras (Trip → Trip). Cada cambio sella la
 * entidad con `updatedAt` y cada borrado deja una lápida, lo que permite
 * fusionar copias del viaje sin conflictos.
 */
import { now, uid } from '../domain/ids'
import { byOrder, byTime, orderForInsert } from '../domain/itinerary'
import type {
  Accommodation,
  Activity,
  ActivityTag,
  Car,
  ChecklistItem,
  CollectionKey,
  Entity,
  EntityOf,
  ID,
  Member,
  Proposal,
  Quote,
  RatesTable,
  Settlement,
  Subgroup,
  Trip,
  TripMeta,
  VoteValue,
} from '../domain/types'

type Draft<T extends Entity> = Omit<T, 'updatedAt'> & { updatedAt?: number }

export function put<K extends CollectionKey>(trip: Trip, key: K, item: Draft<EntityOf<K>>): Trip {
  const t = now()
  const stamped = { ...item, updatedAt: t } as Entity
  const list = trip[key] as Entity[]
  const idx = list.findIndex((e) => e.id === item.id)
  const next = idx === -1 ? [...list, stamped] : list.map((e, i) => (i === idx ? stamped : e))
  return { ...trip, [key]: next, updatedAt: t } as Trip
}

export function putMany<K extends CollectionKey>(trip: Trip, key: K, items: Draft<EntityOf<K>>[]): Trip {
  return items.reduce((acc, item) => put(acc, key, item), trip)
}

export function drop<K extends CollectionKey>(trip: Trip, key: K, ids: ID[]): Trip {
  if (!ids.length) return trip
  const t = now()
  const gone = new Set(ids)
  const tombstones = { ...trip.tombstones }
  for (const id of ids) tombstones[id] = t
  const next = (trip[key] as Entity[]).filter((e) => !gone.has(e.id))
  return { ...trip, [key]: next, tombstones, updatedAt: t } as Trip
}

function patchEntity<K extends CollectionKey>(trip: Trip, key: K, id: ID, patch: Partial<EntityOf<K>>): Trip {
  const current = (trip[key] as Entity[]).find((e) => e.id === id)
  if (!current) return trip
  return put(trip, key, { ...current, ...patch, id } as Draft<EntityOf<K>>)
}

// ─── Viaje ────────────────────────────────────────────────────────────────

export function updateMeta(trip: Trip, patch: Partial<Omit<TripMeta, 'updatedAt' | 'createdAt'>>): Trip {
  const t = now()
  return { ...trip, meta: { ...trip.meta, ...patch, updatedAt: t }, updatedAt: t }
}

export function updateAccommodation(trip: Trip, patch: Partial<Accommodation>): Trip {
  return updateMeta(trip, { accommodation: { ...trip.meta.accommodation, ...patch } })
}

export function setRates(trip: Trip, values: Record<string, number>, source: RatesTable['source'], date?: string): Trip {
  const t = now()
  return {
    ...trip,
    rates: { base: 'EUR', values: { ...trip.rates.values, ...values, EUR: 1 }, source, date, updatedAt: t },
    updatedAt: t,
  }
}

// ─── Miembros ─────────────────────────────────────────────────────────────

export const MEMBER_COLORS = ['#6E56CF', '#E5484D', '#0F9F8F', '#E8590C', '#2F6FEB', '#D6409F', '#2B9A66', '#B7791F', '#3E63DD', '#8E4EC6']

export function nextMemberColor(trip: Trip): string {
  const used = new Set(trip.members.map((m) => m.color))
  return MEMBER_COLORS.find((c) => !used.has(c)) ?? MEMBER_COLORS[trip.members.length % MEMBER_COLORS.length]
}

export function addMember(trip: Trip, name: string): { trip: Trip; member: Member } {
  const t = now()
  const member: Member = { id: uid('m'), name: name.trim(), color: nextMemberColor(trip), joinedAt: t, updatedAt: t }
  return { trip: put(trip, 'members', member), member }
}

export function updateMember(trip: Trip, id: ID, patch: Partial<Omit<Member, 'id'>>): Trip {
  return patchEntity(trip, 'members', id, patch)
}

/** Motivos por los que no conviene borrar a alguien (tiene dinero de por medio). */
export function memberBlockers(trip: Trip, id: ID): string[] {
  const out: string[] = []
  const paid = trip.expenses.filter((e) => e.paidBy === id).length
  const included = trip.expenses.filter(
    (e) => e.paidBy !== id && (e.split.mode === 'exacto' ? (e.split.shares[id] ?? 0) > 0 : e.split.memberIds.includes(id)),
  ).length
  const settlements = trip.settlements.filter((s) => s.from === id || s.to === id).length
  if (paid) out.push(`ha pagado ${paid} gasto${paid > 1 ? 's' : ''}`)
  if (included) out.push(`participa en ${included} gasto${included > 1 ? 's' : ''}`)
  if (settlements) out.push(`tiene ${settlements} pago${settlements > 1 ? 's' : ''} registrado${settlements > 1 ? 's' : ''}`)
  return out
}

export function removeMember(trip: Trip, id: ID): Trip {
  let next = drop(trip, 'members', [id])
  next = drop(next, 'votes', next.votes.filter((v) => v.memberId === id).map((v) => v.id))
  next = drop(next, 'reactions', next.reactions.filter((r) => r.memberId === id).map((r) => r.id))
  next = drop(next, 'scores', next.scores.filter((s) => s.memberId === id).map((s) => s.id))
  for (const g of next.subgroups.filter((g) => !g.carId && g.memberIds.includes(id))) {
    next = put(next, 'subgroups', { ...g, memberIds: g.memberIds.filter((m) => m !== id) })
  }
  for (const car of next.cars.filter((c) => c.passengerIds.includes(id))) {
    next = saveCar(next, { ...car, passengerIds: car.passengerIds.filter((m) => m !== id) })
  }
  for (const item of next.checklist.filter((i) => i.assigneeId === id)) {
    next = put(next, 'checklist', { ...item, assigneeId: undefined, done: false })
  }
  return next
}

// ─── Itinerario ───────────────────────────────────────────────────────────

export function saveActivity(trip: Trip, activity: Draft<Activity>): Trip {
  const existing = trip.activities.find((a) => a.id === activity.id)
  let order = activity.order
  const movedOrRetimed = !existing || existing.date !== activity.date || existing.time !== activity.time
  if (movedOrRetimed) {
    const day = trip.activities.filter((a) => a.date === activity.date && a.id !== activity.id)
    order = orderForInsert(day, activity.time)
  }
  return put(trip, 'activities', { ...activity, order })
}

export function deleteActivity(trip: Trip, id: ID): Trip {
  let next = drop(trip, 'activities', [id])
  for (const p of next.proposals.filter((p) => p.activityId === id)) {
    next = put(next, 'proposals', { ...p, activityId: undefined })
  }
  return next
}

/** Deshace un borrado: recupera la actividad y su vínculo con la votación. */
export function restoreActivity(trip: Trip, activity: Activity): Trip {
  let next = put(trip, 'activities', activity)
  const p = next.proposals.find((x) => x.id === activity.proposalId)
  if (p && !p.activityId) next = put(next, 'proposals', { ...p, activityId: activity.id })
  return next
}

export function reorderDay(trip: Trip, date: string, orderedIds: ID[]): Trip {
  let next = trip
  orderedIds.forEach((id, i) => {
    const a = next.activities.find((x) => x.id === id && x.date === date)
    const order = (i + 1) * 1000
    if (a && a.order !== order) next = put(next, 'activities', { ...a, order })
  })
  return next
}

export function sortDayByTime(trip: Trip, date: string): Trip {
  const day = trip.activities.filter((a) => a.date === date).sort(byTime)
  return reorderDay(trip, date, day.map((a) => a.id))
}

export function moveActivity(trip: Trip, id: ID, direction: -1 | 1): Trip {
  const a = trip.activities.find((x) => x.id === id)
  if (!a) return trip
  const day = trip.activities.filter((x) => x.date === a.date).sort(byOrder)
  const i = day.findIndex((x) => x.id === id)
  const j = i + direction
  if (j < 0 || j >= day.length) return trip
  const ids = day.map((x) => x.id)
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  return reorderDay(trip, a.date, ids)
}

// ─── Votaciones ───────────────────────────────────────────────────────────

export function saveProposal(trip: Trip, proposal: Draft<Proposal>): Trip {
  return put(trip, 'proposals', proposal)
}

export function deleteProposal(trip: Trip, id: ID): Trip {
  const next = drop(trip, 'proposals', [id])
  return drop(next, 'votes', next.votes.filter((v) => v.proposalId === id).map((v) => v.id))
}

/** Votar lo mismo otra vez retira el voto. */
export function castVote(trip: Trip, proposalId: ID, memberId: ID, value: VoteValue): Trip {
  const id = `${proposalId}:${memberId}`
  const existing = trip.votes.find((v) => v.id === id)
  if (existing?.value === value) return drop(trip, 'votes', [id])
  return put(trip, 'votes', { id, proposalId, memberId, value })
}

export function decideProposal(trip: Trip, id: ID, decision: Proposal['decision']): Trip {
  return patchEntity(trip, 'proposals', id, { decision })
}

export function scheduleProposal(
  trip: Trip,
  proposalId: ID,
  slot: { date: string; time: string; tag: ActivityTag },
  memberId: ID,
): { trip: Trip; activityId: ID } {
  const p = trip.proposals.find((x) => x.id === proposalId)
  if (!p) return { trip, activityId: '' }
  const notes = [p.description, p.price && `Precio: ${p.price}`, p.link].filter(Boolean).join('\n')
  const activityId = uid('a')
  let next = saveActivity(trip, {
    id: activityId,
    date: slot.date,
    time: slot.time,
    title: p.title,
    location: p.location,
    notes,
    tag: slot.tag,
    order: 0,
    proposalId: p.id,
    createdBy: memberId,
  })
  next = put(next, 'proposals', { ...p, activityId, decision: p.decision ?? 'aprobada' })
  return { trip: next, activityId }
}

// ─── Gastos ───────────────────────────────────────────────────────────────

export function saveSubgroup(trip: Trip, group: Draft<Subgroup>): Trip {
  return put(trip, 'subgroups', group)
}

export function deleteSubgroup(trip: Trip, id: ID): Trip {
  return drop(trip, 'subgroups', [id])
}

export function addSettlement(trip: Trip, s: Omit<Settlement, 'id' | 'updatedAt' | 'createdAt'>): { trip: Trip; id: ID } {
  const id = uid('s')
  return { trip: put(trip, 'settlements', { ...s, id, createdAt: now() }), id }
}

// ─── Checklist ────────────────────────────────────────────────────────────

export function addChecklistItem(trip: Trip, title: string, by: ID): Trip {
  const item: Draft<ChecklistItem> = { id: uid('c'), title: title.trim(), done: false, createdBy: by, createdAt: now() }
  return put(trip, 'checklist', item)
}

export function updateChecklistItem(trip: Trip, id: ID, patch: Partial<ChecklistItem>): Trip {
  return patchEntity(trip, 'checklist', id, patch)
}

// ─── Coches ───────────────────────────────────────────────────────────────

/**
 * Guarda un coche y mantiene su subgrupo de gastos con los mismos ocupantes.
 * Una persona solo puede ir en un coche: si se añade aquí, sale del anterior.
 */
export function saveCar(trip: Trip, car: Draft<Car>): Trip {
  let next = trip
  for (const other of next.cars.filter((c) => c.id !== car.id)) {
    const passengerIds = other.passengerIds.filter((id) => !car.passengerIds.includes(id))
    if (passengerIds.length !== other.passengerIds.length) {
      const updated = { ...other, passengerIds, driverIds: other.driverIds.filter((id) => passengerIds.includes(id)) }
      next = put(next, 'cars', updated)
      const g = next.subgroups.find((s) => s.id === other.subgroupId)
      if (g) next = put(next, 'subgroups', { ...g, memberIds: passengerIds })
    }
  }
  const driverIds = car.driverIds.filter((id) => car.passengerIds.includes(id))
  const existingGroup = next.subgroups.find((s) => s.id === car.subgroupId)
  next = put(next, 'subgroups', {
    id: car.subgroupId,
    name: car.name,
    emoji: existingGroup?.emoji ?? '🚗',
    memberIds: car.passengerIds,
    carId: car.id,
  })
  return put(next, 'cars', { ...car, driverIds })
}

export function deleteCar(trip: Trip, id: ID): Trip {
  const car = trip.cars.find((c) => c.id === id)
  if (!car) return trip
  return drop(drop(trip, 'cars', [id]), 'subgroups', [car.subgroupId])
}

// ─── Social ───────────────────────────────────────────────────────────────

export function saveQuote(trip: Trip, quote: Draft<Quote>): Trip {
  return put(trip, 'quotes', quote)
}

export function deleteQuote(trip: Trip, id: ID): Trip {
  const next = drop(trip, 'quotes', [id])
  return drop(next, 'reactions', next.reactions.filter((r) => r.quoteId === id).map((r) => r.id))
}

/** Una reacción por persona y frase; repetir el mismo emoji la quita. */
export function toggleReaction(trip: Trip, quoteId: ID, memberId: ID, emoji: string): Trip {
  const id = `${quoteId}:${memberId}`
  const existing = trip.reactions.find((r) => r.id === id)
  if (existing?.emoji === emoji) return drop(trip, 'reactions', [id])
  return put(trip, 'reactions', { id, quoteId, memberId, emoji })
}

export function deleteChallenge(trip: Trip, id: ID): Trip {
  let next = drop(trip, 'challenges', [id])
  next = drop(next, 'scores', next.scores.filter((s) => s.challengeId === id).map((s) => s.id))
  return drop(next, 'bingoMarks', next.bingoMarks.filter((m) => m.challengeId === id).map((m) => m.id))
}

export function bumpScore(trip: Trip, challengeId: ID, memberId: ID, delta: number): Trip {
  const id = `${challengeId}:${memberId}`
  const current = trip.scores.find((s) => s.id === id)?.value ?? 0
  const value = Math.max(0, current + delta)
  if (value === current) return trip
  return put(trip, 'scores', { id, challengeId, memberId, value })
}

export function resetScores(trip: Trip, challengeId: ID): Trip {
  return drop(trip, 'scores', trip.scores.filter((s) => s.challengeId === challengeId).map((s) => s.id))
}

export function markCell(trip: Trip, challengeId: ID, cellId: ID, memberId: ID | null): Trip {
  const id = `${challengeId}:${cellId}`
  if (!memberId) return drop(trip, 'bingoMarks', [id])
  return put(trip, 'bingoMarks', { id, challengeId, cellId, memberId, at: now() })
}
