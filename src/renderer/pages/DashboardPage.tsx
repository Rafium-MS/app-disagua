import { useMemo, useState } from 'react'

import { useReports, type Report, type ReportStatus, type ReportsState } from '../hooks/useReports'

const statusLabels: Record<ReportStatus, string> = {
  rascunho: 'Rascunho',
  'em revisão': 'Em revisão',
  aprovado: 'Aprovado',
}

const statusBadgeStyles: Record<ReportStatus, string> = {
  rascunho: 'bg-amber-100 text-amber-900 border border-amber-200',
  'em revisão': 'bg-blue-100 text-blue-900 border border-blue-200',
  aprovado: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
}

const statusBarStyles: Record<ReportStatus, string> = {
  rascunho: 'bg-amber-500',
  'em revisão': 'bg-blue-500',
  aprovado: 'bg-emerald-500',
}

const numberFormatter = new Intl.NumberFormat('pt-BR')
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
})

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function getProgress(report: Report) {
  if (report.expectedDeliveries <= 0) {
    return 0
  }

  const ratio = report.receivedDeliveries / report.expectedDeliveries
  return Math.max(0, Math.min(100, Math.round(ratio * 100)))
}

function formatIssuedAt(report: Report) {
  return dateTimeFormatter.format(new Date(report.issuedAt))
}

function getFilteredReports(
  reportsState: ReportsState,
  statusFilter: 'todos' | ReportStatus,
  startMonth: string,
  endMonth: string,
) {
  if (reportsState.status !== 'success') {
    return [] as Report[]
  }

  return reportsState.data.filter((report) => {
    const matchesStatus = statusFilter === 'todos' || report.status === statusFilter
    const matchesStart = startMonth === '' || report.referenceMonth >= startMonth
    const matchesEnd = endMonth === '' || report.referenceMonth <= endMonth
    return matchesStatus && matchesStart && matchesEnd
  })
}

export function DashboardPage() {
  const [statusFilter, setStatusFilter] = useState<'todos' | ReportStatus>('todos')
  const [startMonth, setStartMonth] = useState('')
  const [endMonth, setEndMonth] = useState('')
  const reportsState = useReports()

  const filteredReports = useMemo(
    () => getFilteredReports(reportsState, statusFilter, startMonth, endMonth),
    [reportsState, statusFilter, startMonth, endMonth],
  )

  const totals = useMemo(() => {
    if (filteredReports.length === 0) {
      return { expected: 0, received: 0 }
    }

    return filteredReports.reduce(
      (accumulator, report) => ({
        expected: accumulator.expected + report.expectedDeliveries,
        received: accumulator.received + report.receivedDeliveries,
      }),
      { expected: 0, received: 0 },
    )
  }, [filteredReports])

  const overallProgress = totals.expected === 0 ? 0 : Math.round((totals.received / totals.expected) * 100)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe os relatórios, status de entrega e evolução das metas de distribuição de vouchers.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <label htmlFor="dashboard-status" className="text-sm font-medium text-foreground">
                Status
              </label>
              <select
                id="dashboard-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'todos' | ReportStatus)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="todos">Todos os status</option>
                {(Object.keys(statusLabels) as ReportStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="dashboard-start" className="text-sm font-medium text-foreground">
                Período inicial
              </label>
              <input
                id="dashboard-start"
                type="month"
                value={startMonth}
                onChange={(event) => setStartMonth(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="dashboard-end" className="text-sm font-medium text-foreground">
                Período final
              </label>
              <input
                id="dashboard-end"
                type="month"
                value={endMonth}
                min={startMonth || undefined}
                onChange={(event) => setEndMonth(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <div className="space-y-1 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">Resumo do filtro atual</p>
            <p className="text-muted-foreground">
              {filteredReports.length}{' '}
              {filteredReports.length === 1 ? 'relatório' : 'relatórios'} encontrados •{' '}
              {formatNumber(totals.received)} de {formatNumber(totals.expected)} vouchers recebidos
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${overallProgress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{overallProgress}% das entregas previstas</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {reportsState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Carregando relatórios para o dashboard...</p>
        )}
        {reportsState.status === 'error' && (
          <p className="text-sm text-red-600">Não foi possível carregar os relatórios do dashboard.</p>
        )}
        {reportsState.status === 'success' && filteredReports.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum relatório corresponde aos filtros aplicados no momento.
          </p>
        )}

        {reportsState.status === 'success' && filteredReports.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredReports.map((report) => {
              const progress = getProgress(report)

              return (
                <article key={report.id} className="flex flex-col gap-4 rounded-lg border bg-background p-4 shadow-sm">
                  <header className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {report.partner.name}
                        </p>
                        <h2 className="text-lg font-semibold text-foreground">{report.title}</h2>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeStyles[report.status]}`}>
                        {statusLabels[report.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{report.referenceLabel}</span>
                      <span aria-hidden>•</span>
                      <span>Emitido em {formatIssuedAt(report)}</span>
                    </div>
                  </header>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(report.receivedDeliveries)} recebidos</span>
                      <span>{formatNumber(report.expectedDeliveries)} previstos</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full transition-all duration-300 ${statusBarStyles[report.status]}`} style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{progress}% das entregas concluídas</p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default DashboardPage
