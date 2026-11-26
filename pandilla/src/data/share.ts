import type { Trip } from '../domain/types'
import { normalizeCode } from '../domain/ids'
import { normalizeTrip } from './tripModel'

/**
 * Enlace de invitación. Sin servidor, el enlace lleva dentro una copia del viaje
 * comprimida (en el #fragmento, que nunca se envía a ningún servidor) para que
 * el amigo que lo abra en su móvil tenga el viaje al instante.
 */

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const canCompress = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

export async function encodeTripSnapshot(trip: Trip): Promise<string> {
  const json = JSON.stringify(trip)
  if (canCompress()) {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    return 'z' + toBase64Url(bytes)
  }
  return 'j' + toBase64Url(new TextEncoder().encode(json))
}

export async function decodeTripSnapshot(payload: string): Promise<Trip | null> {
  try {
    const kind = payload[0]
    const bytes = fromBase64Url(payload.slice(1))
    let json: string
    if (kind === 'z') {
      if (!canCompress()) return null
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      json = await new Response(stream).text()
    } else if (kind === 'j') {
      json = new TextDecoder().decode(bytes)
    } else {
      return null
    }
    return normalizeTrip(JSON.parse(json))
  } catch {
    return null
  }
}

export function appBaseUrl(): string {
  return `${location.origin}${location.pathname}`
}

export function inviteUrl(code: string, snapshot?: string): string {
  return `${appBaseUrl()}#/unirse/${encodeURIComponent(code)}${snapshot ? `?d=${snapshot}` : ''}`
}

/**
 * Acepta tanto un código («AURORA») como un enlace de invitación entero pegado
 * (útil en iPhone, donde la app instalada no abre los enlaces de WhatsApp).
 */
export function parseInviteInput(raw: string): { code: string; snapshot: string | null } | null {
  const text = raw.trim()
  const link = text.match(/unirse\/([^?#\s/]+)(?:\?(?:[^#\s]*&)?d=([A-Za-z0-9_-]+))?/)
  if (link) {
    const code = normalizeCode(decodeURIComponent(link[1]))
    return code ? { code, snapshot: link[2] ?? null } : null
  }
  const code = normalizeCode(text)
  return code ? { code, snapshot: null } : null
}
