import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

const voucherSchema = z.object({
  code: z.string().min(4, 'Informe um código com ao menos 4 caracteres'),
  partner: z.string().min(3, 'Informe o parceiro responsável'),
  report: z.string().optional(),
  status: z.enum(['pendente', 'resgatado'], {
    errorMap: () => ({ message: 'Selecione um status válido' }),
  }),
  issuedAt: z.string().min(1, 'Informe a data de emissão do voucher'),
})

type VoucherFormValues = z.infer<typeof voucherSchema>

type Voucher = {
  id: number
  code: string
  partner: string
  report: string | null
  status: 'pendente' | 'resgatado'
  issuedAt: string
  redeemedAt: string | null
}

const initialVouchers: Voucher[] = [
  {
    id: 1,
    code: 'VCH-001',
    partner: 'Águas do Norte',
    report: 'Entrega de vouchers Q1',
    status: 'resgatado',
    issuedAt: '2024-03-01T13:00:00Z',
    redeemedAt: '2024-03-15T17:45:00Z',
  },
  {
    id: 2,
    code: 'VCH-002',
    partner: 'Distribuidora Central',
    report: 'Auditoria de estoques',
    status: 'pendente',
    issuedAt: '2024-04-10T11:30:00Z',
    redeemedAt: null,
  },
  {
    id: 3,
    code: 'VCH-003',
    partner: 'Cooperativa Azul',
    report: 'Visitas de campo',
    status: 'pendente',
    issuedAt: '2024-04-22T09:20:00Z',
    redeemedAt: null,
  },
]

type SortConfig = {
  column: keyof Pick<Voucher, 'code' | 'partner' | 'status' | 'issuedAt'>
  direction: 'asc' | 'desc'
}

function formatDate(dateIso: string) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  return formatter.format(new Date(dateIso))
}

function toLocalInputValue(isoString: string) {
  const date = new Date(isoString)
  const tzOffset = date.getTimezoneOffset() * 60000
  const localDate = new Date(date.getTime() - tzOffset)
  return localDate.toISOString().slice(0, 16)
}

export function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers)
  const [search, setSearch] = useState('')
  const [partnerFilter, setPartnerFilter] = useState<'todos' | string>('todos')
  const [statusFilter, setStatusFilter] = useState<'todos' | Voucher['status']>('todos')
  const [sort, setSort] = useState<SortConfig>({ column: 'issuedAt', direction: 'desc' })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const { toast } = useToast()

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      code: '',
      partner: '',
      report: '',
      status: 'pendente',
      issuedAt: '',
    },
  })

  const filteredVouchers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filtered = vouchers.filter((voucher) => {
      const matchesSearch =
        !normalizedSearch ||
        voucher.code.toLowerCase().includes(normalizedSearch) ||
        voucher.partner.toLowerCase().includes(normalizedSearch)

      const matchesPartner = partnerFilter === 'todos' || voucher.partner === partnerFilter
      const matchesStatus = statusFilter === 'todos' || voucher.status === statusFilter

      return matchesSearch && matchesPartner && matchesStatus
    })

    const sorted = [...filtered].sort((a, b) => {
      const column = sort.column
      const direction = sort.direction === 'asc' ? 1 : -1
      const valueA = a[column]
      const valueB = b[column]
      return String(valueA).localeCompare(String(valueB), 'pt-BR') * direction
    })

    return sorted
  }, [vouchers, search, partnerFilter, statusFilter, sort])

  const uniquePartners = useMemo(() => Array.from(new Set(vouchers.map((voucher) => voucher.partner))), [vouchers])

  const openCreateModal = () => {
    setEditingVoucher(null)
    form.reset({ code: '', partner: '', report: '', status: 'pendente', issuedAt: '' })
    setIsDialogOpen(true)
  }

  const openEditModal = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    form.reset({
      code: voucher.code,
      partner: voucher.partner,
      report: voucher.report ?? '',
      status: voucher.status,
      issuedAt: toLocalInputValue(voucher.issuedAt),
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = form.handleSubmit((data) => {
    const normalizedReport = data.report?.trim() ? data.report.trim() : null
    const issuedAtIso = new Date(data.issuedAt).toISOString()
    const redeemedAtValue =
      data.status === 'resgatado'
        ? editingVoucher?.status === 'resgatado'
          ? editingVoucher.redeemedAt ?? new Date().toISOString()
          : new Date().toISOString()
        : null

    const payload = {
      ...data,
      report: normalizedReport,
      issuedAt: issuedAtIso,
      redeemedAt: redeemedAtValue,
    }

    if (editingVoucher) {
      setVouchers((previous) =>
        previous.map((voucher) =>
          voucher.id === editingVoucher.id
            ? { ...voucher, ...payload }
            : voucher
        )
      )
      toast({
        title: 'Voucher atualizado',
        description: `${data.code} foi salvo com sucesso.`,
        variant: 'success',
      })
    } else {
      const nextId = vouchers.length > 0 ? Math.max(...vouchers.map((voucher) => voucher.id)) + 1 : 1
      setVouchers((previous) => [...previous, { id: nextId, ...payload }])
      toast({
        title: 'Voucher criado',
        description: `${data.code} foi registrado e está disponível para distribuição.`,
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
          <h1 className="text-2xl font-semibold text-foreground">Vouchers</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre e acompanhe vouchers emitidos, status de resgate e vínculo com relatórios.
          </p>
        </div>
        <Button onClick={openCreateModal}>Novo voucher</Button>
      </header>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="voucher-search" className="sr-only">
              Buscar voucher
            </label>
            <input
              id="voucher-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código ou parceiro"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="voucher-partner-filter" className="sr-only">
              Filtrar por parceiro
            </label>
            <select
              id="voucher-partner-filter"
              value={partnerFilter}
              onChange={(event) => setPartnerFilter(event.target.value as 'todos' | string)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="todos">Todos os parceiros</option>
              {uniquePartners.map((partner) => (
                <option key={partner} value={partner}>
                  {partner}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="voucher-status-filter" className="sr-only">
              Filtrar por status
            </label>
            <select
              id="voucher-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'todos' | Voucher['status'])}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="resgatado">Resgatado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                {(
                  [
                    { key: 'code', label: 'Código' },
                    { key: 'partner', label: 'Parceiro' },
                    { key: 'status', label: 'Status' },
                    { key: 'issuedAt', label: 'Emitido em' },
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
                <th className="px-4 py-3 text-left font-medium">Relatório vinculado</th>
                <th className="px-4 py-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {filteredVouchers.map((voucher) => (
                <tr key={voucher.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{voucher.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{voucher.partner}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                        voucher.status === 'resgatado'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : 'border-blue-300 bg-blue-50 text-blue-900'
                      }`}
                    >
                      {voucher.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(voucher.issuedAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{voucher.report ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(voucher)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredVouchers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhum voucher encontrado.
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
        title={editingVoucher ? 'Editar voucher' : 'Novo voucher'}
        description="Cadastre ou atualize os dados do voucher. Os campos obrigatórios exibem mensagens em caso de erro."
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="voucher-form">
              {editingVoucher ? 'Salvar alterações' : 'Criar voucher'}
            </Button>
          </div>
        }
      >
        <form id="voucher-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="voucher-code" className="text-sm font-medium text-foreground">
              Código
            </label>
            <input
              id="voucher-code"
              {...form.register('code')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ex.: VCH-010"
            />
            {form.formState.errors.code && (
              <p className="text-xs text-red-600">{form.formState.errors.code.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="voucher-partner" className="text-sm font-medium text-foreground">
              Parceiro
            </label>
            <input
              id="voucher-partner"
              {...form.register('partner')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Nome do parceiro"
            />
            {form.formState.errors.partner && (
              <p className="text-xs text-red-600">{form.formState.errors.partner.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="voucher-report" className="text-sm font-medium text-foreground">
              Relatório vinculado (opcional)
            </label>
            <input
              id="voucher-report"
              {...form.register('report')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Informe o relatório relacionado"
            />
            {form.formState.errors.report && (
              <p className="text-xs text-red-600">{form.formState.errors.report.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="voucher-status" className="text-sm font-medium text-foreground">
              Status
            </label>
            <select
              id="voucher-status"
              {...form.register('status')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="pendente">Pendente</option>
              <option value="resgatado">Resgatado</option>
            </select>
            {form.formState.errors.status && (
              <p className="text-xs text-red-600">{form.formState.errors.status.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="voucher-issuedAt" className="text-sm font-medium text-foreground">
              Data de emissão
            </label>
            <input
              id="voucher-issuedAt"
              type="datetime-local"
              {...form.register('issuedAt')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {form.formState.errors.issuedAt && (
              <p className="text-xs text-red-600">{form.formState.errors.issuedAt.message}</p>
            )}
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export default VouchersPage
