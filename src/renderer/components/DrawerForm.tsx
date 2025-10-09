import type { ReactNode, FormEvent } from 'react'
import { Dialog } from '@/components/ui/dialog'

export type DrawerFormProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  submitLabel?: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  footer?: ReactNode
}

export function DrawerForm({
  open,
  onClose,
  title,
  description,
  submitLabel = 'Salvar',
  onSubmit,
  children,
  footer,
}: DrawerFormProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        footer ?? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="drawer-form"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
            >
              {submitLabel}
            </button>
          </div>
        )
      }
    >
      <form id="drawer-form" onSubmit={onSubmit} className="space-y-4">
        {children}
      </form>
    </Dialog>
  )
}
