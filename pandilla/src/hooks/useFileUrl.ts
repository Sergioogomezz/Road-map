import { useEffect, useState } from 'react'
import { getFile } from '../data/fileStore'

/** URL temporal (blob:) de un archivo de la bóveda. `null` = no está en este móvil. */
export function useFileUrl(id: string | undefined): { url: string | null; blob: Blob | null; loading: boolean } {
  const [state, setState] = useState<{ url: string | null; blob: Blob | null; loading: boolean }>({ url: null, blob: null, loading: Boolean(id) })
  useEffect(() => {
    if (!id) {
      setState({ url: null, blob: null, loading: false })
      return
    }
    let url: string | null = null
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    getFile(id)
      .then((blob) => {
        if (cancelled) return
        url = blob ? URL.createObjectURL(blob) : null
        setState({ url, blob: blob ?? null, loading: false })
      })
      .catch(() => !cancelled && setState({ url: null, blob: null, loading: false }))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])
  return state
}
