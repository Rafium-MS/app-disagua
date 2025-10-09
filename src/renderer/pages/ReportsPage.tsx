import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@/lib/zod-resolver'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

const reportSchema = z.object({
  title: z.string().min(5, 'Informe um título descritivo'),
  partner: z.string().min(3, 'Selecione o parceiro responsável'),
  referenceMonth: z.string().min(7, 'Informe o mês/ano no formato MM/AAAA'),
  status: z.enum(['rascunho', 'em revisão', 'aprovado'], {
    errorMap: () => ({ message: 'Selecione um status válido' }),
  }),
  summary: z.string().min(10, 'Inclua um resumo com ao menos 10 caracteres'),
})

type ReportFormValues = z.infer<typeof reportSchema>

type Report = {
  id: number
  title: string
  partner: string
  referenceMonth: string
  status: 'rascunho' | 'em revisão' | 'aprovado'
  summary: string
  createdAt: string
  updatedAt: string
}

const initialReports: Report[] = [
  {
    id: 1,
    title: 'Entrega de vouchers Q1',
    partner: 'Águas do Norte',
    referenceMonth: '03/2024',
    status: 'aprovado',
    summary: 'Relatório final com consolidação de vouchers distribuídos no trimestre.',
    createdAt: '2024-04-02T12:00:00Z',
    updatedAt: '2024-04-10T08:32:00Z',
  },
  {
    id: 2,
    title: 'Auditoria de estoques',
    partner: 'Distribuidora Central',
    referenceMonth: '04/2024',
    status: 'em revisão',
    summary: 'Revisão das notas fiscais de abastecimento e conciliação.',
    createdAt: '2024-05-05T09:10:00Z',
    updatedAt: '2024-05-07T14:45:00Z',
  },
  {
    id: 3,
    title: 'Visitas de campo',
    partner: 'Cooperativa Azul',
    referenceMonth: '04/2024',
    status: 'rascunho',
    summary: 'Compilado inicial das visitas realizadas pelas equipes técnicas.',
    createdAt: '2024-05-12T16:10:00Z',
    updatedAt: '2024-05-12T16:10:00Z',
  },
]

type SortConfig = {
  column: keyof Pick<Report, 'title' | 'partner' | 'referenceMonth' | 'status'>
  direction: 'asc' | 'desc'
}

function formatDate(dateIso: string) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  return formatter.format(new Date(dateIso))
}

const statusBadges: Record<Report['status'], string> = {
  rascunho: 'border-amber-300 bg-amber-50 text-amber-900',
  'em revisão': 'border-blue-300 bg-blue-50 text-blue-900',
  aprovado: 'border-emerald-300 bg-emerald-50 text-emerald-900',
}

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | Report['status']>('todos')
  const [sort, setSort] = useState<SortConfig>({ column: 'title', direction: 'asc' })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const { toast } = useToast()

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: '',
      partner: '',
      referenceMonth: '',
      status: 'rascunho',
      summary: '',
    },
  })

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filtered = reports.filter((report) => {
      const matchesSearch =
        !normalizedSearch ||
        report.title.toLowerCase().includes(normalizedSearch) ||
        report.partner.toLowerCase().includes(normalizedSearch)

      const matchesStatus = statusFilter === 'todos' || report.status === statusFilter
      return matchesSearch && matchesStatus
    })

    const sorted = [...filtered].sort((a, b) => {
      const column = sort.column
      const direction = sort.direction === 'asc' ? 1 : -1
      return String(a[column]).localeCompare(String(b[column]), 'pt-BR') * direction
    })

    return sorted
  }, [reports, search, statusFilter, sort])

  const openCreateModal = () => {
    setEditingReport(null)
    form.reset({ title: '', partner: '', referenceMonth: '', status: 'rascunho', summary: '' })
    setIsDialogOpen(true)
  }

  const openEditModal = (report: Report) => {
    setEditingReport(report)
    form.reset({
      title: report.title,
      partner: report.partner,
      referenceMonth: report.referenceMonth,
      status: report.status,
      summary: report.summary,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = form.handleSubmit((data) => {
    if (editingReport) {
      setReports((previous) =>
        previous.map((report) =>
          report.id === editingReport.id
            ? { ...report, ...data, updatedAt: new Date().toISOString() }
            : report
        )
      )
      toast({
        title: 'Relatório atualizado',
        description: `${data.title} salvo com sucesso.`,
        variant: 'success',
      })
    } else {
      const nextId = reports.length > 0 ? Math.max(...reports.map((report) => report.id)) + 1 : 1
      const timestamp = new Date().toISOString()
      setReports((previous) => [
        ...previous,
        { id: nextId, ...data, createdAt: timestamp, updatedAt: timestamp },
      ])
      toast({
        title: 'Relatório criado',
        description: `${data.title} foi incluído na fila de acompanhamento.`,
        variant: 'success',
      })
    }

    setIsDialogOpen(false)
  })

  const handleSort = (column: SortConfig['column']) => {
    setSort((current) => {
      if (current.column === column) {
        return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { column, direction: 'asc' }
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Controle relatórios operacionais, status de aprovação e resumos das entregas.
          </p>
        </div>
        <Button onClick={openCreateModal}>Novo relatório</Button>
      </header>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="report-search" className="sr-only">
              Buscar relatório
            </label>
            <input
              id="report-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título ou parceiro"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="report-status-filter" className="sr-only">
              Filtrar por status
            </label>
            <select
              id="report-status-filter"
              value={statusFilter}
              onChange={(event) => {
                const value = event.target.value as 'todos' | Report['status']
                setStatusFilter(value)
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="todos">Todos os status</option>
              <option value="rascunho">Rascunho</option>
              <option value="em revisão">Em revisão</option>
              <option value="aprovado">Aprovado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                {(
                  [
                    { key: 'title', label: 'Título' },
                    { key: 'partner', label: 'Parceiro' },
                    { key: 'referenceMonth', label: 'Mês de referência' },
                    { key: 'status', label: 'Status' },
                  ] satisfies { key: SortConfig['column']; label: string }[]
                ).map((column) => (
                  <th key={column.key} className="px-4 py-3 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-2 text-left text-sm font-medium text-foreground"
                    >
                      {column.label}
                      {sort.column === column.key && (
                        <span className="text-xs text-muted-foreground">
                          {sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium">Atualizado em</th>
                <th className="px-4 py-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{report.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{report.partner}</td>
                  <td className="px-4 py-3 text-muted-foreground">{report.referenceMonth}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadges[report.status]}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(report.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(report)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhum relatório encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingReport ? 'Editar relatório' : 'Novo relatório'}
        description="Preencha os dados do relatório para registrar o acompanhamento."
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="report-form">
              {editingReport ? 'Salvar alterações' : 'Criar relatório'}
            </Button>
          </div>
        }
      >
        <form id="report-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="report-title" className="text-sm font-medium text-foreground">
              Título
            </label>
            <input
              id="report-title"
              {...form.register('title')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ex.: Relatório mensal de vouchers"
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="report-partner" className="text-sm font-medium text-foreground">
              Parceiro
            </label>
            <input
              id="report-partner"
              {...form.register('partner')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Nome do parceiro"
            />
            {form.formState.errors.partner && (
              <p className="text-xs text-red-600">{form.formState.errors.partner.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="report-reference" className="text-sm font-medium text-foreground">
              Mês de referência
            </label>
            <input
              id="report-reference"
              {...form.register('referenceMonth')}
              placeholder="MM/AAAA"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {form.formState.errors.referenceMonth && (
              <p className="text-xs text-red-600">{form.formState.errors.referenceMonth.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="report-status" className="text-sm font-medium text-foreground">
              Status
            </label>
            <select
              id="report-status"
              {...form.register('status')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="rascunho">Rascunho</option>
              <option value="em revisão">Em revisão</option>
              <option value="aprovado">Aprovado</option>
            </select>
            {form.formState.errors.status && (
              <p className="text-xs text-red-600">{form.formState.errors.status.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="report-summary" className="text-sm font-medium text-foreground">
              Resumo
            </label>
            <textarea
              id="report-summary"
              {...form.register('summary')}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Descreva os principais pontos acompanhados neste relatório"
            />
            {form.formState.errors.summary && (
              <p className="text-xs text-red-600">{form.formState.errors.summary.message}</p>
            )}
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export default ReportsPage
