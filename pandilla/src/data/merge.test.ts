import { describe, expect, it } from 'vitest'
import { addMember, castVote, put, drop, updateMeta } from './actions'
import { mergeTrips } from './merge'
import { buildDemoTrip } from './seed'
import { LocalTripRepository } from './localRepository'
import { MemoryStorage } from './testUtils'

const base = () => buildDemoTrip('2026-12-06').trip

describe('fusión de copias del viaje', () => {
  it('conserva lo que cada copia añadió por su cuenta', () => {
    const original = base()
    const a = addMember(original, 'Sergio').trip
    const b = put(original, 'quotes', { id: 'q_new', text: 'Hola', context: '', saidAt: new Date().toISOString(), createdBy: 'm_laura' })
    const merged = mergeTrips(a, b)
    expect(merged.members.some((m) => m.name === 'Sergio')).toBe(true)
    expect(merged.quotes.some((q) => q.id === 'q_new')).toBe(true)
    expect(mergeTrips(b, a).members.length).toBe(merged.members.length)
  })

  it('respeta los borrados y gana la edición más reciente', () => {
    const original = base()
    const a = drop(original, 'checklist', ['c_1'])
    const b = put(original, 'checklist', { ...original.checklist[1], title: 'Altavoz grande' })
    const merged = mergeTrips(a, b)
    expect(merged.checklist.find((c) => c.id === 'c_1')).toBeUndefined()
    expect(merged.checklist.find((c) => c.id === 'c_2')?.title).toBe('Altavoz grande')
  })

  it('una edición posterior al borrado lo recupera', () => {
    const original = base()
    const deleted = drop(original, 'checklist', ['c_3'])
    const edited = put(deleted, 'checklist', { ...original.checklist[2], title: 'Cargador (recuperado)' })
    const merged = mergeTrips(deleted, edited)
    expect(merged.checklist.find((c) => c.id === 'c_3')?.title).toBe('Cargador (recuperado)')
  })

  it('los votos de distintas personas no se pisan', () => {
    const original = base()
    const a = castVote(original, 'p_cave', 'm_pablo', 'si')
    const b = castVote(original, 'p_cave', 'm_marta', 'si')
    const merged = mergeTrips(a, b)
    const votes = merged.votes.filter((v) => v.proposalId === 'p_cave')
    expect(votes.find((v) => v.memberId === 'm_pablo')?.value).toBe('si')
    expect(votes.find((v) => v.memberId === 'm_marta')?.value).toBe('si')
  })

  it('los datos del viaje se resuelven por la versión más reciente', () => {
    const original = base()
    const a = updateMeta(original, { name: 'Islandia 2026' })
    const b = updateMeta(a, { destination: 'Islandia' })
    expect(mergeTrips(a, b).meta.destination).toBe('Islandia')
  })
})

describe('repositorio local', () => {
  it('fusiona si otra pestaña escribió entre medias', async () => {
    const storage = new MemoryStorage()
    const tabA = new LocalTripRepository(storage)
    const tabB = new LocalTripRepository(storage)
    const trip = base()
    await tabA.saveTrip(trip)
    const fromB = (await tabB.getTrip(trip.id))!
    await tabB.saveTrip(addMember(fromB, 'Nuevo en B').trip)
    const saved = await tabA.saveTrip(addMember(trip, 'Nuevo en A').trip)
    const names = saved.members.map((m) => m.name)
    expect(names).toContain('Nuevo en A')
    expect(names).toContain('Nuevo en B')
    expect((await tabA.findByCode('aurora'))?.id).toBe(trip.id)
  })
})
