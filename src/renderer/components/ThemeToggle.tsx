import { useTheme } from '@/theme/ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-1">
      {(['light', 'dark', 'system'] as const).map((option) => {
        const isActive = theme === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={`rounded-lg px-3 py-1 text-sm capitalize transition ${
              isActive ? 'border border-primary bg-primary/10 text-primary' : 'text-fg/70 hover:bg-muted'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
