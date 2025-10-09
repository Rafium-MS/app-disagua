import { useMemo, useState } from 'react'
import { FilePlus } from 'lucide-react'

import { DataTable, type ColumnConfig } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { FilterBar, FilterSelect } from '@/components/FilterBar'
import { ProgressBar } from '@/components/ProgressBar'
import { StatusBadge } from '@/components/StatusBadge'
import type { RouteComponentProps } from '@/types/router'
import { useReportsList } from '@/hooks/useReportsData'

const statusTone: Record<string, 'emerald' | 'amber' | 'sky'> = {
  'Em Preenchimento': 'sky',
  'Para Conferência': 'amber',
  Aprovado: 'emerald',
}

export function ReportsListPage({ navigate }: RouteComponentProps) {
  const [filters, setFilters] = useState({ status: 'all', partnerId: 'all', search: '' })
  const reports = useReportsList(filters.status === 'all' ? 'all' : (filters.status as never), filters.partnerId)

  const filteredReports = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()
    return reports.filter((report) =>
      normalizedSearch.length === 0 ? true : report.name.toLowerCase().includes(normalizedSearch),
    )
  }, [reports, filters.search])

  const columns: ColumnConfig<(typeof filteredReports)[number]>[] = [
    { key: 'name', header: 'Nome', sortable: true },
    { key: 'period', header: 'Período' },
    {
      key: 'expected',
      header: 'Esperados',
      align: 'center',
      render: (report) => <span>{report.expected}</span>,
    },
    {
      key: 'valid',
      header: 'Válidos',
      align: 'center',
      render: (report) => <span>{report.valid}</span>,
    },
    {
      key: 'progress',
      header: '% Progresso',
      render: (report) => <ProgressBar value={(report.valid / Math.max(report.expected, 1)) * 100} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (report) => <StatusBadge status={report.status} tone={statusTone[report.status]} />,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (report) => (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/reports/${report.id}`)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-emerald-300"
          >
            Abrir
          </button>
          <button type="button" className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">
            Exportar
          </button>
          <button type="button" className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">
            Para Conferência
          </button>
          <button type="button" className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">
            Duplicar
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Relatórios</h1>
            <p className="text-sm text-slate-400">Visão geral dos períodos em andamento e ações rápidas.</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
          >
            <FilePlus className="h-4 w-4" /> Novo Relatório
          </button>
        </div>
        <FilterBar
          searchPlaceholder="Buscar por nome"
          searchValue={filters.search}
          onSearchChange={(value) => setFilters((previous) => ({ ...previous, search: value }))}
        >
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(value) => setFilters((previous) => ({ ...previous, status: value }))}
            options={[
              { label: 'Todos', value: 'all' },
              { label: 'Em Preenchimento', value: 'Em Preenchimento' },
              { label: 'Para Conferência', value: 'Para Conferência' },
              { label: 'Aprovado', value: 'Aprovado' },
            ]}
          />
          <FilterSelect
            label="Parceiro"
            value={filters.partnerId}
            onChange={(value) => setFilters((previous) => ({ ...previous, partnerId: value }))}
            options={[{ label: 'Todos', value: 'all' }].concat(
              [
                { label: 'Aquarius Group', value: 'p-001' },
                { label: 'Fonte Viva', value: 'p-002' },
                { label: 'Rio Claro Distribuidora', value: 'p-003' },
              ],
            )}
          />
        </FilterBar>
      </header>

      {filteredReports.length === 0 ? (
        <EmptyState
          title="Crie um relatório para acompanhar um período"
          description="Os relatórios ajudam a monitorar comprovantes enviados e pendências por unidade."
          action={
            <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow">
              Novo Relatório
            </button>
          }
        />
      ) : (
        <DataTable
          data={filteredReports}
          columns={columns}
          getRowId={(report) => report.id}
          footer={<span>{filteredReports.length} relatório(s)</span>}
        />
      )}
    </div>
  )
}
