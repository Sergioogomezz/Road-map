import type { RatesTable } from './types'

export interface CurrencyInfo {
  code: string
  name: string
  flag: string
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'USD', name: 'Dólar estadounidense', flag: '🇺🇸' },
  { code: 'GBP', name: 'Libra esterlina', flag: '🇬🇧' },
  { code: 'CHF', name: 'Franco suizo', flag: '🇨🇭' },
  { code: 'ISK', name: 'Corona islandesa', flag: '🇮🇸' },
  { code: 'NOK', name: 'Corona noruega', flag: '🇳🇴' },
  { code: 'SEK', name: 'Corona sueca', flag: '🇸🇪' },
  { code: 'DKK', name: 'Corona danesa', flag: '🇩🇰' },
  { code: 'CZK', name: 'Corona checa', flag: '🇨🇿' },
  { code: 'HUF', name: 'Forinto húngaro', flag: '🇭🇺' },
  { code: 'PLN', name: 'Esloti polaco', flag: '🇵🇱' },
  { code: 'RON', name: 'Leu rumano', flag: '🇷🇴' },
  { code: 'TRY', name: 'Lira turca', flag: '🇹🇷' },
  { code: 'MAD', name: 'Dírham marroquí', flag: '🇲🇦' },
  { code: 'JPY', name: 'Yen japonés', flag: '🇯🇵' },
  { code: 'CNY', name: 'Yuan chino', flag: '🇨🇳' },
  { code: 'KRW', name: 'Won surcoreano', flag: '🇰🇷' },
  { code: 'THB', name: 'Baht tailandés', flag: '🇹🇭' },
  { code: 'AED', name: 'Dírham de EAU', flag: '🇦🇪' },
  { code: 'MXN', name: 'Peso mexicano', flag: '🇲🇽' },
  { code: 'BRL', name: 'Real brasileño', flag: '🇧🇷' },
  { code: 'CAD', name: 'Dólar canadiense', flag: '🇨🇦' },
  { code: 'AUD', name: 'Dólar australiano', flag: '🇦🇺' },
]

/**
 * Tipos aproximados (unidades por 1 €) para funcionar sin conexión desde el
 * primer momento. Se pueden actualizar online (BCE vía Frankfurter) o a mano.
 */
export const DEFAULT_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.16,
  GBP: 0.87,
  CHF: 0.93,
  ISK: 146,
  NOK: 11.7,
  SEK: 11,
  DKK: 7.46,
  CZK: 24.3,
  HUF: 385,
  PLN: 4.25,
  RON: 5.08,
  TRY: 48,
  MAD: 10.7,
  JPY: 176,
  CNY: 8.3,
  KRW: 1650,
  THB: 37.5,
  AED: 4.26,
  MXN: 21.5,
  BRL: 6.3,
  CAD: 1.62,
  AUD: 1.78,
}

export function defaultRates(): RatesTable {
  return { base: 'EUR', values: { ...DEFAULT_RATES }, source: 'aproximado', updatedAt: 0 }
}

export function currencyInfo(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? { code, name: code, flag: '💱' }
}

/** Decimales oficiales de la divisa (ISK, JPY, KRW, HUF… no usan céntimos en la práctica). */
export function currencyDecimals(code: string): number {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

const ENDPOINTS = [
  'https://api.frankfurter.dev/v1/latest?base=EUR',
  'https://api.frankfurter.app/latest?from=EUR',
]

/** Descarga los tipos de referencia del BCE. Solo se envía la petición, ningún dato del viaje. */
export async function fetchOnlineRates(signal?: AbortSignal): Promise<{ values: Record<string, number>; date: string }> {
  let lastError: unknown
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { signal, cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { rates?: Record<string, number>; date?: string }
      if (!data.rates || typeof data.rates !== 'object') throw new Error('Respuesta sin tipos')
      const values: Record<string, number> = { EUR: 1 }
      for (const [code, value] of Object.entries(data.rates)) {
        if (typeof value === 'number' && value > 0) values[code] = value
      }
      return { values, date: data.date ?? '' }
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No se pudieron descargar los tipos de cambio')
}
