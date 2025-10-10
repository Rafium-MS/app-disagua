import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Filter, Plus } from 'lucide-react'

import { DataTable, type ColumnConfig } from '@/components/DataTable'
import { DrawerForm } from '@/components/DrawerForm'
import { EmptyState } from '@/components/EmptyState'
import { FilterBar, FilterSelect, FilterToggle } from '@/components/FilterBar'
import { StatusBadge } from '@/components/StatusBadge'
import type { RouteComponentProps } from '@/types/router'
import { partnersSeed, type Partner } from '@/hooks/usePartners'
import { PartnerForm, type PartnerFormValues } from './PartnerForm'
import { Dialog } from '@/components/ui/dialog'

export function PartnersPage({ navigate, query }: RouteComponentProps) {
  const [partners, setPartners] = useState<Partner[]>(partnersSeed)
  const [filters, setFilters] = useState({
    state: query.get('state') ?? 'all',
    status: (query.get('status') as 'all' | 'ativo' | 'inativo') ?? 'all',
    hasPending: query.get('hasPending') === 'true',
    search: query.get('search') ?? '',
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const filteredPartners = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()
    return partners.filter((partner) => {
      if (filters.state !== 'all' && partner.state !== filters.state) {
        return false
      }
      if (filters.status !== 'all' && partner.status !== filters.status) {
        return false
      }
      if (filters.hasPending && partner.pendingCount === 0) {
        return false
      }
      if (
        normalizedSearch.length > 0 &&
        !partner.name.toLowerCase().includes(normalizedSearch) &&
        !partner.email.toLowerCase().includes(normalizedSearch)
      ) {
        return false
      }
      return true
    })
  }, [partners, filters])

  const columns: ColumnConfig<Partner>[] = [
    { key: 'name', header: 'Parceiro', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'state', header: 'UF', sortable: true },
    {
      key: 'stores',
      header: 'Lojas',
      sortable: true,
      align: 'center',
      render: (partner) => <span className="font-medium text-slate-200">{partner.stores}</span>,
    },
    {
      key: 'activeReports',
      header: 'Relatórios Ativos',
      align: 'center',
      render: (partner) => <span>{partner.activeReports}</span>,
    },
    {
      key: 'pendingCount',
      header: 'Pendências',
      align: 'center',
      render: (partner) => (
        <StatusBadge
          status={partner.pendingCount > 0 ? `${partner.pendingCount} pendências` : 'Sem pendências'}
          tone={partner.pendingCount > 0 ? 'amber' : 'emerald'}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (partner) => new Date(partner.createdAt).toLocaleDateString('pt-BR'),
    },
    {
      key: 'status',
      header: 'Ações',
      render: (partner) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingPartner(partner)
              setDrawerOpen(true)
            }}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-emerald-300"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => toggleStatus(partner.id)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-amber-300"
          >
            {partner.status === 'ativo' ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/stores?partner=${partner.id}`)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500"
          >
            Ver lojas
          </button>
        </div>
      ),
    },
  ]

  const toggleStatus = (partnerId: string) => {
    setPartners((previous) =>
      previous.map((partner) =>
        partner.id === partnerId
          ? { ...partner, status: partner.status === 'ativo' ? 'inativo' : 'ativo' }
          : partner,
      ),
    )
  }

  const handleSavePartner = (values: PartnerFormValues) => {
    if (editingPartner) {
      setPartners((previous) =>
        previous.map((partner) => (partner.id === editingPartner.id ? { ...partner, ...values } : partner)),
      )
    } else {
      setPartners((previous) => [
        ...previous,
        {
          id: `p-${String(previous.length + 1).padStart(3, '0')}`,
          name: values.name,
          email: values.email,
          state: values.state,
          status: values.status,
          stores: 0,
          activeReports: 0,
          pendingCount: 0,
          createdAt: new Date().toISOString(),
        },
      ])
    }
    setDrawerOpen(false)
    setEditingPartner(null)
  }

  const handleBulkDeactivate = () => {
    setPartners((previous) =>
      previous.map((partner) =>
        selectedIds.includes(partner.id) ? { ...partner, status: 'inativo' } : partner,
      ),
    )
    setSelectedIds([])
  }

  const handleExport = () => {
    const header = 'Parceiro,Email,UF,Lojas,RelatoriosAtivos,Pendencias,Status\n'
    const csv =
      header +
      filteredPartners
        .map((partner) =>
          [
            partner.name,
            partner.email,
            partner.state,
            partner.stores,
            partner.activeReports,
            partner.pendingCount,
            partner.status,
          ].join(','),
        )
        .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'parceiros.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-100">Parceiros</h1>
            <p className="text-sm text-slate-400">
              Centralize o cadastro e acompanhe pendências por parceiro.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end md:w-auto">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4" /> Importar CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPartner(null)
                setDrawerOpen(true)
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Novo Parceiro
            </button>
          </div>
        </div>
        <FilterBar
          searchPlaceholder="Buscar por nome ou e-mail"
          searchValue={filters.search}
          onSearchChange={(value) => setFilters((previous) => ({ ...previous, search: value }))}
          actions={
            selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkDeactivate}
                  className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200"
                >
                  <Filter className="h-3 w-3" /> Desativar em massa
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200"
                >
                  <Download className="h-3 w-3" /> Exportar CSV
                </button>
              </div>
            )
          }
        >
          <FilterSelect
            label="UF"
            value={filters.state}
            onChange={(value) => setFilters((previous) => ({ ...previous, state: value }))}
            options={['all', 'SP', 'MG', 'RJ', 'PR', 'RS'].map((state) => ({
              label: state === 'all' ? 'Todas' : state,
              value: state,
            }))}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(value) =>
              setFilters((previous) => ({ ...previous, status: value as 'all' | 'ativo' | 'inativo' }))
            }
            options={[
              { label: 'Todos', value: 'all' },
              { label: 'Ativos', value: 'ativo' },
              { label: 'Inativos', value: 'inativo' },
            ]}
          />
          <FilterToggle
            label="Com pendências"
            active={filters.hasPending}
            onToggle={(active) => setFilters((previous) => ({ ...previous, hasPending: active }))}
          />
        </FilterBar>
      </header>

      {filteredPartners.length === 0 ? (
        <EmptyState
          title="Nenhum parceiro ainda"
          description="Cadastre parceiros manualmente ou importe uma planilha CSV para começar."
          action={
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
              >
                Cadastrar parceiro
              </button>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200"
              >
                Importar CSV
              </button>
            </div>
          }
        />
      ) : (
        <DataTable
          data={filteredPartners}
          columns={columns}
          selectable
          onSelectionChange={setSelectedIds}
          getRowId={(partner) => partner.id}
          footer={<span>{filteredPartners.length} parceiros encontrados</span>}
        />
      )}

      <DrawerForm
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingPartner(null)
        }}
        title={editingPartner ? 'Editar parceiro' : 'Novo parceiro'}
        description="Use os campos abaixo para manter o cadastro sempre atualizado."
        onSubmit={(event) => {
          event.preventDefault()
        }}
        footer={null}
      >
        <PartnerForm
          defaultValues={editingPartner ?? undefined}
          onSubmit={(values) => {
            handleSavePartner(values)
          }}
        />
      </DrawerForm>

      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importar parceiros via CSV"
        description="Mapeie as colunas nome, email e UF para concluir a importação."
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Importar arquivo
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            Envie um arquivo CSV com cabeçalhos <strong>nome</strong>, <strong>email</strong> e <strong>uf</strong>.
            Você poderá revisar e mapear as colunas antes de concluir.
          </p>
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-4 py-6 text-center text-xs text-slate-400">
            Arraste e solte o arquivo CSV aqui.
          </div>
        </div>
      </Dialog>
    </div>
  )
}
