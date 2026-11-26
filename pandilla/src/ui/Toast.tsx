import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'
import { useFrameLayers } from './Frame'

type Tone = 'neutral' | 'success' | 'danger'

interface ToastOptions {
  tone?: Tone
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: number
  message: string
}

const ToastContext = createContext<(message: string, opts?: ToastOptions) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const { overlay } = useFrameLayers()
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    (message: string, opts: ToastOptions = {}) => {
      const id = ++seq.current
      setItems((list) => [...list.slice(-1), { id, message, ...opts }])
      window.setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 5000 : 2800))
    },
    [dismiss],
  )

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {overlay &&
        createPortal(
          <div
            className="absolute inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
            style={{ bottom: 'calc(92px + env(safe-area-inset-bottom))' }}
            aria-live="polite"
          >
            {items.map((t) => (
              <div
                key={t.id}
                role="status"
                className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-2xl bg-fg px-4 py-3 text-sm font-medium text-bg shadow-pop"
              >
                {t.tone === 'success' ? (
                  <CircleCheck className="size-5 shrink-0 text-success" />
                ) : t.tone === 'danger' ? (
                  <CircleAlert className="size-5 shrink-0 text-danger" />
                ) : (
                  <Info className="size-5 shrink-0 opacity-70" />
                )}
                <span className="min-w-0 flex-1">{t.message}</span>
                {t.action && (
                  <button
                    type="button"
                    className={cn('press -my-1 shrink-0 rounded-xl px-3 py-1.5 font-bold text-[var(--toast-action)]', 'bg-bg/10')}
                    onClick={() => {
                      t.action?.onClick()
                      dismiss(t.id)
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>,
          overlay,
        )}
    </ToastContext.Provider>
  )
}
