import { useCallback, useSyncExternalStore } from 'react'

export interface HashRoute {
  /** Segmentos de la ruta: "#/plan/votaciones" → ["plan", "votaciones"]. */
  path: string[]
  params: URLSearchParams
}

function parse(hash: string): HashRoute {
  const raw = hash.replace(/^#\/?/, '')
  const [pathPart, query = ''] = raw.split('?')
  return {
    path: pathPart.split('/').filter(Boolean).map(decodeURIComponent),
    params: new URLSearchParams(query),
  }
}

let cachedHash = ''
let cachedRoute: HashRoute = parse('')

function getSnapshot(): HashRoute {
  if (location.hash !== cachedHash) {
    cachedHash = location.hash
    cachedRoute = parse(cachedHash)
  }
  return cachedRoute
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const hash = to.startsWith('#') ? to : `#/${to.replace(/^\//, '')}`
  if (opts.replace) {
    history.replaceState(null, '', hash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else if (location.hash !== hash) {
    location.hash = hash
  }
}

export function useHashRoute(): [HashRoute, typeof navigate] {
  const route = useSyncExternalStore(subscribe, getSnapshot)
  const nav = useCallback(navigate, [])
  return [route, nav]
}
