import { type ReactNode, useState } from 'react'
import { Search } from 'lucide-react'
import { DateRangePicker } from '@/components/DateRangePicker'

type AppTopbarProps = {
  onOpenSidebar: () => void
  topRight?: ReactNode
}

export function AppTopbar({ onOpenSidebar, topRight }: AppTopbarProps) {
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  })

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/60 backdrop-blur">
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4 md:px-6">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="md:hidden rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-fg transition hover:bg-muted"
        >
          Menu
        </button>

        <div className="hidden flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-sm md:flex">
          <Search className="h-4 w-4 text-fg/50" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Busca global"
            className="w-full bg-transparent text-sm text-fg placeholder:text-fg/50 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <DateRangePicker value={range} onChange={setRange} />
          {topRight}
        </div>
      </div>
    </header>
  )
}
