import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

export type ToastVariant = 'default' | 'success' | 'error'

type Toast = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (toast: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    ({
      title,
      description,
      variant = 'default'
    }: {
      title: string
      description?: string
      variant?: ToastVariant
    }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setToasts((previous) => [...previous, { id, title, description, variant }])
      window.setTimeout(() => removeToast(id), 4000)
    },
    [removeToast]
  )

  const value = useMemo(() => ({ toast: pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-lg transition ${
                toast.variant === 'success'
                  ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-400'
                  : toast.variant === 'error'
                    ? 'border-red-400/60 bg-red-500/10 text-red-400'
                    : 'text-fg'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 text-xs text-fg/70">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded-full p-1 text-xs text-fg/60 transition hover:bg-muted"
                  aria-label="Fechar notificação"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
