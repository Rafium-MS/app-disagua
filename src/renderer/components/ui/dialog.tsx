import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

export type DialogProps = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', listener)

    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 px-4 backdrop-blur"
      role="dialog"
      aria-modal
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-fg/60 transition hover:bg-muted"
          aria-label="Fechar"
        >
          ×
        </button>
        <div className="space-y-4 p-6">
          {title && <h2 className="text-lg font-semibold text-fg">{title}</h2>}
          {description && <p className="text-sm text-fg/70">{description}</p>}
          <div className="space-y-3">{children}</div>
        </div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-border bg-muted/40 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
