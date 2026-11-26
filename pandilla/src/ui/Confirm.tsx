import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Sheet } from './Sheet'

interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false)

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ key: number; open: boolean; opts: ConfirmOptions } | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    resolver.current?.(false)
    setState({ key: Date.now(), open: true, opts })
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const finish = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setState((s) => (s ? { ...s, open: false } : s))
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Sheet
          key={state.key}
          open={state.open}
          onClose={() => finish(false)}
          title={state.opts.title}
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" full onClick={() => finish(false)}>
                {state.opts.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button
                variant={state.opts.tone === 'primary' ? 'primary' : 'danger'}
                full
                data-autofocus
                onClick={() => finish(true)}
                className={state.opts.tone === 'primary' ? '' : '!bg-danger !text-white'}
              >
                {state.opts.confirmLabel ?? 'Eliminar'}
              </Button>
            </div>
          }
        >
          {state.opts.message && <div className="text-[15px] leading-relaxed text-fg-2">{state.opts.message}</div>}
        </Sheet>
      )}
    </ConfirmContext.Provider>
  )
}
