import { useMemo, useState } from 'react'
import { Download, Link2, Plus } from 'lucide-react'

import { DataTable, type ColumnConfig } from '@/components/DataTable'
import { DrawerForm } from '@/components/DrawerForm'
import { EmptyState } from '@/components/EmptyState'
import { FilterBar, FilterSelect } from '@/components/FilterBar'
import { StatusBadge } from '@/components/StatusBadge'
import type { RouteComponentProps } from '@/types/router'
import { storesSeed, type Store } from '@/hooks/useStores'
import { StoreForm, type StoreFormValues } from './StoreForm'
import { Dialog } from '@/components/ui/dialog'

export function StoresPage({ query }: RouteComponentProps) {
  const [stores, setStores] = useState<Store[]>(storesSeed)
  const [filters, setFilters] = useState({
    partnerId: query.get('partner') ?? 'all',
    city: '',
    state: 'all',
    status: 'all' as 'all' | 'ativa' | 'encerrada',
    search: '',
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)

  const filteredStores = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()
    return stores.filter((store) => {
      if (filters.partnerId !== 'all' && store.partnerId !== filters.partnerId) {
        return false
      }
      if (filters.city && !store.city.toLowerCase().includes(filters.city.toLowerCase())) {
        return false
      }
      if (filters.state !== 'all' && store.state !== filters.state) {
        return false
      }
      if (filters.status !== 'all' && store.status !== filters.status) {
        return false
      }
      if (
        normalizedSearch.length > 0 &&
        !store.name.toLowerCase().includes(normalizedSearch) &&
        !store.cnpj.replace(/\D/g, '').includes(normalizedSearch.replace(/\D/g, ''))
      ) {
        return false
      }
      return true
    })
  }, [stores, filters])

  const situationTone: Record<Store['situation'], 'emerald' | 'amber' | 'slate'> = {
    'em-dia': 'emerald',
    pendente: 'amber',
    'sem-relatorio': 'slate',
  }

  const columns: ColumnConfig<Store>[] = [
    { key: 'name', header: 'Loja', sortable: true },
    { key: 'cnpj', header: 'CNPJ' },
    {
      key: 'city',
      header: 'Cidade/UF',
      render: (store) => (
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-slate-200">{store.city}</span>
          <span className="text-xs text-slate-400">{store.state}</span>
        </div>
      ),
    },
    {
      key: 'partnerName',
      header: 'Parceiro',
      render: (store) => <span className="text-slate-200">{store.partnerName}</span>,
    },
    {
      key: 'lastVoucher',
      header: 'Último Comprovante',
      render: (store) => (store.lastVoucher ? new Date(store.lastVoucher).toLocaleDateString('pt-BR') : '—'),
    },
    {
      key: 'situation',
      header: 'Situação',
      render: (store) => (
        <StatusBadge
          status={
            store.situation === 'em-dia'
              ? 'Em dia'
              : store.situation === 'pendente'
              ? 'Pendente'
              : 'Sem relatório ativo'
          }
          tone={situationTone[store.situation]}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (store) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingStore(store)
              setDrawerOpen(true)
            }}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-emerald-300"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(true)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500"
          >
            Mover de parceiro
          </button>
          <button
            type="button"
            onClick={() => toggleStatus(store.id)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-amber-300"
          >
            {store.status === 'ativa' ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      ),
    },
  ]

  const toggleStatus = (storeId: string) => {
    setStores((previous) =>
      previous.map((store) =>
        store.id === storeId ? { ...store, status: store.status === 'ativa' ? 'encerrada' : 'ativa' } : store,
      ),
    )
  }

  const handleSaveStore = (values: StoreFormValues) => {
    if (editingStore) {
      setStores((previous) =>
        previous.map((store) => (store.id === editingStore.id ? { ...store, ...values } : store)),
      )
    } else {
      setStores((previous) => [
        ...previous,
        {
          id: `s-${String(previous.length + 1).padStart(2, '0')}`,
          name: values.name,
          cnpj: values.cnpj,
          city: values.city,
          state: values.state,
          partnerId: values.partner,
          partnerName: values.partner,
          lastVoucher: undefined,
          situation: 'em-dia',
          status: 'ativa',
        },
      ])
    }
    setDrawerOpen(false)
    setEditingStore(null)
  }

  const handleBulkLink = () => {
    setLinkOpen(true)
  }

  const handleExport = () => {
    const header = 'Loja,CNPJ,Cidade,UF,Parceiro,Situacao,Status\n'
    const csv =
      header +
      filteredStores
        .map((store) =>
          [
            store.name,
            store.cnpj,
            store.city,
            store.state,
            store.partnerName,
            store.situation,
            store.status,
          ].join(','),
        )
        .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'lojas.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Lojas</h1>
            <p className="text-sm text-slate-400">Administre filiais e mantenha o acompanhamento de comprovantes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingStore(null)
                setDrawerOpen(true)
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" /> Nova Loja
            </button>
          </div>
        </div>
        <FilterBar
          searchPlaceholder="Buscar por nome ou CNPJ"
          searchValue={filters.search}
          onSearchChange={(value) => setFilters((previous) => ({ ...previous, search: value }))}
          actions={
            selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkLink}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200"
                >
                  <Link2 className="h-3 w-3" /> Vincular a relatório
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
            label="Parceiro"
            value={filters.partnerId}
            onChange={(value) => setFilters((previous) => ({ ...previous, partnerId: value }))}
            options={[{ label: 'Todos', value: 'all' }].concat(
              ['p-001', 'p-002', 'p-003'].map((id) => ({
                label: id === 'p-001' ? 'Aquarius Group' : id === 'p-002' ? 'Fonte Viva' : 'Rio Claro Distribuidora',
                value: id,
              })),
            )}
          />
          <FilterSelect
            label="UF"
            value={filters.state}
            onChange={(value) => setFilters((previous) => ({ ...previous, state: value }))}
            options={['all', 'SP', 'MG', 'RJ', 'PR'].map((state) => ({
              label: state === 'all' ? 'Todas' : state,
              value: state,
            }))}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(value) => setFilters((previous) => ({ ...previous, status: value as 'all' | 'ativa' | 'encerrada' }))}
            options={[
              { label: 'Todos', value: 'all' },
              { label: 'Ativas', value: 'ativa' },
              { label: 'Encerradas', value: 'encerrada' },
            ]}
          />
        </FilterBar>
      </header>

      {filteredStores.length === 0 ? (
        <EmptyState
          title="Cadastre lojas para acompanhar comprovantes"
          description="Crie unidades vinculadas a parceiros para distribuir tarefas de envio de comprovantes."
          action={
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
            >
              Nova loja
            </button>
          }
        />
      ) : (
        <DataTable
          data={filteredStores}
          columns={columns}
          selectable
          getRowId={(store) => store.id}
          onSelectionChange={setSelectedIds}
          footer={<span>{filteredStores.length} lojas encontradas</span>}
        />
      )}

      <DrawerForm
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingStore(null)
        }}
        title={editingStore ? 'Editar loja' : 'Nova loja'}
        description="Preencha os campos para cadastrar ou atualizar a unidade."
        onSubmit={(event) => event.preventDefault()}
        footer={null}
      >
        <StoreForm
          defaultValues={
            editingStore
              ? {
                  name: editingStore.name,
                  cnpj: editingStore.cnpj,
                  city: editingStore.city,
                  state: editingStore.state,
                  partner: editingStore.partnerId,
                  contact: '',
                }
              : undefined
          }
          onSubmit={(values) => handleSaveStore(values)}
        />
      </DrawerForm>

      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Vincular lojas a relatório"
        description="Selecione o relatório ativo que receberá os comprovantes dessas lojas."
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLinkOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Vincular
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-slate-300">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Relatório</span>
            <select className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
              <option value="r-001">Abril/2024 - Região Sudeste</option>
              <option value="r-002">Março/2024 - Rede Nacional</option>
            </select>
          </label>
          <p className="text-xs text-slate-400">
            {selectedIds.length} loja(s) serão marcadas para enviar comprovantes para o relatório selecionado.
          </p>
        </div>
      </Dialog>
    </div>
  )
}
