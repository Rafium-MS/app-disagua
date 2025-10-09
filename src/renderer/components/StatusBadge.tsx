import { clsx } from 'clsx'

export type StatusBadgeProps = {
  status: string
  tone?: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate'
}

const toneStyles: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  rose: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
  sky: 'bg-sky-500/10 text-sky-300 border-sky-500/40',
  slate: 'bg-slate-500/10 text-slate-300 border-slate-500/40',
}

export function StatusBadge({ status, tone = 'emerald' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide',
        toneStyles[tone],
      )}
    >
      {status}
    </span>
  )
}
