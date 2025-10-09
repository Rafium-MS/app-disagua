import { useState } from 'react'
import { Search, User } from 'lucide-react'
import { DateRangePicker } from '@/components/DateRangePicker'

export function AppTopbar() {
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  })

  return (
    <header className="flex items-center justify-between border-b border-slate-800 px-10 py-4">
      <div className="relative hidden max-w-md flex-1 items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900 px-4 py-2 text-sm text-slate-200 shadow-sm focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 lg:flex">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Busca global"
          className="flex-1 bg-transparent outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <DateRangePicker value={range} onChange={setRange} />
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400"
        >
          <User className="h-4 w-4" />
          <span>Vanessa Lima</span>
        </button>
      </div>
    </header>
  )
}
