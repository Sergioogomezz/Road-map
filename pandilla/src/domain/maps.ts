/** Enlaces a apps de mapas. Abren la app nativa si está instalada. */

const enc = encodeURIComponent

export function googleMapsSearch(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${enc(query)}`
}

export function googleMapsDirections(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${enc(destination)}`
}

export function appleMapsSearch(query: string): string {
  return `https://maps.apple.com/?q=${enc(query)}`
}

export function appleMapsDirections(destination: string): string {
  return `https://maps.apple.com/?daddr=${enc(destination)}`
}

export function wazeDirections(destination: string): string {
  return `https://waze.com/ul?q=${enc(destination)}&navigate=yes`
}

export function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
