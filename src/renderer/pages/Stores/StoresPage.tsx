import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useRouteInfo } from '@/routes/RouterProvider'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { storeProductLabels } from '@shared/store-utils'
import { Loader2, Plus, Upload, Pencil, Trash2 } from 'lucide-react'
import { TableLoadingRow } from '@/components/TableSkeleton'
import { ErrorAlert } from '@/components/ui/error-alert'

type StoreListItem = {
  id: string
  name: string
  deliveryPlace: string
  city?: string | null
  state?: string | null
  mall?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  prices: Array<{ product: keyof typeof storeProductLabels; unitCents: number }>
  updatedAt: string
}

type StoreResponse = {
  data: StoreListItem[]
  pagination: {
    page: number
    size: number
    total: number
    totalPages: number
  }
}

type BrandDetails = {
  id: string
  name: string
  partner: { id: number; name: string }
}

type FiltersState = {
  city: string
  state: string
  mall: string
  status: 'ALL' | 'ACTIVE' | 'INACTIVE'
  q: string
  page: number
}

const initialFilters: FiltersState = {
  city: '',
  state: '',
  mall: '',
  status: 'ALL',
  q: '',
  page: 1,
}

function formatCurrency(cents?: number) {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function summarizePrices(prices: StoreListItem['prices']) {
  if (prices.length === 0) {
    return '—'
  }
  return prices
    .map((price) => `${storeProductLabels[price.product]}: ${formatCurrency(price.unitCents)}`)
    .join(' · ')
}

export function StoresPage() {
  const { params } = useRouteInfo()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [brand, setBrand] = useState<BrandDetails | null>(null)
  const [stores, setStores] = useState<StoreListItem[]>([])
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState<FiltersState>(initialFilters)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [brandError, setBrandError] = useState<Error | null>(null)
  const brandId = params.brandId

  useEffect(() => {
    let active = true
    async function loadBrand() {
      if (!brandId) return
      setBrandError(null)
      try {
        const response = await fetch(`/api/brands/${brandId}`)
        if (!response.ok) throw new Error('Não foi possível carregar a marca')
        const payload = (await response.json()) as BrandDetails
        if (active) {
          setBrand(payload)
        }
      } catch (error) {
        console.error(error)
        const err = error instanceof Error ? error : new Error('Erro ao carregar marca')
        if (active) {
          setBrandError(err)
          toast({ title: 'Erro ao carregar marca', variant: 'error' })
        }
      }
    }
    loadBrand()
    return () => {
      active = false
    }
  }, [brandId, toast])

  useEffect(() => {
    if (!brandId) {
      return
    }
    const controller = new AbortController()
    async function loadStores() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ brandId, page: String(filters.page), size: '20' })
        if (filters.city) params.set('city', filters.city)
        if (filters.state) params.set('state', filters.state)
        if (filters.mall) params.set('mall', filters.mall)
        if (filters.status !== 'ALL') params.set('status', filters.status)
        if (filters.q) params.set('q', filters.q)

        const response = await fetch(`/api/stores?${params.toString()}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Não foi possível carregar as lojas')
        const payload = (await response.json()) as StoreResponse
        setStores(payload.data ?? [])
        setPagination(payload.pagination ?? { page: filters.page, size: 20, total: 0, totalPages: 0 })
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error)
          const err = error instanceof Error ? error : new Error('Erro ao carregar lojas')
          setError(err)
          toast({ title: 'Erro ao carregar lojas', variant: 'error' })
        }
      } finally {
        setLoading(false)
      }
    }
    loadStores()
    return () => controller.abort()
  }, [brandId, filters, toast])

  const handleFilterChange = (patch: Partial<FiltersState>) => {
    setFilters((previous) => ({ ...previous, ...patch, page: patch.page ?? 1 }))
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (storeId: string) => {
    const confirmation = window.confirm('Deseja remover esta loja?')
    if (!confirmation) {
      return
    }
    setDeletingId(storeId)
    try {
      const response = await fetch(`/api/stores/${storeId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Não foi possível remover a loja')
      toast({ title: 'Loja removida com sucesso', variant: 'success' })
      setFilters((previous) => ({ ...previous }))
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro ao remover loja', variant: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  const partnerId = useMemo(() => (brand ? String(brand.partner.id) : ''), [brand])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Lojas</h1>
          <p className="text-sm text-fg/60">
            {brand ? `Marcas ${brand.name} · Parceiro ${brand.partner.name}` : 'Selecione uma marca para visualizar as lojas.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => navigate(`/stores/import?brandId=${brandId ?? ''}&partnerId=${partnerId}`)}
            variant="outline"
            className="flex items-center gap-2"
            disabled={!brandId}
          >
            <Upload className="h-4 w-4" /> Importar XLSX
          </Button>
          <Button
            onClick={() => navigate(`/stores/new?brandId=${brandId ?? ''}&partnerId=${partnerId}&brandName=${brand?.name ?? ''}`)}
            className="flex items-center gap-2"
            disabled={!brandId}
          >
            <Plus className="h-4 w-4" /> Nova loja
          </Button>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-fg/60">Cidade</span>
            <input
              type="text"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={filters.city}
              onChange={(event) => handleFilterChange({ city: event.target.value })}
              placeholder="Filtrar por cidade"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-fg/60">UF</span>
            <input
              type="text"
              maxLength={2}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm uppercase"
              value={filters.state}
              onChange={(event) => handleFilterChange({ state: event.target.value.toUpperCase() })}
              placeholder="UF"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-fg/60">Shopping</span>
            <input
              type="text"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={filters.mall}
              onChange={(event) => handleFilterChange({ mall: event.target.value })}
              placeholder="Filtrar por shopping"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-fg/60">Status</span>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={filters.status}
              onChange={(event) => handleFilterChange({ status: event.target.value as FiltersState['status'] })}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativas</option>
              <option value="INACTIVE">Inativas</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-xs uppercase text-fg/60">Buscar</span>
            <input
              type="text"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={filters.q}
              onChange={(event) => handleFilterChange({ q: event.target.value })}
              placeholder="Nome, cidade ou shopping"
            />
          </label>
        </div>
      </section>

      {error && (
        <ErrorAlert
          title="Erro ao carregar lojas"
          error={error}
          onRetry={() => setFilters((previous) => ({ ...previous }))}
        />
      )}

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-fg/70">
              <tr>
                <th className="px-4 py-3 font-medium">Loja</th>
                <th className="px-4 py-3 font-medium">Local de entrega</th>
                <th className="px-4 py-3 font-medium">Cidade/UF</th>
                <th className="px-4 py-3 font-medium">Shopping</th>
                <th className="px-4 py-3 font-medium">Preços</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-fg">
              {loading ? (
                <TableLoadingRow columns={7} />
              ) : stores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-fg/60">
                    Nenhuma loja encontrada
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{store.name}</td>
                    <td className="px-4 py-3 text-sm text-fg/70">{store.deliveryPlace}</td>
                    <td className="px-4 py-3">
                      {store.city || '—'}
                      {store.state ? `/${store.state}` : ''}
                    </td>
                    <td className="px-4 py-3">{store.mall ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-fg/70">{summarizePrices(store.prices)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          store.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
                        }`}
                      >
                        {store.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/stores/${store.id}/edit?brandId=${brandId ?? ''}`)}
                          className="flex items-center gap-2"
                          disabled={deletingId === store.id}
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(store.id)}
                          disabled={deletingId === store.id}
                          className="flex items-center gap-2"
                        >
                          {deletingId === store.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Remover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-fg/60">
          <span>
            Página {pagination.page} de {Math.max(pagination.totalPages ?? 1, 1)} · {pagination.total} registro(s)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((previous) => ({ ...previous, page: Math.max(previous.page - 1, 1) }))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= (pagination.totalPages || 1)}
              onClick={() =>
                setFilters((previous) => ({ ...previous, page: Math.min(previous.page + 1, pagination.totalPages || 1) }))
              }
            >
              Próxima
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
