const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
/** Sin caracteres que se confunden al dictarlos (0/O, 1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomIndex(max: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % max
}

export function uid(prefix = ''): string {
  let out = ''
  for (let i = 0; i < 12; i++) out += ALPHABET[randomIndex(ALPHABET.length)]
  return prefix ? `${prefix}_${out}` : out
}

export function tripCode(): string {
  let out = ''
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[randomIndex(CODE_ALPHABET.length)]
  return out
}

export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .normalize('NFD')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
}

let last = 0
/** Reloj estrictamente creciente: dos cambios seguidos nunca comparten marca de tiempo. */
export function now(): number {
  const t = Date.now()
  last = t > last ? t : last + 1
  return last
}
