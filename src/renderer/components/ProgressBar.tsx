export type ProgressBarProps = {
  value: number
  label?: string
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-slate-400">{label}</p>}
      <div className="h-2 w-full rounded-full bg-slate-800">
        <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-slate-400">{clamped.toFixed(0)}%</span>
    </div>
  )
}
