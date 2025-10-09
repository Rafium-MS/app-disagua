import type { ReactNode } from 'react'

export type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-8 py-16 text-center">
      <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
        Tudo pronto
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
        <p className="max-w-lg text-sm text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  )
}
