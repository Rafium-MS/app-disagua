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
    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
      <CalendarDays className="h-4 w-4 text-emerald-300" />
      <input
        type="date"
        value={value.from ?? ''}
        onChange={(event) => onChange({ ...value, from: event.target.value || null })}
        className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200"
      />
      <span className="text-slate-600">—</span>
      <input
        type="date"
        value={value.to ?? ''}
        onChange={(event) => onChange({ ...value, to: event.target.value || null })}
        className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200"
      />
    </div>
  )
}
