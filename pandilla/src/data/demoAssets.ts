/** Tarjetas de embarque y entradas de ejemplo (SVG generado) para probar la bóveda offline. */

function rng(seedText: string) {
  let h = 2166136261
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619)
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 10000) / 10000
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function qr(x: number, y: number, size: number, seed: string): string {
  const r = rng(seed)
  const n = 25
  const cell = size / n
  let out = `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#fff"/>`
  const finder = (fx: number, fy: number) =>
    `<rect x="${x + fx * cell}" y="${y + fy * cell}" width="${cell * 7}" height="${cell * 7}" fill="#111"/>` +
    `<rect x="${x + (fx + 1) * cell}" y="${y + (fy + 1) * cell}" width="${cell * 5}" height="${cell * 5}" fill="#fff"/>` +
    `<rect x="${x + (fx + 2) * cell}" y="${y + (fy + 2) * cell}" width="${cell * 3}" height="${cell * 3}" fill="#111"/>`
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const inFinder = (i < 8 && j < 8) || (i < 8 && j > n - 9) || (i > n - 9 && j < 8)
      if (!inFinder && r() > 0.52) out += `<rect x="${x + j * cell}" y="${y + i * cell}" width="${cell}" height="${cell}" fill="#111"/>`
    }
  }
  return out + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7)
}

export function boardingPassSvg(p: {
  name: string
  seat: string
  flight: string
  from: string
  fromCity: string
  to: string
  toCity: string
  date: string
  boarding: string
  departure: string
  gate: string
  code: string
}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" width="720" height="340" font-family="Helvetica, Arial, sans-serif">
  <rect width="720" height="340" rx="28" fill="#ffffff"/>
  <path d="M0 28a28 28 0 0 1 28-28h664a28 28 0 0 1 28 28v52H0z" fill="#1f3b73"/>
  <text x="32" y="52" fill="#fff" font-size="22" font-weight="700" letter-spacing="2">TARJETA DE EMBARQUE</text>
  <text x="688" y="52" fill="#9fc0ff" font-size="16" text-anchor="end" font-weight="700">EJEMPLO · NO VÁLIDA</text>
  <text x="32" y="118" fill="#6b7280" font-size="14" letter-spacing="1">PASAJERO/A</text>
  <text x="32" y="146" fill="#111" font-size="26" font-weight="700">${esc(p.name.toUpperCase())}</text>
  <text x="32" y="210" fill="#111" font-size="54" font-weight="800">${esc(p.from)}</text>
  <text x="32" y="234" fill="#6b7280" font-size="15">${esc(p.fromCity)}</text>
  <text x="190" y="200" fill="#1f3b73" font-size="34">✈</text>
  <text x="250" y="210" fill="#111" font-size="54" font-weight="800">${esc(p.to)}</text>
  <text x="250" y="234" fill="#6b7280" font-size="15">${esc(p.toCity)}</text>
  <g font-size="13" fill="#6b7280" letter-spacing="1">
    <text x="32" y="276">VUELO</text><text x="130" y="276">FECHA</text><text x="250" y="276">EMBARQUE</text><text x="360" y="276">SALIDA</text><text x="450" y="276">ASIENTO</text>
  </g>
  <g font-size="22" fill="#111" font-weight="700">
    <text x="32" y="304">${esc(p.flight)}</text><text x="130" y="304">${esc(p.date)}</text><text x="250" y="304">${esc(p.boarding)}</text><text x="360" y="304">${esc(p.departure)}</text><text x="450" y="304">${esc(p.seat)}</text>
  </g>
  <line x1="530" y1="96" x2="530" y2="316" stroke="#d1d5db" stroke-dasharray="6 6"/>
  ${qr(552, 104, 140, p.name + p.code)}
  <text x="622" y="270" fill="#6b7280" font-size="13" text-anchor="middle" letter-spacing="1">PUERTA</text>
  <text x="622" y="300" fill="#111" font-size="24" text-anchor="middle" font-weight="800">${esc(p.gate)}</text>
  <text x="622" y="324" fill="#6b7280" font-size="12" text-anchor="middle">Reserva ${esc(p.code)}</text>
</svg>`
}

export function ticketSvg(p: { title: string; subtitle: string; date: string; people: string; code: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300" width="720" height="300" font-family="Helvetica, Arial, sans-serif">
  <rect width="720" height="300" rx="28" fill="#0f5257"/>
  <circle cx="0" cy="150" r="26" fill="#f5f4f0"/><circle cx="720" cy="150" r="26" fill="#f5f4f0"/>
  <text x="44" y="64" fill="#a7f3d0" font-size="16" font-weight="700" letter-spacing="2">ENTRADA · EJEMPLO</text>
  <text x="44" y="118" fill="#fff" font-size="40" font-weight="800">${esc(p.title)}</text>
  <text x="44" y="150" fill="#ccfbf1" font-size="18">${esc(p.subtitle)}</text>
  <text x="44" y="214" fill="#a7f3d0" font-size="13" letter-spacing="1">FECHA</text>
  <text x="44" y="244" fill="#fff" font-size="24" font-weight="700">${esc(p.date)}</text>
  <text x="230" y="214" fill="#a7f3d0" font-size="13" letter-spacing="1">PERSONAS</text>
  <text x="230" y="244" fill="#fff" font-size="24" font-weight="700">${esc(p.people)}</text>
  ${qr(520, 60, 160, p.code)}
  <text x="600" y="256" fill="#ccfbf1" font-size="14" text-anchor="middle">${esc(p.code)}</text>
</svg>`
}
