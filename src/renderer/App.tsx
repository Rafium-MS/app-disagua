import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useReports } from './hooks/useReports'
import {
  usePendingPartners,
  type PendingPartnerApiPayload as PendingPartner
} from './hooks/usePendingPartners'
import { AuditLogsPanel } from './components/AuditLogsPanel'

type Partner = {
  id: number
  name: string
  document: string
  email: string | null
  createdAt: string
  updatedAt: string
}

type PartnersState =
  | { status: 'loading'; data: Partner[] }
  | { status: 'success'; data: Partner[] }
  | { status: 'error'; data: Partner[] }

type ReportPartnerFilter = 'all' | number

type Voucher = {
  id: number
  code: string
  issuedAt: string
  redeemedAt: string | null
  partner: {
    id: number
    name: string
  }
  report: {
    id: number
    title: string
  } | null
}

type VouchersState =
  | { status: 'loading'; data: Voucher[] }
  | { status: 'success'; data: Voucher[] }
  | { status: 'error'; data: Voucher[] }

type VoucherStatusFilter = 'all' | 'redeemed' | 'pending'
type VoucherPartnerFilter = 'all' | number
type VoucherReportFilter = 'all' | number


type DashboardStats = {
  partnersCount: number
  reportsCount: number
  vouchersCount: number
  redeemedVouchersCount: number
  pendingVouchersCount: number
}

type DashboardStatsState =
  | { status: 'loading'; data: null }
  | { status: 'success'; data: DashboardStats }
  | { status: 'error'; data: null }

function useHealth() {
  const [health, setHealth] = useState<string>('carregando...')
  useEffect(() => {
    fetch('http://localhost:5174/health')
      .then((r) => r.json())
      .then((j) => setHealth(j.status))
      .catch(() => setHealth('erro'))
  }, [])
  return health
}

function usePartners(search: string): PartnersState {
  const [state, setState] = useState<PartnersState>({ status: 'loading', data: [] })

  useEffect(() => {
    let canceled = false
    const controller = new AbortController()

    setState((previous) => ({ status: 'loading', data: previous.data }))

    const params = new URLSearchParams()
    const trimmedSearch = search.trim()
    if (trimmedSearch.length > 0) {
      params.set('search', trimmedSearch)
    }

    const url = `http://localhost:5174/partners${params.size > 0 ? `?${params.toString()}` : ''}`

    const timeoutId = setTimeout(() => {
      fetch(url, { signal: controller.signal })
        .then((response) => response.json())
        .then((payload) => {
          if (canceled) {
            return
          }

          const partners: Partner[] = Array.isArray(payload.data) ? payload.data : []
          setState({ status: 'success', data: partners })
        })
        .catch((error) => {
          if (canceled || controller.signal.aborted) {
            return
          }

          if (typeof error === 'object' && error && 'name' in error && (error as { name?: string }).name === 'AbortError') {
            return
          }

          setState({ status: 'error', data: [] })
        })
    }, 300)

    return () => {
      canceled = true
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [search])

  return state
}

function useVouchers(
  status: VoucherStatusFilter,
  partner: VoucherPartnerFilter,
  report: VoucherReportFilter
): VouchersState {
  const [state, setState] = useState<VouchersState>({ status: 'loading', data: [] })

  useEffect(() => {
    let canceled = false
    const controller = new AbortController()

    setState((previous) => ({ status: 'loading', data: previous.data }))

    const params = new URLSearchParams()
    if (status === 'redeemed' || status === 'pending') {
      params.set('status', status)
    }

    if (partner !== 'all') {
      params.set('partnerId', String(partner))
    }

    if (report !== 'all') {
      params.set('reportId', String(report))
    }

    const url = `http://localhost:5174/vouchers${params.size > 0 ? `?${params.toString()}` : ''}`

    fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (canceled) {
          return
        }

        const vouchers: Voucher[] = Array.isArray(payload.data) ? payload.data : []
        setState({ status: 'success', data: vouchers })
      })
      .catch((error) => {
        if (canceled || controller.signal.aborted) {
          return
        }

        if (typeof error === 'object' && error && 'name' in error && (error as { name?: string }).name === 'AbortError') {
          return
        }

        setState({ status: 'error', data: [] })
      })

    return () => {
      canceled = true
      controller.abort()
    }
  }, [partner, report, status])

  return state
}

function useDashboardStats(): DashboardStatsState {
  const [state, setState] = useState<DashboardStatsState>({ status: 'loading', data: null })

  useEffect(() => {
    fetch('http://localhost:5174/stats')
      .then((response) => response.json())
      .then((payload) => {
        if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
          const raw = payload.data as Record<string, unknown>
          const stats: DashboardStats = {
            partnersCount: parseStatValue(raw.partnersCount),
            reportsCount: parseStatValue(raw.reportsCount),
            vouchersCount: parseStatValue(raw.vouchersCount),
            redeemedVouchersCount: parseStatValue(raw.redeemedVouchersCount),
            pendingVouchersCount: parseStatValue(raw.pendingVouchersCount)
          }

          setState({ status: 'success', data: stats })
          return
        }

        setState({ status: 'error', data: null })
      })
      .catch(() => setState({ status: 'error', data: null }))
  }, [])

  return state
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleDateString('pt-BR')
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  })
}

function getVoucherStatus(redeemedAt: string | null) {
  if (!redeemedAt) {
    return { label: 'Pendente', variant: 'warning' as const }
  }

  return { label: 'Resgatado', variant: 'success' as const }
}

function describePendingPartnerStatus(stats: PendingPartner['reportVoucherStats']) {
  if (stats.total === 0) {
    return 'Nenhum voucher emitido'
  }

  if (stats.valid > 0) {
    return 'Possui vouchers válidos'
  }

  if (stats.redeemed === stats.total) {
    return 'Todos os vouchers foram resgatados'
  }

  return 'Sem vouchers válidos'
}

function getPendingPartnerStatusVariant(stats: PendingPartner['reportVoucherStats']) {
  if (stats.valid > 0) {
    return 'success' as const
  }

  if (stats.total === 0) {
    return 'neutral' as const
  }

  return 'warning' as const
}

const numberFormatter = new Intl.NumberFormat('pt-BR')

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function parseStatValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

export default function App() {
  const health = useHealth()
  const [partnerSearch, setPartnerSearch] = useState('')
  const partnersState = usePartners(partnerSearch)
  const [reportPartnerFilter, setReportPartnerFilter] = useState<ReportPartnerFilter>('all')
  const reportsState = useReports({ partnerId: reportPartnerFilter })
  const [pendingPartnersReportId, setPendingPartnersReportId] = useState<number | 'none'>('none')
  const [pendingPartnersSearch, setPendingPartnersSearch] = useState('')
  const [pendingPartnersPage, setPendingPartnersPage] = useState(1)
  const pendingPartnersState = usePendingPartners({
    reportId: pendingPartnersReportId === 'none' ? undefined : pendingPartnersReportId,
    search: pendingPartnersSearch,
    page: pendingPartnersPage,
    pageSize: 10
  })
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<VoucherStatusFilter>('all')
  const [voucherPartnerFilter, setVoucherPartnerFilter] = useState<VoucherPartnerFilter>('all')
  const [voucherReportFilter, setVoucherReportFilter] = useState<VoucherReportFilter>('all')
  const vouchersState = useVouchers(voucherStatusFilter, voucherPartnerFilter, voucherReportFilter)

  useEffect(() => {
    if (voucherPartnerFilter === 'all') {
      return
    }

    if (partnersState.status !== 'success') {
      return
    }

    const partnerExists = partnersState.data.some((partner) => partner.id === voucherPartnerFilter)
    if (!partnerExists) {
      setVoucherPartnerFilter('all')
    }
  }, [partnersState, voucherPartnerFilter])
  useEffect(() => {
    if (voucherReportFilter === 'all') {
      return
    }

    if (reportsState.status !== 'success') {
      return
    }

    const reportExists = reportsState.data.some((report) => report.id === voucherReportFilter)
    if (!reportExists) {
      setVoucherReportFilter('all')
    }
  }, [reportsState, voucherReportFilter])
  useEffect(() => {
    if (reportsState.status !== 'success') {
      return
    }

    if (pendingPartnersReportId !== 'none') {
      const reportExists = reportsState.data.some((report) => report.id === pendingPartnersReportId)
      if (!reportExists) {
        const fallback = reportsState.data[0]
        setPendingPartnersReportId(fallback ? fallback.id : 'none')
      }
      return
    }

    const firstReport = reportsState.data[0]
    if (firstReport) {
      setPendingPartnersReportId(firstReport.id)
    }
  }, [pendingPartnersReportId, reportsState])
  useEffect(() => {
    setPendingPartnersPage(1)
  }, [pendingPartnersReportId])
  useEffect(() => {
    if (pendingPartnersState.status !== 'success') {
      return
    }

    const { totalPages } = pendingPartnersState.pagination
    if (totalPages === 0) {
      if (pendingPartnersPage !== 1) {
        setPendingPartnersPage(1)
      }
      return
    }

    if (pendingPartnersPage > totalPages) {
      setPendingPartnersPage(totalPages)
    }
  }, [pendingPartnersPage, pendingPartnersState])
  const dashboardStatsState = useDashboardStats()

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">App DisÁgua</h1>
        <p className="text-sm text-muted-foreground">Servidor: {health}</p>
      </header>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Resumo geral</h2>
          {dashboardStatsState.status === 'loading' && (
            <p className="text-sm text-muted-foreground">Carregando resumo...</p>
          )}
          {dashboardStatsState.status === 'error' && (
            <p className="text-sm text-red-600">Não foi possível carregar o resumo.</p>
          )}
          {dashboardStatsState.status === 'success' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <article className="rounded-lg border bg-background p-4 shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground">Parceiros cadastrados</h3>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatNumber(dashboardStatsState.data.partnersCount)}
                </p>
              </article>
              <article className="rounded-lg border bg-background p-4 shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground">Relatórios emitidos</h3>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatNumber(dashboardStatsState.data.reportsCount)}
                </p>
              </article>
              <article className="rounded-lg border bg-background p-4 shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground">Vouchers emitidos</h3>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatNumber(dashboardStatsState.data.vouchersCount)}
                </p>
              </article>
              <article className="rounded-lg border bg-background p-4 shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground">Vouchers resgatados</h3>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatNumber(dashboardStatsState.data.redeemedVouchersCount)}
                </p>
              </article>
              <article className="rounded-lg border bg-background p-4 shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground">Vouchers pendentes</h3>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatNumber(dashboardStatsState.data.pendingVouchersCount)}
                </p>
              </article>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-x-2">
          <Button>shadcn/ui Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-semibold">Parceiros cadastrados</h2>
            <div className="w-full sm:w-64">
              <label htmlFor="partners-search" className="sr-only">
                Buscar parceiros
              </label>
              <input
                id="partners-search"
                type="search"
                value={partnerSearch}
                onChange={(event) => setPartnerSearch(event.target.value)}
                placeholder="Buscar parceiros..."
                autoComplete="off"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">Filtrar por nome, documento ou email</p>
            </div>
          </div>
          {partnersState.status === 'loading' && (
            <p className="text-sm text-muted-foreground">Carregando parceiros...</p>
          )}
          {partnersState.status === 'error' && (
            <p className="text-sm text-red-600">Não foi possível carregar os parceiros.</p>
          )}
          {partnersState.status === 'success' && partnersState.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado.</p>
          )}
          {partnersState.status === 'success' && partnersState.data.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="px-4 py-3 text-left font-medium">Documento</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Criado em</th>
                    <th className="px-4 py-3 text-left font-medium">Atualizado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {partnersState.data.map((partner) => (
                    <tr key={partner.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{partner.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{partner.document}</td>
                      <td className="px-4 py-3 text-muted-foreground">{partner.email ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(partner.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(partner.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-semibold">Relatórios recentes</h2>
            <div className="w-full sm:w-64">
              <label htmlFor="reports-partner" className="sr-only">
                Filtrar relatórios por parceiro
              </label>
              <select
                id="reports-partner"
                value={reportPartnerFilter === 'all' ? 'all' : String(reportPartnerFilter)}
                onChange={(event) => {
                  const nextValue = event.target.value
                  if (nextValue === 'all') {
                    setReportPartnerFilter('all')
                    return
                  }

                  const parsedPartnerId = Number.parseInt(nextValue, 10)
                  if (!Number.isNaN(parsedPartnerId)) {
                    setReportPartnerFilter(parsedPartnerId)
                  }
                }}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                disabled={partnersState.status === 'loading'}
              >
                <option value="all">Todos os parceiros</option>
                {partnersState.status === 'success' &&
                  partnersState.data.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Filtrar relatórios por parceiro</p>
            </div>
          </div>
          {reportsState.status === 'loading' && (
            <p className="text-sm text-muted-foreground">Carregando relatórios...</p>
          )}
          {reportsState.status === 'error' && (
            <p className="text-sm text-red-600">Não foi possível carregar os relatórios.</p>
          )}
          {reportsState.status === 'success' && reportsState.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum relatório disponível.</p>
          )}
      {reportsState.status === 'success' && reportsState.data.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {reportsState.data.map((report) => (
            <article key={report.id} className="rounded-lg border bg-background p-4 shadow-sm">
              <header className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {report.partner.name}
                </p>
                <h3 className="text-base font-semibold text-foreground">{report.title}</h3>
              </header>
              <p className="mt-2 text-sm text-muted-foreground">
                {report.summary ?? 'Sem resumo disponível.'}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Emitido em {formatDateTime(report.issuedAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  </section>

      <section className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Parceiros pendentes</h2>
              <p className="text-sm text-muted-foreground">
                Parceiros sem vouchers “Válido” para o relatório selecionado.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-end">
              <div className="w-full lg:w-64">
                <label htmlFor="pending-report" className="sr-only">
                  Selecionar relatório de referência
                </label>
                <select
                  id="pending-report"
                  value={pendingPartnersReportId === 'none' ? 'none' : String(pendingPartnersReportId)}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    if (nextValue === 'none') {
                      setPendingPartnersReportId('none')
                      setPendingPartnersPage(1)
                      return
                    }

                    const parsedId = Number.parseInt(nextValue, 10)
                    if (!Number.isNaN(parsedId)) {
                      setPendingPartnersReportId(parsedId)
                      setPendingPartnersPage(1)
                    }
                  }}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={reportsState.status === 'loading'}
                >
                  <option value="none">Selecione um relatório</option>
                  {reportsState.status === 'success' &&
                    reportsState.data.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.title}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Escolha o relatório para verificar pendências</p>
              </div>
              <div className="w-full lg:w-64">
                <label htmlFor="pending-partners-search" className="sr-only">
                  Buscar parceiros pendentes
                </label>
                <input
                  id="pending-partners-search"
                  type="search"
                  value={pendingPartnersSearch}
                  onChange={(event) => {
                    setPendingPartnersSearch(event.target.value)
                    setPendingPartnersPage(1)
                  }}
                  placeholder="Buscar por nome, documento ou email..."
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  autoComplete="off"
                  disabled={pendingPartnersReportId === 'none'}
                />
                <p className="mt-1 text-xs text-muted-foreground">Filtre os parceiros pendentes</p>
              </div>
            </div>
          </div>
          {pendingPartnersReportId === 'none' && (
            <p className="text-sm text-muted-foreground">
              Selecione um relatório para visualizar os parceiros sem vouchers válidos.
            </p>
          )}
          {pendingPartnersReportId !== 'none' && pendingPartnersState.status === 'loading' && (
            <p className="text-sm text-muted-foreground">Carregando parceiros pendentes...</p>
          )}
          {pendingPartnersState.status === 'error' && (
            <p className="text-sm text-red-600">Não foi possível carregar os parceiros pendentes.</p>
          )}
          {pendingPartnersState.status === 'success' && pendingPartnersState.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum parceiro pendente encontrado para este relatório.</p>
          )}
          {pendingPartnersState.status === 'success' && pendingPartnersState.data.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Parceiro</th>
                    <th className="px-4 py-3 text-left font-medium">Documento</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Vouchers do relatório</th>
                    <th className="px-4 py-3 text-left font-medium">Vouchers resgatados</th>
                    <th className="px-4 py-3 text-left font-medium">Último voucher</th>
                    <th className="px-4 py-3 text-left font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {pendingPartnersState.data.map((partner) => {
                    const stats = partner.reportVoucherStats
                    const statusLabel = describePendingPartnerStatus(stats)
                    const statusVariant = getPendingPartnerStatusVariant(stats)
                    const statusClasses =
                      statusVariant === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : statusVariant === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'

                    return (
                      <tr key={partner.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{partner.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{partner.document}</td>
                        <td className="px-4 py-3 text-muted-foreground">{partner.email ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{stats.total}</td>
                        <td className="px-4 py-3 text-muted-foreground">{stats.redeemed}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {stats.lastIssuedAt ? formatDateTime(stats.lastIssuedAt) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pendingPartnersState.status === 'success' && pendingPartnersState.pagination.totalPages > 1 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Página {pendingPartnersState.pagination.page} de {pendingPartnersState.pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingPartnersPage((current) => Math.max(1, current - 1))}
                  disabled={pendingPartnersPage <= 1}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPendingPartnersPage((current) =>
                      Math.min(pendingPartnersState.pagination.totalPages, current + 1)
                    )
                  }
                  disabled={pendingPartnersPage >= pendingPartnersState.pagination.totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-semibold">Vouchers emitidos</h2>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
              <div className="w-full sm:w-48">
                <label htmlFor="vouchers-report" className="sr-only">
                  Filtrar vouchers por relatório
                </label>
                <select
                  id="vouchers-report"
                  value={voucherReportFilter === 'all' ? 'all' : String(voucherReportFilter)}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    if (nextValue === 'all') {
                      setVoucherReportFilter('all')
                      return
                    }

                    const parsedReportId = Number.parseInt(nextValue, 10)
                    if (!Number.isNaN(parsedReportId)) {
                      setVoucherReportFilter(parsedReportId)
                    }
                  }}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={reportsState.status === 'loading'}
                >
                  <option value="all">Todos os relatórios</option>
                  {reportsState.status === 'success' &&
                    reportsState.data.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.title}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Filtrar vouchers por relatório</p>
              </div>
              <div className="w-full sm:w-48">
                <label htmlFor="vouchers-partner" className="sr-only">
                  Filtrar vouchers por parceiro
                </label>
                <select
                  id="vouchers-partner"
                  value={voucherPartnerFilter === 'all' ? 'all' : String(voucherPartnerFilter)}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    if (nextValue === 'all') {
                      setVoucherPartnerFilter('all')
                      return
                    }

                    const parsedPartnerId = Number.parseInt(nextValue, 10)
                    if (!Number.isNaN(parsedPartnerId)) {
                      setVoucherPartnerFilter(parsedPartnerId)
                    }
                  }}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={partnersState.status === 'loading'}
                >
                  <option value="all">Todos os parceiros</option>
                  {partnersState.status === 'success' &&
                    partnersState.data.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Filtrar vouchers por parceiro</p>
              </div>
              <div className="w-full sm:w-48">
                <label htmlFor="vouchers-status" className="sr-only">
                  Filtrar vouchers por status
                </label>
                <select
                  id="vouchers-status"
                  value={voucherStatusFilter}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    if (nextValue === 'all' || nextValue === 'redeemed' || nextValue === 'pending') {
                      setVoucherStatusFilter(nextValue)
                    }
                  }}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">Todos os vouchers</option>
                  <option value="redeemed">Apenas resgatados</option>
                  <option value="pending">Apenas pendentes</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Filtrar vouchers por status</p>
              </div>
            </div>
          </div>
          {vouchersState.status === 'loading' && (
            <p className="text-sm text-muted-foreground">Carregando vouchers...</p>
          )}
          {vouchersState.status === 'error' && (
            <p className="text-sm text-red-600">Não foi possível carregar os vouchers.</p>
          )}
          {vouchersState.status === 'success' && vouchersState.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum voucher disponível.</p>
          )}
          {vouchersState.status === 'success' && vouchersState.data.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Código</th>
                    <th className="px-4 py-3 text-left font-medium">Parceiro</th>
                    <th className="px-4 py-3 text-left font-medium">Relatório</th>
                    <th className="px-4 py-3 text-left font-medium">Emitido em</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {vouchersState.data.map((voucher) => {
                    const status = getVoucherStatus(voucher.redeemedAt)

                    return (
                      <tr key={voucher.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{voucher.code}</td>
                        <td className="px-4 py-3 text-muted-foreground">{voucher.partner.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {voucher.report ? voucher.report.title : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(voucher.issuedAt)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              status.variant === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <AuditLogsPanel />
    </div>
  )
}

