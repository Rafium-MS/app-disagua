import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, RefreshCw, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useNavigate } from '@/routes/RouterProvider'
import { useToast } from '@/components/ui/toast'
import { MergeDialog, type DuplicateGroup } from '@/components/MergeDialog'

const reasonLabels: Record<DuplicateGroup['reason'], string> = {
  NAME_CITY: 'Nome e cidade semelhantes',
  CNPJ: 'CNPJ duplicado',
}

const statusLabels: Record<'ACTIVE' | 'INACTIVE', string> = {
  ACTIVE: 'Ativa',
  INACTIVE: 'Inativa',
}

type PartnerOption = {
  id: number
  name: string
}

export function StoreDuplicatesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [partnerFilter, setPartnerFilter] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null)

  useEffect(() => {
    async function loadPartners() {
      try {
        const response = await fetch('/api/partners?page=1&pageSize=200')
        if (!response.ok) throw new Error('Falha ao carregar parceiros')
        const payload = await response.json()
        setPartners(payload.data ?? [])
      } catch (error) {
        console.error(error)
        toast({ title: 'Não foi possível carregar os parceiros', variant: 'error' })
      }
    }
    loadPartners()
  }, [toast])

  const detectDuplicates = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        includeInactive,
      }
      if (partnerFilter) {
        body.partnerId = Number(partnerFilter)
      }

      const response = await fetch('/api/stores/detect-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Falha ao analisar duplicidades')
      }

      const payload = (await response.json()) as { data?: DuplicateGroup[] }
      const data = Array.isArray(payload.data) ? payload.data : []
      setGroups(data)
      setSelectedGroup(null)

      if (data.length === 0) {
        toast({
          title: 'Nenhuma duplicidade encontrada',
          description: 'Ajuste os filtros ou tente novamente mais tarde.',
          variant: 'default',
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao analisar duplicidades',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [includeInactive, partnerFilter, toast])

  useEffect(() => {
    detectDuplicates()
  }, [detectDuplicates])

  const summary = useMemo(() => {
    const totalStores = groups.reduce((accumulator, group) => accumulator + group.stores.length, 0)
    return { groups: groups.length, stores: totalStores }
  }, [groups])

  const handleMerge = useCallback(
    async ({ targetId, sourceIds, strategy }: { targetId: string; sourceIds: string[]; strategy: 'target' | 'source' | 'mostRecent' }) => {
      if (!selectedGroup) {
        return
      }

      setMerging(true)
      try {
        const response = await fetch('/api/stores/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId, sourceIds, fieldsStrategy: strategy }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'Falha ao mesclar lojas')
        }

        await response.json().catch(() => ({}))

        setGroups((previous) => previous.filter((group) => group.id !== selectedGroup.id))
        toast({ title: 'Lojas mescladas com sucesso', variant: 'success' })
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro ao mesclar lojas',
          description: error instanceof Error ? error.message : undefined,
          variant: 'error',
        })
        throw error
      } finally {
        setMerging(false)
      }
    },
    [selectedGroup, toast],
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-fg">Duplicidades de lojas</h1>
          <p className="text-sm text-fg/60">
            Identifique registros semelhantes por CNPJ, nome e cidade para consolidar informações e manter o cadastro limpo.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-fg/60">
            <span>Grupos: {summary.groups}</span>
            <span>Registros envolvidos: {summary.stores}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/stores')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para lojas
          </Button>
          <Button variant="outline" onClick={detectDuplicates} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Reprocessar
          </Button>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
        <h2 className="text-sm font-semibold text-fg">Filtros</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="partner" className="text-sm font-medium text-fg/80">
              Parceiro
            </label>
            <select
              id="partner"
              value={partnerFilter}
              onChange={(event) => setPartnerFilter(event.target.value)}
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
          <div className="flex items-center gap-2 pt-6">
            <input
              id="include-inactive"
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="include-inactive" className="text-sm text-fg/70">
              Incluir lojas inativas na análise
            </label>
          </div>
        </div>
        <Button
          type="button"
          onClick={detectDuplicates}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <Search className="h-4 w-4" /> Analisar duplicidades
        </Button>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card/40 p-4 text-sm text-fg/60">
            <RefreshCw className="h-4 w-4 animate-spin" /> Processando duplicidades...
          </div>
        ) : null}

        {groups.map((group) => (
          <div key={group.id} className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-fg">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="font-semibold">{reasonLabels[group.reason]}</span>
                <span className="text-xs text-fg/50">Confiança {Math.round(group.score * 100)}%</span>
              </div>
              <Button variant="outline" onClick={() => setSelectedGroup(group)} className="w-full sm:w-auto">
                Mesclar registros ({group.stores.length})
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.stores.map((store) => (
                <div key={store.id} className="rounded-lg border border-border/60 bg-card/40 p-3 text-sm text-fg/80">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-fg">{store.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        store.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-500/10 text-slate-200'
                      }`}
                    >
                      {statusLabels[store.status]}
                    </span>
                  </div>
                  <p className="text-xs text-fg/60">
                    {store.city}/{store.state}
                    {store.mall ? ` • ${store.mall}` : ''}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-fg/50">
                    {store.partner?.name ? <p>Parceiro: {store.partner.name}</p> : null}
                    {store.brand?.name ? <p>Marca: {store.brand.name}</p> : null}
                    {store.cnpj ? <p>CNPJ: {store.cnpj}</p> : null}
                  </div>
                  <p className="mt-2 text-xs text-fg/50">Atualização: {new Date(store.updatedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!loading && groups.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/40 p-6 text-center text-sm text-fg/60">
            Nenhuma duplicidade detectada com os filtros atuais.
          </div>
        ) : null}
      </section>

      <MergeDialog
        open={Boolean(selectedGroup)}
        group={selectedGroup}
        loading={merging}
        onClose={() => setSelectedGroup(null)}
        onMerge={handleMerge}
      />
    </div>
  )
}
