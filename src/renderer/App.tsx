import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Partner = {
  id: number
  name: string
  document: string
  email: string | null
  createdAt: string
  updatedAt: string
}

type Report = {
  id: number
  title: string
  summary: string | null
  issuedAt: string
  partner: {
    id: number
    name: string
  }
}

type PartnersState =
  | { status: 'loading'; data: Partner[] }
  | { status: 'success'; data: Partner[] }
  | { status: 'error'; data: Partner[] }

type ReportsState =
  | { status: 'loading'; data: Report[] }
  | { status: 'success'; data: Report[] }
  | { status: 'error'; data: Report[] }

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

function useReports(): ReportsState {
  const [state, setState] = useState<ReportsState>({ status: 'loading', data: [] })

  useEffect(() => {
    fetch('http://localhost:5174/reports')
      .then((response) => response.json())
      .then((payload) => {
        const reports: Report[] = Array.isArray(payload.data) ? payload.data : []
        setState({ status: 'success', data: reports })
      })
      .catch(() => setState({ status: 'error', data: [] }))
  }, [])

  return state
}

function useVouchers(): VouchersState {
  const [state, setState] = useState<VouchersState>({ status: 'loading', data: [] })

  useEffect(() => {
    fetch('http://localhost:5174/vouchers')
      .then((response) => response.json())
      .then((payload) => {
        const vouchers: Voucher[] = Array.isArray(payload.data) ? payload.data : []
        setState({ status: 'success', data: vouchers })
      })
      .catch(() => setState({ status: 'error', data: [] }))
  }, [])

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
  const reportsState = useReports()
  const vouchersState = useVouchers()
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
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Relatórios recentes</h2>
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
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Vouchers emitidos</h2>
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
    </div>
  )
}

