/**
 * Viaje de ejemplo: Islandia, 4 días, 5 amigos.
 * Las fechas son relativas a hoy (el viaje empezó ayer) para que el panel de
 * inicio, la próxima actividad y los saldos tengan sentido en cualquier momento.
 */
import { addDays, atLocal, formatDayMonth, todayISO } from '../domain/dates'
import { DEFAULT_RATES } from '../domain/currency'
import type {
  Activity,
  ActivityTag,
  BingoMark,
  Car,
  Challenge,
  ChecklistItem,
  Expense,
  FileRef,
  Member,
  Proposal,
  Quote,
  Reaction,
  Score,
  Settlement,
  Split,
  Subgroup,
  Trip,
  TripDocument,
  Vote,
  VoteValue,
} from '../domain/types'
import { boardingPassSvg, ticketSvg } from './demoAssets'
import { emptyTrip } from './tripModel'

export const DEMO_TRIP_ID = 'demo-islandia'
export const DEMO_CODE = 'AURORA'

export interface DemoFile {
  id: string
  blob: Blob
}

const ISK = 146.3

export function buildDemoTrip(today = todayISO()): { trip: Trip; files: DemoFile[] } {
  const D1 = addDays(today, -1)
  const D2 = today
  const D3 = addDays(today, 1)
  const D4 = addDays(today, 2)
  const t0 = Date.now()
  const at = (date: string, time = '12:00') => atLocal(date, time).getTime()

  const LAURA = 'm_laura'
  const PABLO = 'm_pablo'
  const MARTA = 'm_marta'
  const DANI = 'm_dani'
  const IRENE = 'm_irene'
  const ALL = [LAURA, PABLO, MARTA, DANI, IRENE]

  const members: Member[] = [
    { id: LAURA, name: 'Laura', color: '#6E56CF', joinedAt: at(D1, '00:00') - 40 * 86_400_000, updatedAt: t0 },
    { id: PABLO, name: 'Pablo', color: '#E8590C', joinedAt: at(D1, '00:00') - 40 * 86_400_000, updatedAt: t0 },
    { id: MARTA, name: 'Marta', color: '#0F9F8F', joinedAt: at(D1, '00:00') - 39 * 86_400_000, updatedAt: t0 },
    { id: DANI, name: 'Dani', color: '#2F6FEB', joinedAt: at(D1, '00:00') - 39 * 86_400_000, updatedAt: t0 },
    { id: IRENE, name: 'Irene', color: '#D6409F', joinedAt: at(D1, '00:00') - 38 * 86_400_000, updatedAt: t0 },
  ]

  const home = 'Grettisgata 54, 101 Reykjavík, Islandia'
  const trip = emptyTrip(DEMO_TRIP_ID, {
    name: 'Islandia con la pandilla',
    destination: 'Reikiavik, Islandia',
    emoji: '🌋',
    startDate: D1,
    endDate: D4,
    code: DEMO_CODE,
    accommodation: {
      name: 'Apartamento Grettisgata (Airbnb)',
      address: home,
      checkIn: '16:00',
      checkOut: '11:00',
      notes: 'Caja de llaves junto a la puerta · código 4721',
    },
    taxiPhrase: 'Vinsamlegast keyrðu mig hingað',
    isDemo: true,
    createdAt: at(D1) - 40 * 86_400_000,
    updatedAt: t0,
  })
  trip.rates = { base: 'EUR', values: { ...DEFAULT_RATES, ISK }, source: 'aproximado', updatedAt: t0 }
  trip.members = members

  // ── Itinerario ──────────────────────────────────────────────────────────
  let order = 0
  const act = (
    date: string,
    time: string,
    title: string,
    tag: ActivityTag,
    location: string,
    notes = '',
    extra: Partial<Activity> = {},
  ): Activity => ({
    id: `a_${++order}`,
    date,
    time,
    title,
    tag,
    location,
    notes,
    order: order * 1000,
    createdBy: LAURA,
    updatedAt: t0,
    ...extra,
  })

  const fridheimar = act(D2, '14:30', 'Comida en Friðheimar', 'comida', 'Friðheimar, Reykholt, Islandia', 'El invernadero de tomates. Mesa reservada a las 14:30.', { proposalId: 'p_fridheimar' })

  trip.activities = [
    act(D1, '06:45', 'Vuelo Madrid → Keflavík', 'transporte', 'Aeropuerto Adolfo Suárez Madrid-Barajas', 'Facturar antes de las 05:45. Las tarjetas de embarque están en la Bóveda.'),
    act(D1, '10:40', 'Recogida de los coches de alquiler', 'transporte', 'Keflavík International Airport', 'Reserva BCR-88213 · 2 coches. Hacer fotos de los rasguños antes de salir.'),
    act(D1, '12:30', 'Blue Lagoon', 'ocio', 'Blue Lagoon, Grindavík, Islandia', 'Entrada a las 13:00. Irene pasa: se queda en la cafetería.'),
    act(D1, '16:30', 'Check-in en el apartamento', 'alojamiento', home, 'Caja de llaves: código 4721.'),
    act(D1, '18:00', 'Merienda: perritos en Bæjarins Beztu', 'comida', 'Bæjarins Beztu Pylsur, Reykjavík', 'Pedir «eina með öllu» (con todo).'),
    act(D1, '21:00', 'Cena en Sægreifinn (sopa de langosta)', 'comida', 'Sægreifinn, Geirsgata 8, Reykjavík', 'Cada uno paga lo suyo: apuntado con importes exactos.'),
    act(D1, '23:00', 'Cervezas en Kaldi Bar', 'ocio', 'Kaldi Bar, Laugavegur 20b, Reykjavík', 'Los que aguanten 🍻'),
    act(D2, '08:30', 'Salida hacia el Círculo Dorado', 'transporte', home, 'Coche 1 conduce Laura · Coche 2 conduce Dani.'),
    act(D2, '09:30', 'Parque Nacional de Þingvellir', 'ocio', 'Þingvellir National Park, Islandia', 'Paseo por la falla entre las dos placas tectónicas. Parking: 1.000 ISK por coche.'),
    act(D2, '12:00', 'Géiser Strokkur', 'ocio', 'Geysir, Islandia', 'Entra en erupción cada 5–10 minutos: móvil preparado.'),
    act(D2, '13:15', 'Cascada Gullfoss', 'ocio', 'Gullfoss, Islandia', 'Muy resbaladizo: ponerse los crampones.'),
    fridheimar,
    act(D2, '16:30', 'Secret Lagoon', 'ocio', 'Secret Lagoon, Flúðir, Islandia', 'Entradas en la Bóveda.'),
    act(D2, '20:00', 'Cena en el apartamento', 'comida', home, 'Pasta y lo que sobró del Bónus. Cocinan Marta y Pablo.'),
    act(D2, '22:30', 'Caza de auroras', 'ocio', 'Grótta Lighthouse, Seltjarnarnes, Islandia', 'Mirar la previsión en vedur.is: si el índice KP pasa de 3, salimos.'),
    act(D3, '08:00', 'Salida hacia la costa sur', 'transporte', home, 'Conducen Pablo y Marta.'),
    act(D3, '10:00', 'Cascada Seljalandsfoss', 'ocio', 'Seljalandsfoss, Islandia', 'Se puede pasar por detrás: chubasquero.'),
    act(D3, '11:15', 'Cascada Skógafoss', 'ocio', 'Skógafoss, Islandia'),
    act(D3, '13:00', 'Comida en Vík', 'comida', 'Vík í Mýrdal, Islandia'),
    act(D3, '14:30', 'Playa de arena negra de Reynisfjara', 'ocio', 'Reynisfjara Beach, Islandia', '¡Ojo con las olas! No acercarse a la orilla.'),
    act(D3, '18:30', 'Vuelta a Reikiavik', 'transporte', home, '2 h 30 min de coche. Conducen Laura y Dani.'),
    act(D4, '10:00', 'Check-out del apartamento', 'alojamiento', home, 'Dejar las llaves en la caja y sacar la basura.'),
    act(D4, '10:45', 'Paseo por Hallgrímskirkja y Harpa', 'ocio', 'Hallgrímskirkja, Reykjavík'),
    act(D4, '12:45', 'Devolver los coches', 'transporte', 'Keflavík International Airport', 'Con el depósito lleno.'),
    act(D4, '15:20', 'Vuelo Keflavík → Madrid', 'transporte', 'Keflavík International Airport', 'Embarque a las 14:40. Tarjetas de embarque en la Bóveda.'),
  ]

  // Orden inicial = orden cronológico dentro de cada día.
  const byDay = new Map<string, Activity[]>()
  for (const a of trip.activities) byDay.set(a.date, [...(byDay.get(a.date) ?? []), a])
  for (const list of byDay.values()) list.sort((x, y) => x.time.localeCompare(y.time)).forEach((a, i) => (a.order = (i + 1) * 1000))

  // ── Votaciones ──────────────────────────────────────────────────────────
  const proposal = (p: Omit<Proposal, 'updatedAt' | 'decision' | 'link'> & Partial<Proposal>): Proposal => ({
    decision: null,
    link: '',
    updatedAt: t0,
    ...p,
  })
  trip.proposals = [
    proposal({ id: 'p_kol', kind: 'restaurante', title: 'Cena de despedida en Kol', description: 'Cocina islandesa moderna. Menú degustación de unas 9.900 ISK.', location: 'Kol Restaurant, Skólavörðustígur 40, Reykjavík', price: '≈ 68 € p.p.', createdBy: MARTA, createdAt: at(D1, '22:10') }),
    proposal({ id: 'p_cave', kind: 'plan', title: 'Excursión a una cueva de hielo', description: 'Día completo desde Reikiavik hasta el glaciar Vatnajökull. Unas 5 h de bus por trayecto.', location: 'Vatnajökull, Islandia', price: '139 € p.p.', createdBy: DANI, createdAt: at(D1, '20:05') }),
    proposal({ id: 'p_horses', kind: 'plan', title: 'Paseo a caballo islandés', description: 'Hora y media cerca de Reikiavik. Recogen en el apartamento.', location: 'Hafnarfjörður, Islandia', price: '≈ 95 € p.p.', createdBy: IRENE, createdAt: at(D1, '19:30') }),
    proposal({ id: 'p_hakarl', kind: 'plan', title: '¿Probamos el tiburón fermentado (hákarl)?', description: 'Dicen que sabe a amoniaco. Por la experiencia.', location: '', price: '', createdBy: PABLO, createdAt: at(D1, '23:30') }),
    proposal({ id: 'p_brunch', kind: 'restaurante', title: 'Brunch en Sandholt', description: 'El último día, antes de devolver los coches.', location: 'Sandholt, Laugavegur 36, Reykjavík', price: '≈ 25 € p.p.', createdBy: LAURA, createdAt: at(D2, '07:50') - 3_600_000 }),
    proposal({ id: 'p_fridheimar', kind: 'restaurante', title: 'Comer en Friðheimar (invernadero de tomates)', description: 'Sopa de tomate ilimitada dentro de un invernadero.', location: 'Friðheimar, Reykholt, Islandia', price: '≈ 30 € p.p.', createdBy: IRENE, createdAt: at(D1) - 7 * 86_400_000, decision: 'aprobada', activityId: fridheimar.id }),
  ]
  const votes: [string, string, VoteValue][] = [
    ['p_kol', LAURA, 'si'], ['p_kol', PABLO, 'si'], ['p_kol', MARTA, 'si'], ['p_kol', DANI, 'igual'], ['p_kol', IRENE, 'si'],
    ['p_cave', DANI, 'si'], ['p_cave', IRENE, 'si'], ['p_cave', LAURA, 'no'], ['p_cave', MARTA, 'no'],
    ['p_horses', IRENE, 'si'], ['p_horses', MARTA, 'si'], ['p_horses', LAURA, 'igual'], ['p_horses', PABLO, 'no'],
    ['p_hakarl', PABLO, 'si'], ['p_hakarl', DANI, 'si'], ['p_hakarl', LAURA, 'no'], ['p_hakarl', MARTA, 'no'], ['p_hakarl', IRENE, 'no'],
    ['p_brunch', LAURA, 'si'], ['p_brunch', IRENE, 'si'],
    ...ALL.map((m): [string, string, VoteValue] => ['p_fridheimar', m, 'si']),
  ]
  trip.votes = votes.map(([proposalId, memberId, value]): Vote => ({ id: `${proposalId}:${memberId}`, proposalId, memberId, value, updatedAt: t0 }))

  // ── Subgrupos y coches ──────────────────────────────────────────────────
  trip.subgroups = [
    { id: 'g_car1', name: 'Coche 1', emoji: '🚙', memberIds: [PABLO, LAURA, IRENE], carId: 'car1', updatedAt: t0 },
    { id: 'g_car2', name: 'Coche 2', emoji: '🚗', memberIds: [MARTA, DANI], carId: 'car2', updatedAt: t0 },
    { id: 'g_beers', name: 'Los de las cervezas', emoji: '🍻', memberIds: [PABLO, DANI, IRENE], updatedAt: t0 },
  ] satisfies Subgroup[]

  const shift = (id: string, label: string, date: string, driverId: string) => ({ id, label, date, driverId })
  trip.cars = [
    {
      id: 'car1', name: 'Coche 1', model: 'Dacia Duster 4x4 blanco', plate: 'RX 482', seats: 5,
      passengerIds: [PABLO, LAURA, IRENE], driverIds: [PABLO, LAURA], subgroupId: 'g_car1', createdAt: at(D1) - 30 * 86_400_000, updatedAt: t0,
      shifts: [
        shift('sh1', 'Keflavík → Blue Lagoon → Reikiavik', D1, PABLO),
        shift('sh2', 'Círculo Dorado', D2, LAURA),
        shift('sh3', 'Costa sur (ida)', D3, PABLO),
        shift('sh4', 'Costa sur (vuelta)', D3, LAURA),
        shift('sh5', 'Reikiavik → Keflavík', D4, PABLO),
      ],
    },
    {
      id: 'car2', name: 'Coche 2', model: 'Toyota Yaris gris', plate: 'KT 915', seats: 5,
      passengerIds: [MARTA, DANI], driverIds: [MARTA, DANI], subgroupId: 'g_car2', createdAt: at(D1) - 30 * 86_400_000, updatedAt: t0,
      shifts: [
        shift('sh6', 'Keflavík → Blue Lagoon → Reikiavik', D1, MARTA),
        shift('sh7', 'Círculo Dorado', D2, DANI),
        shift('sh8', 'Costa sur (ida)', D3, MARTA),
        shift('sh9', 'Costa sur (vuelta)', D3, DANI),
        shift('sh10', 'Reikiavik → Keflavík', D4, MARTA),
      ],
    },
  ] satisfies Car[]

  // ── Gastos ──────────────────────────────────────────────────────────────
  let exp = 0
  const expense = (
    title: string,
    amount: number,
    currency: 'EUR' | 'ISK',
    paidBy: string,
    split: Split,
    category: Expense['category'],
    date: string,
    time = '12:00',
  ): Expense => ({
    id: `e_${++exp}`,
    title,
    amount,
    currency,
    rate: currency === 'EUR' ? 1 : ISK,
    paidBy,
    split,
    category,
    date,
    createdBy: paidBy,
    createdAt: at(date, time),
    updatedAt: t0,
  })
  const everyone: Split = { mode: 'iguales', memberIds: ALL }
  const car1: Split = { mode: 'subgrupo', subgroupId: 'g_car1', subgroupName: 'Coche 1', memberIds: [PABLO, LAURA, IRENE] }
  const car2: Split = { mode: 'subgrupo', subgroupId: 'g_car2', subgroupName: 'Coche 2', memberIds: [MARTA, DANI] }
  trip.expenses = [
    expense('Vuelos Madrid ⇄ Keflavík (5)', 945, 'EUR', LAURA, everyone, 'transporte', addDays(D1, -40), '21:15'),
    expense('Apartamento en Reikiavik (3 noches)', 1140, 'EUR', PABLO, everyone, 'alojamiento', addDays(D1, -35), '18:40'),
    expense('Alquiler de 2 coches (4 días)', 486, 'EUR', MARTA, everyone, 'transporte', addDays(D1, -30), '10:05'),
    expense('Entradas Blue Lagoon (4)', 340, 'EUR', DANI, { mode: 'iguales', memberIds: [LAURA, PABLO, MARTA, DANI] }, 'ocio', addDays(D1, -20), '13:30'),
    expense('Entradas Secret Lagoon (5)', 19000, 'ISK', IRENE, everyone, 'ocio', addDays(D1, -10), '09:20'),
    expense('Supermercado Bónus', 18640, 'ISK', IRENE, everyone, 'compras', D1, '15:50'),
    expense('Gasolina Coche 1', 14800, 'ISK', PABLO, car1, 'transporte', D1, '16:05'),
    expense('Perritos en Bæjarins Beztu', 4250, 'ISK', DANI, everyone, 'comida', D1, '18:20'),
    expense('Cena en Sægreifinn', 27700, 'ISK', LAURA, { mode: 'exacto', shares: { [LAURA]: 4900, [PABLO]: 6200, [MARTA]: 4900, [DANI]: 7800, [IRENE]: 3900 } }, 'comida', D1, '22:30'),
    expense('Cervezas en Kaldi Bar', 12600, 'ISK', PABLO, { mode: 'subgrupo', subgroupId: 'g_beers', subgroupName: 'Los de las cervezas', memberIds: [PABLO, DANI, IRENE] }, 'ocio', D1, '23:55'),
    expense('Parking Þingvellir (2 coches)', 2000, 'ISK', MARTA, everyone, 'transporte', D2, '09:35'),
    expense('Gasolina Coche 2', 9950, 'ISK', MARTA, car2, 'transporte', D2, '08:20'),
    expense('Cafés y bollos para el camino', 5300, 'ISK', MARTA, everyone, 'comida', D2, '08:10'),
  ]
  trip.settlements = [
    { id: 's_1', from: IRENE, to: LAURA, amountCents: 6000, date: D1, note: 'Adelanto por Bizum', createdBy: IRENE, createdAt: at(D1, '19:00'), updatedAt: t0 },
  ] satisfies Settlement[]

  // ── Bóveda ──────────────────────────────────────────────────────────────
  const files: DemoFile[] = []
  const svgFile = (id: string, name: string, svg: string, addedBy: string): FileRef => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    files.push({ id, blob })
    return { id, name, type: 'image/svg+xml', size: blob.size, addedAt: at(D1) - 2 * 86_400_000, addedBy }
  }
  const seats = ['14A', '14B', '14C', '15A', '15B']
  const passes = members.map((m, i) =>
    svgFile(
      `f_bp_${m.id}`,
      `Tarjeta de embarque · ${m.name}.svg`,
      boardingPassSvg({ name: m.name, seat: seats[i], flight: 'FI 0000', from: 'KEF', fromCity: 'Keflavík', to: 'MAD', toCity: 'Madrid', date: formatDayMonth(D4), boarding: '14:40', departure: '15:20', gate: 'D4', code: '7QK2LM' }),
      LAURA,
    ),
  )
  const secretTicket = svgFile('f_secret', 'Entradas Secret Lagoon.svg', ticketSvg({ title: 'Secret Lagoon', subtitle: 'Gamla Laugin · Flúðir', date: formatDayMonth(D2), people: '5 adultos', code: 'SL-20931' }), IRENE)

  const doc = (d: Omit<TripDocument, 'updatedAt' | 'link' | 'files' | 'createdAt'> & Partial<TripDocument>): TripDocument => ({
    link: '',
    files: [],
    createdAt: at(D1) - 20 * 86_400_000,
    updatedAt: t0,
    ...d,
  })
  trip.documents = [
    doc({ id: 'd_out', category: 'transporte', title: 'Vuelo de ida Madrid → Keflavík', code: '7QK2LM', date: D1, notes: 'Salida 06:45 · llegada 10:15 (hora local). Una maleta facturada por persona.', createdBy: LAURA }),
    doc({ id: 'd_back', category: 'transporte', title: 'Vuelo de vuelta Keflavík → Madrid', code: '7QK2LM', date: D4, notes: 'Salida 15:20 · embarque 14:40. Están las 5 tarjetas de embarque.', files: passes, createdBy: LAURA }),
    doc({ id: 'd_flat', category: 'alojamiento', title: 'Apartamento Grettisgata (Airbnb)', code: 'HMQ4X2TZ8P', link: 'https://www.airbnb.es/trips', date: D1, notes: 'Check-in 16:00 · check-out 11:00\nCaja de llaves junto a la puerta: 4721\nWifi: Grettis54 · clave: nordurljos2026', createdBy: PABLO }),
    doc({ id: 'd_blue', category: 'entradas', title: 'Blue Lagoon · entrada Comfort (4)', code: 'BL-552031', date: D1, notes: 'Entrada a las 13:00. Incluye toalla y una bebida.', createdBy: DANI }),
    doc({ id: 'd_secret', category: 'entradas', title: 'Secret Lagoon (5 personas)', code: 'SL-20931', date: D2, notes: 'Entrada libre a partir de las 16:00.', files: [secretTicket], createdBy: IRENE }),
    doc({ id: 'd_cars', category: 'coche', title: 'Alquiler de 2 coches · Keflavík', code: 'BCR-88213', date: D1, notes: 'Seguro a todo riesgo incluido. Devolver con el depósito lleno.\nConductores: Laura, Pablo, Marta y Dani.', createdBy: MARTA }),
    doc({ id: 'd_insurance', category: 'otros', title: 'Seguro de viaje', code: 'POL-4482910', date: '', notes: 'Asistencia 24 h: el teléfono está en la póliza.', createdBy: LAURA }),
  ]

  // ── Checklist ───────────────────────────────────────────────────────────
  let chk = 0
  const item = (title: string, assigneeId?: string, done = false): ChecklistItem => ({
    id: `c_${++chk}`,
    title,
    assigneeId,
    done,
    createdBy: LAURA,
    createdAt: at(D1) - (20 - chk) * 86_400_000,
    updatedAt: t0,
  })
  trip.checklist = [
    item('Botiquín (ibuprofeno, tiritas, biodramina)', IRENE, true),
    item('Altavoz bluetooth', DANI),
    item('Cargador de coche USB', PABLO, true),
    item('Baraja de cartas', LAURA, true),
    item('Termo para el café', MARTA),
    item('Powerbank', DANI, true),
    item('Crampones para el hielo'),
    item('Bolsas estancas para los móviles'),
    item('Regleta', MARTA, true),
    item('Juego de mesa', PABLO),
    item('Gorros y guantes de repuesto'),
    item('Toalla de microfibra', IRENE),
  ]

  // ── Social ──────────────────────────────────────────────────────────────
  trip.quotes = [
    { id: 'q_1', text: '¿Eso verde es una aurora? —No, Dani, es el letrero de la farmacia.', authorId: MARTA, context: 'Primera noche buscando auroras en pleno centro', saidAt: new Date(at(D1, '23:40')).toISOString(), createdBy: LAURA, updatedAt: t0 },
    { id: 'q_2', text: 'Un perrito de 900 coronas… ¿eso es mucho o poco?', authorId: IRENE, context: 'Cola de Bæjarins Beztu', saidAt: new Date(at(D1, '18:10')).toISOString(), createdBy: MARTA, updatedAt: t0 },
    { id: 'q_3', text: 'Me pido no conducir nunca más con viento lateral.', authorId: DANI, context: 'Volviendo de Grindavík', saidAt: new Date(at(D1, '15:40')).toISOString(), createdBy: DANI, updatedAt: t0 },
    { id: 'q_4', text: 'El GPS dice «gire en Þjóðvegur». Vale, ¿y eso cómo se pronuncia?', authorId: LAURA, context: 'Primer turno de conducción', saidAt: new Date(at(D1, '11:20')).toISOString(), createdBy: PABLO, updatedAt: t0 },
    { id: 'q_5', text: 'Yo con dos capas voy sobradísimo.', authorId: PABLO, context: 'Saliendo del aeropuerto a −4 °C. Duró tres minutos.', saidAt: new Date(at(D1, '10:55')).toISOString(), createdBy: IRENE, updatedAt: t0 },
  ] satisfies Quote[]
  const reactions: [string, string, string][] = [
    ['q_1', LAURA, '😂'], ['q_1', PABLO, '😂'], ['q_1', IRENE, '😂'], ['q_1', DANI, '💀'],
    ['q_2', PABLO, '😂'], ['q_2', MARTA, '❤️'],
    ['q_4', DANI, '😂'], ['q_4', MARTA, '😂'],
    ['q_5', MARTA, '😂'], ['q_5', LAURA, '🔥'],
  ]
  trip.reactions = reactions.map(([quoteId, memberId, emoji]): Reaction => ({ id: `${quoteId}:${memberId}`, quoteId, memberId, emoji, updatedAt: t0 }))

  trip.challenges = [
    { id: 'ch_late', kind: 'contador', emoji: '⏰', title: 'Retrasos al punto de encuentro', description: 'Cada vez que alguien llega tarde, +1. Quien más acumule paga la primera ronda.', cells: [], createdBy: MARTA, createdAt: at(D1) - 5 * 86_400_000, updatedAt: t0 },
    {
      id: 'ch_bingo', kind: 'bingo', emoji: '🎯', title: 'Bingo islandés', description: 'Marca cada reto cuando alguien lo consiga. ¡Línea y bingo!', createdBy: LAURA, createdAt: at(D1) - 5 * 86_400_000, updatedAt: t0,
      cells: [
        'Ver una aurora boreal',
        'Foto con un caballo islandés',
        'Probar el hákarl',
        'Decir «Eyjafjallajökull» a la primera',
        'Bañarse en aguas termales',
        'Alguien se resbala en el hielo',
        'Perder un guante',
        'Ver una cascada congelada',
        'Dormirse en el coche',
      ].map((text, i) => ({ id: `cell_${i + 1}`, text })),
    },
    { id: 'ch_cold', kind: 'contador', emoji: '🥶', title: '«¡Qué frío!»', description: 'Veces que cada uno se queja del frío.', cells: [], createdBy: DANI, createdAt: at(D1, '11:00'), updatedAt: t0 },
  ] satisfies Challenge[]
  const scores: [string, string, number][] = [
    ['ch_late', DANI, 3], ['ch_late', IRENE, 1], ['ch_late', PABLO, 1],
    ['ch_cold', PABLO, 7], ['ch_cold', IRENE, 5], ['ch_cold', LAURA, 2], ['ch_cold', MARTA, 1],
  ]
  trip.scores = scores.map(([challengeId, memberId, value]): Score => ({ id: `${challengeId}:${memberId}`, challengeId, memberId, value, updatedAt: t0 }))
  const marks: [string, string, string][] = [
    ['cell_5', DANI, '13:40'],
    ['cell_6', PABLO, '17:10'],
    ['cell_7', IRENE, '23:15'],
    ['cell_9', LAURA, '15:30'],
  ]
  trip.bingoMarks = marks.map(([cellId, memberId, time]): BingoMark => ({ id: `ch_bingo:${cellId}`, challengeId: 'ch_bingo', cellId, memberId, at: at(D1, time), updatedAt: t0 }))

  trip.updatedAt = t0
  return { trip, files }
}
