import { useMemo, useState } from 'react'
import { Download, Link2, Plus } from 'lucide-react'

import { DataTable, type ColumnConfig } from '@/components/DataTable'
import { DrawerForm } from '@/components/DrawerForm'
import { EmptyState } from '@/components/EmptyState'
import { FilterBar, FilterSelect } from '@/components/FilterBar'
import { StatusBadge } from '@/components/StatusBadge'
import type { RouteComponentProps } from '@/types/router'
import { partnersSeed } from '@/hooks/usePartners'
import { storesSeed, type Store, type StoreStatus } from '@/hooks/useStores'
import { StoreForm, type StoreFormSubmitValues } from './StoreForm'
import { Dialog } from '@/components/ui/dialog'
import { brlToCents, centsToBRL } from '@shared/store-utils'
import type { StoreProductType } from '@shared/store-utils'

const normalizeOptional = (value?: string | null) => {
  if (value == null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const statusTone: Record<StoreStatus, 'emerald' | 'slate'> = {
  ACTIVE: 'emerald',
  INACTIVE: 'slate',
}

const primaryProduct: StoreProductType = 'GALAO_20L'

const formatPrimaryPrice = (prices: Store['prices']) => {
  const primary = prices.find((price) => price.product === primaryProduct) ?? prices[0]
  if (!primary) {
    return '—'
  }
  const formatted = centsToBRL(primary.unitValueCents)
  return formatted || '—'
}

export function StoresPage({ query }: RouteComponentProps) {
  const [stores, setStores] = useState<Store[]>(storesSeed)
  const [filters, setFilters] = useState({
    partnerId: query.get('partner') ?? 'all',
    city: '',
    state: 'all',
    status: 'all' as 'all' | StoreStatus,
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
      if (normalizedSearch.length > 0) {
        const matches = [
          store.name,
          store.externalCode ?? '',
          store.addressRaw,
          store.partnerName,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch))

        if (!matches) {
          return false
        }
      }

      return true
    })
  }, [stores, filters])

  const columns: ColumnConfig<Store>[] = [
    {
      key: 'name',
      header: 'Loja',
      sortable: true,
      render: (store) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-200">{store.name}</span>
          <span className="text-xs text-slate-400">{store.externalCode ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'partnerName',
      header: 'Parceiro',
      render: (store) => <span className="text-sm text-slate-200">{store.partnerName || '—'}</span>,
    },
    {
      key: 'city',
      header: 'Município / UF',
      render: (store) => (
        <div className="flex flex-col text-sm">
          <span className="text-slate-200">{store.city}</span>
          <span className="text-xs text-slate-400">{store.state}</span>
        </div>
      ),
    },
    {
      key: 'prices',
      header: 'Preço (20L)',
      render: (store) => <span className="text-sm text-slate-200">{formatPrimaryPrice(store.prices)}</span>,
    },
    {
      key: 'vouchersCount',
      header: 'Vouchers',
      render: (store) => <span className="text-sm text-slate-200">{store.vouchersCount}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (store) => (
        <StatusBadge
          status={store.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
          tone={statusTone[store.status]}
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
            {store.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      ),
    },
  ]

  const toggleStatus = (storeId: string) => {
    setStores((previous) =>
      previous.map((store) =>
        store.id === storeId
          ? {
              ...store,
              status: store.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
            }
          : store,
      ),
    )
  }

  const handleSaveStore = (values: StoreFormSubmitValues) => {
    const partnerName = values.partnerId
      ? partnersSeed.find((partner) => partner.id === values.partnerId)?.name ?? '—'
      : '—'

    const normalizedPrices = values.prices
      .map((price) => {
        const cents = brlToCents(price.unitValueBRL)
        if (cents == null) {
          return null
        }
        return {
          product: price.product,
          unitValueCents: cents,
        }
      })
      .filter((price): price is { product: StoreProductType; unitValueCents: number } => price !== null)

    const normalized = {
      partnerId: values.partnerId,
      partnerName,
      name: values.name.trim(),
      externalCode: normalizeOptional(values.externalCode),
      addressRaw: values.addressRaw.trim(),
      street: normalizeOptional(values.street),
      number: normalizeOptional(values.number),
      complement: normalizeOptional(values.complement),
      district: normalizeOptional(values.district),
      city: values.city.trim(),
      state: values.state,
      postalCode: normalizeOptional(values.postalCode),
      prices: normalizedPrices,
      status: values.status,
    }

    if (editingStore) {
      setStores((previous) =>
        previous.map((store) =>
          store.id === editingStore.id
            ? {
                ...store,
                ...normalized,
              }
            : store,
        ),
      )
    } else {
      setStores((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          ...normalized,
          lastVoucher: null,
          vouchersCount: 0,
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
    const header = 'Loja,Código,Parceiro,Município,UF,Preço (20L),Status\n'
    const csv =
      header +
      filteredStores
        .map((store) =>
          [
            store.name,
            store.externalCode ?? '',
            store.partnerName,
            store.city,
            store.state,
            formatPrimaryPrice(store.prices),
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
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Lojas</h1>
          <p className="text-sm text-slate-400">
            Cadastre pontos de coleta vinculados às marcas para acompanhar comprovantes e relatórios.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Nova loja
          </button>
          <button
            type="button"
            onClick={handleBulkLink}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Link2 className="h-4 w-4" /> Vincular a relatório
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
      </header>

      <FilterBar
        searchPlaceholder="Buscar por nome, código ou endereço"
        searchValue={filters.search}
        onSearchChange={(value) => setFilters((previous) => ({ ...previous, search: value }))}
      >
        <FilterSelect
          label="Parceiro"
          value={filters.partnerId}
          onChange={(value) => setFilters((previous) => ({ ...previous, partnerId: value }))}
          options={[{ label: 'Todos', value: 'all' }].concat(
            partnersSeed.map((partner) => ({ label: partner.name, value: partner.id })),
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
          onChange={(value) => setFilters((previous) => ({ ...previous, status: value as 'all' | StoreStatus }))}
          options={[
            { label: 'Todos', value: 'all' },
            { label: 'Ativas', value: 'ACTIVE' },
            { label: 'Inativas', value: 'INACTIVE' },
          ]}
        />
      </FilterBar>

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
          footer={<span>{filteredStores.length} loja(s) encontradas</span>}
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
        size="xl"
      >
        <StoreForm
          partners={partnersSeed.map((partner) => ({ id: partner.id, name: partner.name }))}
          defaultValues={
            editingStore
              ? {
                  partnerId: editingStore.partnerId ?? undefined,
                  name: editingStore.name,
                  externalCode: editingStore.externalCode ?? undefined,
                  addressRaw: editingStore.addressRaw,
                  street: editingStore.street ?? undefined,
                  number: editingStore.number ?? undefined,
                  complement: editingStore.complement ?? undefined,
                  district: editingStore.district ?? undefined,
                  city: editingStore.city,
                  state: editingStore.state,
                  postalCode: editingStore.postalCode ?? undefined,
                  status: editingStore.status,
                  prices: editingStore.prices.map((price) => ({
                    product: price.product,
                    unitValueCents: price.unitValueCents,
                  })),
                }
              : undefined
          }
          onCancel={() => {
            setDrawerOpen(false)
            setEditingStore(null)
          }}
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
