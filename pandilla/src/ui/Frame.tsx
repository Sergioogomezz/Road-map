import { createContext, useContext, useState, type ReactNode } from 'react'

interface FrameLayers {
  overlay: HTMLElement | null
  fab: HTMLElement | null
}

const FrameContext = createContext<FrameLayers>({ overlay: null, fab: null })

export function useFrameLayers() {
  return useContext(FrameContext)
}

/**
 * Marco de la app: a pantalla completa en el móvil y como un teléfono centrado
 * en escritorio. Las hojas, avisos y el botón flotante se pintan dentro del
 * marco (capas `overlay` y `fab`) para que nunca se salgan de él.
 */
export function Frame({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  const [overlay, setOverlay] = useState<HTMLElement | null>(null)
  const [fab, setFab] = useState<HTMLElement | null>(null)
  return (
    <FrameContext.Provider value={{ overlay, fab }}>
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
          <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-48 -right-40 size-[560px] rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div
          id="app-frame"
          className="relative isolate flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-bg sm:h-[min(940px,calc(100dvh-48px))] sm:rounded-[44px] sm:border sm:border-line sm:shadow-pop"
        >
          {children}
          {nav}
          <div
            ref={setFab}
            className="pointer-events-none absolute right-4 z-30 flex flex-col items-end gap-3"
            style={{ bottom: nav ? 'calc(84px + env(safe-area-inset-bottom))' : 'calc(20px + env(safe-area-inset-bottom))' }}
          />
          <div ref={setOverlay} className="pointer-events-none absolute inset-0 z-50" />
        </div>
      </div>
    </FrameContext.Provider>
  )
}
