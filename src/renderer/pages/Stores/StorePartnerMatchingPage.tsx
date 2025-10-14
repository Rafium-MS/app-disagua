import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw, Users2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useNavigate } from '@/routes/RouterProvider'

interface LocationFilters {
  states: string[]
  citiesByState: Record<string, string[]>
}

interface PartnerItem {
  id: number
  name: string
  city?: string | null
  state?: string | null
}

interface StoreItem {
  id: string
  name: string
  city: string
  state: string
  mall?: string | null
  partner?: { id: number; name: string | null } | null
}

export function StorePartnerMatchingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [locations, setLocations] = useState<LocationFilters | null>(null)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [stores, setStores] = useState<StoreItem[]>([])
  const [partners, setPartners] = useState<PartnerItem[]>([])
  const [loading, setLoading] = useState(false)
  const [draggingPartnerId, setDraggingPartnerId] = useState<number | null>(null)
  const [hoveredStoreId, setHoveredStoreId] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [updatingStores, setUpdatingStores] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const controller = new AbortController()
    async function loadLocations() {
      setLocationsLoading(true)
      try {
        const response = await fetch('/api/stores/filters/locations', { signal: controller.signal })
        if (!response.ok) throw new Error('Erro ao carregar estados e cidades')
        const payload = await response.json()
        const data: LocationFilters | null = payload?.data ?? null
        setLocations(data)
        if (data && data.states.length) {
          setSelectedState((current) => (current ? current : data.states[0] ?? ''))
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        console.error(error)
        toast({ title: 'Falha ao carregar filtros de localização', variant: 'error' })
      } finally {
        setLocationsLoading(false)
      }
    }
    loadLocations()
    return () => controller.abort()
  }, [toast])

  useEffect(() => {
    if (!selectedState) {
      setStores([])
      setPartners([])
      return
    }

    const storesController = new AbortController()
    const partnersController = new AbortController()

    async function loadData() {
      setLoading(true)
      try {
        const storeParams = new URLSearchParams({
          page: '1',
          pageSize: '200',
          state: selectedState,
          status: 'ACTIVE',
        })
        if (selectedCity) {
          storeParams.set('city', selectedCity)
        }

        const partnerParams = new URLSearchParams({
          page: '1',
          pageSize: '200',
          state: selectedState,
        })
        if (selectedCity) {
          partnerParams.set('city', selectedCity)
        }

        const [storesResponse, partnersResponse] = await Promise.all([
          fetch(`/api/stores?${storeParams.toString()}`, { signal: storesController.signal }),
          fetch(`/api/partners?${partnerParams.toString()}`, { signal: partnersController.signal }),
        ])

        if (!storesResponse.ok) throw new Error('Erro ao carregar lojas')
        if (!partnersResponse.ok) throw new Error('Erro ao carregar parceiros')

        const storesPayload = await storesResponse.json()
        const partnersPayload = await partnersResponse.json()

        setStores(storesPayload.data ?? [])
        setPartners(partnersPayload.data ?? [])
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        console.error(error)
        toast({ title: 'Não foi possível carregar os dados da localização selecionada', variant: 'error' })
      } finally {
        setLoading(false)
      }
    }

    loadData()

    return () => {
      storesController.abort()
      partnersController.abort()
    }
  }, [selectedState, selectedCity, refreshToken, toast])

  const availableCities = useMemo(() => {
    if (!selectedState || !locations) {
      return [] as string[]
    }
    return locations.citiesByState[selectedState] ?? []
  }, [locations, selectedState])

  const setStoreUpdating = (id: string, value: boolean) => {
    setUpdatingStores((previous) => ({ ...previous, [id]: value }))
  }

  const handlePartnerDrop = async (storeId: string, partnerId: number) => {
    const partner = partners.find((item) => item.id === partnerId)
    if (!partner) {
      toast({ title: 'Parceiro selecionado não encontrado', variant: 'error' })
      return
    }

    const store = stores.find((item) => item.id === storeId)
    if (store?.partner?.id === partnerId) {
      toast({ title: 'A loja já está vinculada a este parceiro', variant: 'info' })
      return
    }

    setStoreUpdating(storeId, true)
    try {
      const response = await fetch(`/api/stores/${storeId}/partner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId }),
      })
      if (!response.ok) {
        throw new Error('Falha ao combinar loja e parceiro')
      }

      setStores((previous) =>
        previous.map((item) =>
          item.id === storeId
            ? {
                ...item,
                partner: { id: partner.id, name: partner.name },
              }
            : item,
        ),
      )
      toast({ title: 'Loja vinculada ao parceiro com sucesso', variant: 'success' })
    } catch (error) {
      console.error(error)
      toast({ title: 'Não foi possível combinar a loja com o parceiro', variant: 'error' })
    } finally {
      setStoreUpdating(storeId, false)
    }
  }

  const handleRefresh = () => {
    setRefreshToken((value) => value + 1)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Combinar lojas e parceiros</h1>
          <p className="text-sm text-fg/70">
            Selecione um estado e, opcionalmente, uma cidade para visualizar as lojas e os parceiros disponíveis. Arraste um parceiro
            para uma loja para atualizar o vínculo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/stores')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para lojas
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar listas
          </Button>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="state" className="text-sm font-medium text-fg/80">
              Estado
            </label>
            <select
              id="state"
              value={selectedState}
              onChange={(event) => {
                setSelectedState(event.target.value)
                setSelectedCity('')
              }}
              disabled={locationsLoading || !locations?.states.length}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Selecione</option>
              {(locations?.states ?? []).map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="city" className="text-sm font-medium text-fg/80">
              Cidade
            </label>
            <select
              id="city"
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              disabled={!selectedState || !availableCities.length}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Todas</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedState ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-6 text-center text-sm text-fg/70">
          Escolha um estado para visualizar as lojas e os parceiros disponíveis para combinação.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card/40 p-4">
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Users2 className="h-4 w-4" /> Parceiros disponíveis
              </div>
              <span className="text-xs text-fg/60">Arraste para associar a uma loja</span>
            </header>
            <div className="flex max-h-[480px] flex-col gap-2 overflow-y-auto pr-1">
              {loading && partners.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg/60">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Carregando parceiros...
                </div>
              ) : partners.length === 0 ? (
                <div className="rounded-lg border border-border/60 bg-card/60 p-4 text-sm text-fg/70">
                  Nenhum parceiro encontrado para a localização selecionada.
                </div>
              ) : (
                partners.map((partner) => (
                  <button
                    key={partner.id}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', String(partner.id))
                      setDraggingPartnerId(partner.id)
                    }}
                    onDragEnd={() => {
                      setDraggingPartnerId(null)
                      setHoveredStoreId(null)
                    }}
                    className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-fg transition hover:border-emerald-400 hover:bg-card/60"
                  >
                    <span className="font-medium">{partner.name}</span>
                    <span className="text-xs text-fg/60">
                      {partner.city && partner.state ? `${partner.city}/${partner.state}` : partner.city || partner.state || 'Sem localização'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card/40 p-4">
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Users2 className="h-4 w-4" /> Lojas
              </div>
              <span className="text-xs text-fg/60">Solte o parceiro desejado sobre a loja</span>
            </header>
            <div className="flex max-h-[480px] flex-col gap-3 overflow-y-auto pr-1">
              {loading && stores.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg/60">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Carregando lojas...
                </div>
              ) : stores.length === 0 ? (
                <div className="rounded-lg border border-border/60 bg-card/60 p-4 text-sm text-fg/70">
                  Nenhuma loja encontrada para a localização selecionada.
                </div>
              ) : (
                stores.map((store) => {
                  const isUpdating = updatingStores[store.id]
                  const isActiveDropTarget = hoveredStoreId === store.id && draggingPartnerId != null
                  return (
                    <div
                      key={store.id}
                      onDragOver={(event) => {
                        if (draggingPartnerId != null) {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                        }
                      }}
                      onDragEnter={() => {
                        if (draggingPartnerId != null) {
                          setHoveredStoreId(store.id)
                        }
                      }}
                      onDragLeave={() => {
                        setHoveredStoreId((current) => (current === store.id ? null : current))
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        setHoveredStoreId(null)
                        const partnerIdRaw = event.dataTransfer.getData('text/plain')
                        const partnerId = Number(partnerIdRaw)
                        if (Number.isNaN(partnerId)) {
                          toast({ title: 'Não foi possível identificar o parceiro arrastado', variant: 'error' })
                          return
                        }
                        void handlePartnerDrop(store.id, partnerId)
                      }}
                      className={`rounded-lg border bg-card px-4 py-3 text-sm text-fg transition ${
                        isActiveDropTarget
                          ? 'border-emerald-400 bg-emerald-500/10'
                          : 'border-border hover:border-emerald-400 hover:bg-card/60'
                      } ${isUpdating ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-medium text-fg">{store.name}</div>
                          <div className="text-xs text-fg/60">
                            {store.city}/{store.state}
                            {store.mall ? ` • ${store.mall}` : ''}
                          </div>
                          <div className="text-xs text-fg/70">
                            Parceiro atual:{' '}
                            <span className="font-medium">{store.partner?.name ?? '—'}</span>
                          </div>
                        </div>
                        {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" /> : null}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default StorePartnerMatchingPage
