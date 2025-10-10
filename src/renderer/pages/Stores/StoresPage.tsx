import { useEffect, useMemo, useState } from 'react'
import { Building2, RefreshCw, Upload, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useNavigate } from '@/routes/RouterProvider'
import { useToast } from '@/components/ui/toast'
import type { StoreProductType } from '@shared/store-utils'
import { storeProductLabels } from '@shared/store-utils'

const LOCAL_STORAGE_KEY = 'stores-filters-v1'

const statusLabels: Record<'ACTIVE' | 'INACTIVE', string> = {
  ACTIVE: 'Ativa',
  INACTIVE: 'Inativa',
}

type PartnerOption = {
  id: number
  name: string
}

type StoreListItem = {
  id: string
  name: string
  city: string
  state: string
  mall?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  externalCode?: string | null
  cnpj?: string | null
  updatedAt: string
  partner?: { id: number; name: string | null } | null
  brand?: { id: string; name: string | null } | null
  prices: Array<{ product: StoreProductType; unitCents: number }>
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type FiltersState = {
  partnerId: string
  brandId: string
  city: string
  state: string
  mall: string
  status: 'ALL' | 'ACTIVE' | 'INACTIVE'
  q: string
  page: number
}

const initialFilters: FiltersState = {
  partnerId: '',
  brandId: '',
  city: '',
  state: '',
  mall: '',
  status: 'ALL',
  q: '',
  page: 1,
}

function formatCurrency(value?: number | null) {
  if (value == null) {
    return '—'
  }
  return (value / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

function getPrimaryPrice(prices: StoreListItem['prices']) {
  const priority: StoreProductType[] = ['GALAO_20L', 'GALAO_10L', 'PET_1500ML', 'CAIXA_COPO', 'VASILHAME']
  for (const product of priority) {
    const match = prices.find((price) => price.product === product)
    if (match) {
      return `${storeProductLabels[product]} · ${formatCurrency(match.unitCents)}`
    }
  }
  return prices.length > 0 ? `${storeProductLabels[prices[0].product]} · ${formatCurrency(prices[0].unitCents)}` : '—'
}

export function StoresPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [stores, setStores] = useState<StoreListItem[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])
  const [filters, setFilters] = useState<FiltersState>(() => {
    if (typeof window === 'undefined') {
      return initialFilters
    }
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!stored) return initialFilters
      const parsed = JSON.parse(stored)
      return { ...initialFilters, ...parsed }
    } catch (error) {
      console.warn('Não foi possível restaurar filtros salvos', error)
      return initialFilters
    }
  })
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [brandsLoading, setBrandsLoading] = useState(false)

  useEffect(() => {
    async function loadPartners() {
      try {
        const response = await fetch('/api/partners?page=1&pageSize=200')
        if (!response.ok) throw new Error('Erro ao carregar parceiros')
        const payload = await response.json()
        setPartners(payload.data ?? [])
      } catch (error) {
        console.error(error)
        toast({ title: 'Erro ao carregar parceiros', variant: 'error' })
      }
    }
    loadPartners()
  }, [toast])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...filters, page: filters.page }))
  }, [filters])

  useEffect(() => {
    if (!filters.partnerId) {
      setBrands([])
      return
    }
    const controller = new AbortController()
    async function loadBrands() {
      setBrandsLoading(true)
      try {
        const params = new URLSearchParams({ partnerId: filters.partnerId, pageSize: '200' })
        const response = await fetch(`/api/brands?${params.toString()}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Falha ao carregar marcas')
        const payload = await response.json()
        setBrands(payload.data ?? [])
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error)
          toast({ title: 'Erro ao carregar marcas', variant: 'error' })
        }
      } finally {
        setBrandsLoading(false)
      }
    }
    loadBrands()
    return () => controller.abort()
  }, [filters.partnerId, toast])

  useEffect(() => {
    const controller = new AbortController()
    async function loadStores() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(filters.page),
          pageSize: '20',
        })
        if (filters.partnerId) params.set('partnerId', filters.partnerId)
        if (filters.brandId) params.set('brandId', filters.brandId)
        if (filters.city) params.set('city', filters.city)
        if (filters.state) params.set('state', filters.state.toUpperCase())
        if (filters.mall) params.set('mall', filters.mall)
        if (filters.status !== 'ALL') params.set('status', filters.status)
        if (filters.q) params.set('q', filters.q)

        const response = await fetch(`/api/stores?${params.toString()}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Erro ao carregar lojas')
        const payload = await response.json()
        setStores(payload.data ?? [])
        setPagination(payload.pagination ?? { page: filters.page, pageSize: 20, total: 0, totalPages: 0 })
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error)
          toast({ title: 'Erro ao carregar lojas', variant: 'error' })
        }
      } finally {
        setLoading(false)
      }
    }
    loadStores()
    return () => controller.abort()
  }, [filters, toast])

  const brandOptions = useMemo(() => [{ id: '', name: 'Todas' }, ...brands], [brands])

  const handleFilterChange = (patch: Partial<FiltersState>) => {
    setFilters((previous) => {
      const next = { ...previous, ...patch }
      if (!('page' in patch)) {
        next.page = 1
      }
      return next
    })
  }

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const q = String(formData.get('search') ?? '')
    handleFilterChange({ q })
  }

  const handleRefresh = () => {
    setFilters((previous) => ({ ...previous }))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Lojas</h1>
          <p className="text-sm text-fg/60">
            Cadastre e acompanhe os pontos de venda vinculados aos parceiros para controlar preços e comprovantes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
          <Button variant="outline" onClick={() => navigate('/stores/duplicates')} className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Duplicadas
          </Button>
          <Button variant="outline" onClick={() => navigate('/stores/import')} className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Importar XLSX
          </Button>
          <Button onClick={() => navigate('/stores/new')} className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Nova loja
          </Button>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card/40 p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="partner" className="text-sm font-medium text-fg/80">
                Parceiro
              </label>
              <select
                id="partner"
                value={filters.partnerId}
                onChange={(event) => handleFilterChange({ partnerId: event.target.value, brandId: '' })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Todos</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="brand" className="text-sm font-medium text-fg/80">
                Marca
              </label>
              <select
                id="brand"
                value={filters.brandId}
                onChange={(event) => handleFilterChange({ brandId: event.target.value })}
                disabled={!filters.partnerId || brandsLoading}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {brandOptions.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.id === '' ? 'Todas' : brand.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="status" className="text-sm font-medium text-fg/80">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(event) => handleFilterChange({ status: event.target.value as FiltersState['status'] })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Ativas</option>
                <option value="INACTIVE">Inativas</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="city" className="text-sm font-medium text-fg/80">
                Cidade
              </label>
              <input
                id="city"
                type="text"
                value={filters.city}
                onChange={(event) => handleFilterChange({ city: event.target.value })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="state" className="text-sm font-medium text-fg/80">
                UF
              </label>
              <input
                id="state"
                type="text"
                value={filters.state}
                maxLength={2}
                onChange={(event) => handleFilterChange({ state: event.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="mall" className="text-sm font-medium text-fg/80">
                Shopping
              </label>
              <input
                id="mall"
                type="text"
                value={filters.mall}
                onChange={(event) => handleFilterChange({ mall: event.target.value })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="search" className="text-sm font-medium text-fg/80">
                Busca rápida
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="search"
                  name="search"
                  defaultValue={filters.q}
                  placeholder="Nome, código, cidade..."
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <Button type="submit" variant="outline" className="px-3">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/60 text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-wide text-fg/60">
              <tr>
                <th className="px-4 py-3 text-left">Loja</th>
                <th className="px-4 py-3 text-left">Parceiro</th>
                <th className="px-4 py-3 text-left">Marca</th>
                <th className="px-4 py-3 text-left">Localização</th>
                <th className="px-4 py-3 text-left">Preço destaque</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Atualizada em</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card/40">
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-fg">{store.name}</div>
                    <div className="text-xs text-fg/60">{store.externalCode || 'Sem código externo'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-fg">
                      {store.partner?.name ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-fg">
                      {store.brand?.name ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-fg/80">
                    <div>
                      {store.city}/{store.state}
                    </div>
                    {store.mall ? <div className="text-xs text-fg/60">{store.mall}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-fg/80">{getPrimaryPrice(store.prices)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        store.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-500/10 text-slate-300'
                      }`}
                    >
                      {statusLabels[store.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-fg/60">
                    {new Date(store.updatedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-fg">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/stores/${store.id}/edit`)}
                      >
                        Editar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {stores.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-fg/60">
                    Nenhuma loja encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-fg/60">
            <RefreshCw className="h-4 w-4 animate-spin" /> Carregando lojas...
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-sm text-fg/70">
        <div>
          Página {pagination.page} de {pagination.totalPages || 1} • {pagination.total} lojas no total
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange({ page: Math.max(1, pagination.page - 1) })}
            disabled={loading || pagination.page <= 1}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange({ page: Math.min(pagination.totalPages || 1, pagination.page + 1) })}
            disabled={loading || pagination.page >= (pagination.totalPages || 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
