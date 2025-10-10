import { ReactNode, RefObject, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

const enqueueMicrotask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (callback: () => void) => {
        Promise.resolve().then(callback)
      }

export type DialogProps = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
  closeOnOverlayClick?: boolean
  disableEscapeKey?: boolean
  initialFocusRef?: RefObject<HTMLElement>
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  disableEscapeKey = false,
  initialFocusRef,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const focusTarget =
      initialFocusRef?.current ??
      dialogRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]') ??
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)

    enqueueMicrotask(() => {
      focusTarget?.focus()
    })

    return () => {
      document.body.style.overflow = previousOverflow
      previousActiveElementRef.current?.focus()
    }
  }, [open, initialFocusRef])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !disableEscapeKey) {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => {
        const isDisabled = element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true'
        if (isDisabled) {
          return false
        }

        const rects = element.getClientRects()
        return rects.length > 0
      })

      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current.focus({ preventScroll: true })
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (activeElement === first) {
          event.preventDefault()
          last.focus()
        }
        return
      }

      if (activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open, onClose, disableEscapeKey])

  if (!open) {
    return null
  }

  const containerClass =
    size === 'fullscreen'
      ? 'fixed inset-0 z-50 flex items-stretch justify-center bg-bg/60 px-0 backdrop-blur'
      : 'fixed inset-0 z-50 flex items-center justify-center bg-bg/60 px-4 backdrop-blur'

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    fullscreen: 'h-full max-h-screen w-full max-w-none sm:rounded-none',
  }[size]

  return createPortal(
    <div
      className={containerClass}
      role="dialog"
      aria-modal
      aria-labelledby={title ? `${titleId}-title` : undefined}
      aria-describedby={description ? `${descriptionId}-description` : undefined}
      data-state={open ? 'open' : 'closed'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeOnOverlayClick) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`relative w-full ${sizeClass} rounded-xl border border-border bg-card shadow-xl focus:outline-none`}
        tabIndex={-1}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-fg/60 transition hover:bg-muted"
          aria-label="Fechar"
        >
          ×
        </button>
        <div className="space-y-4 p-6">
          {title && (
            <h2 id={`${titleId}-title`} className="text-lg font-semibold text-fg">
              {title}
            </h2>
          )}
          {description && (
            <p id={`${descriptionId}-description`} className="text-sm text-fg/70">
              {description}
            </p>
          )}
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
