import type { ReactNode } from 'react'

export type FilterBarProps = {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  children?: ReactNode
  actions?: ReactNode
}

export function FilterBar({
  searchPlaceholder = 'Buscar',
  searchValue,
  onSearchChange,
  children,
  actions,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-[220px] flex-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
          />
        )}
        <div className="flex flex-wrap items-center gap-3">{children}</div>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
    </div>
  )
}

export type FilterSelectProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
}

export function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="uppercase tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-900 text-slate-100">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export type FilterToggleProps = {
  label: string
  active: boolean
  onToggle: (next: boolean) => void
}

export function FilterToggle({ label, active, onToggle }: FilterToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition ${
        active
          ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
          : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  )
}
