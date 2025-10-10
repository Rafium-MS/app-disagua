import { CalendarDays } from 'lucide-react'

export type DateRangeValue = {
  from: string | null
  to: string | null
}

export type DateRangePickerProps = {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-fg/70">
      <CalendarDays className="h-4 w-4 text-primary" />
      <input
        type="date"
        value={value.from ?? ''}
        onChange={(event) => onChange({ ...value, from: event.target.value || null })}
        className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <span className="text-fg/40">—</span>
      <input
        type="date"
        value={value.to ?? ''}
        onChange={(event) => onChange({ ...value, to: event.target.value || null })}
        className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  )
}
