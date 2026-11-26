import { RefreshCw, X } from 'lucide-react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from '../ui/Toast'

/** Avisa cuando la app ya funciona sin conexión y cuando hay una versión nueva. */
export function PwaPrompt() {
  const toast = useToast()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn('Service worker no registrado', error)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    toast('Lista para usarse sin cobertura', { tone: 'success' })
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady, toast])

  if (!needRefresh) return null
  return (
    <div className="pointer-events-auto absolute inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-[65] flex animate-toast-in items-center gap-3 rounded-2xl bg-fg p-3 pl-4 text-sm text-bg shadow-pop">
      <RefreshCw className="size-5 shrink-0" />
      <span className="flex-1 font-medium">Hay una versión nueva de Pandilla</span>
      <button type="button" onClick={() => void updateServiceWorker(true)} className="press rounded-xl bg-primary px-3 py-1.5 font-bold text-primary-fg">
        Actualizar
      </button>
      <button type="button" aria-label="Más tarde" onClick={() => setNeedRefresh(false)} className="press rounded-full p-1.5 opacity-70">
        <X className="size-4" />
      </button>
    </div>
  )
}
