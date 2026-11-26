/** Copia texto al portapapeles (con alternativa para navegadores antiguos o sin permisos). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* probamos el método clásico */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** Abre el menú nativo de compartir; si no existe, copia. Devuelve cómo se compartió. */
export async function shareOrCopy(data: { title?: string; text?: string; url?: string }): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed'
    }
  }
  const ok = await copyText([data.text, data.url].filter(Boolean).join('\n'))
  return ok ? 'copied' : 'failed'
}
