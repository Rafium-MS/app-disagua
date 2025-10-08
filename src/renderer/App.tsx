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

function usePartners(): PartnersState {
  const [state, setState] = useState<PartnersState>({ status: 'loading', data: [] })

  useEffect(() => {
    fetch('http://localhost:5174/partners')
      .then((response) => response.json())
      .then((payload) => {
        const partners: Partner[] = Array.isArray(payload.data) ? payload.data : []
        setState({ status: 'success', data: partners })
      })
      .catch(() => setState({ status: 'error', data: [] }))
  }, [])

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

export default function App() {
  const health = useHealth()
  const partnersState = usePartners()
  const reportsState = useReports()

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">App DisÁgua</h1>
        <p className="text-sm text-muted-foreground">Servidor: {health}</p>
      </header>

      <section className="space-y-4">
        <div className="space-x-2">
          <Button>shadcn/ui Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Parceiros cadastrados</h2>
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
    </div>
  )
}

