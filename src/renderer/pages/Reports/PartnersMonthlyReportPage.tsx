import { useMemo, useState } from 'react'

import type { RouteComponentProps } from '@/types/router'

import PartnersMonthlyTable from './PartnersMonthlyTable'

function getCurrentMonthIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export default function PartnersMonthlyReportPage(_props: RouteComponentProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthIso)

  const title = useMemo(() => {
    const [year, month] = selectedMonth.split('-')
    const monthIndex = Number(month) - 1
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
    const monthName = formatter.format(new Date(Number(year), monthIndex, 1))
    return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} de ${year}`
  }, [selectedMonth])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Relatórios · Resumo mensal</p>
          <h1 className="text-2xl font-semibold text-slate-100">Resumo mensal por parceiro</h1>
          <p className="text-sm text-slate-400">Visualize os volumes e valores por produto consolidado por parceiro.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <label htmlFor="month" className="text-xs uppercase tracking-wide text-slate-500">
            Competência
          </label>
          <input
            id="month"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <span className="text-xs text-slate-500">{title}</span>
        </div>
      </header>

      <PartnersMonthlyTable month={selectedMonth} />
    </div>
  )
}
