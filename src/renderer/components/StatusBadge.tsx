import { clsx } from 'clsx'

export type StatusBadgeProps = {
  status: string
  tone?: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate'
}

const toneStyles: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  emerald:
    'bg-emerald-500/10 text-emerald-600 border-emerald-400/50 dark:text-emerald-200 dark:border-emerald-500/40',
  amber:
    'bg-amber-500/10 text-amber-600 border-amber-400/50 dark:text-amber-200 dark:border-amber-500/40',
  rose:
    'bg-rose-500/10 text-rose-600 border-rose-400/50 dark:text-rose-200 dark:border-rose-500/40',
  sky:
    'bg-sky-500/10 text-sky-600 border-sky-400/50 dark:text-sky-200 dark:border-sky-500/40',
  slate:
    'bg-slate-500/10 text-slate-600 border-slate-400/50 dark:text-slate-200 dark:border-slate-500/40',
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
