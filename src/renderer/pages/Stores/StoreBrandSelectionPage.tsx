import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useNavigate } from '@/routes/RouterProvider'
import { useToast } from '@/components/ui/toast'
import { BrandSelect, type BrandOption } from '@/components/BrandSelect'

type PartnerOption = {
  id: string
  label: string
}

export function StoreBrandSelectionPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loadingPartners, setLoadingPartners] = useState(false)
  const [selectedPartnerId, setSelectedPartnerId] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<BrandOption | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadPartners() {
      setLoadingPartners(true)
      try {
        const response = await fetch('/api/partners?page=1&pageSize=200', { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Erro ao carregar parceiros')
        }
        const payload = await response.json()
        if (!isMounted) return
        const items: PartnerOption[] = Array.isArray(payload.data)
          ? payload.data.map((partner: { id: number; name: string }) => ({
              id: String(partner.id),
              label: partner.name,
            }))
          : []
        setPartners(items)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error)
          toast({ title: 'Erro ao carregar parceiros', variant: 'error' })
        }
      } finally {
        if (isMounted) {
          setLoadingPartners(false)
        }
      }
    }

    loadPartners()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [toast])

  const partnerOptions = useMemo(
    () => [{ id: '', label: 'Selecione um parceiro' }, ...partners],
    [partners],
  )

  const selectedPartner = useMemo(() => partners.find((partner) => partner.id === selectedPartnerId) ?? null, [
    partners,
    selectedPartnerId,
  ])

  const handleContinue = () => {
    if (!selectedPartnerId) {
      toast({ title: 'Selecione um parceiro antes de continuar', variant: 'error' })
      return
    }
    if (!selectedBrand) {
      toast({ title: 'Escolha ou crie a marca da loja para prosseguir', variant: 'error' })
      return
    }

    setSubmitting(true)
    const params = new URLSearchParams({
      partnerId: selectedPartnerId,
      partnerName: selectedPartner?.label ?? '',
      brandId: selectedBrand.id,
      brandName: selectedBrand.name ?? '',
    })
    navigate(`/stores/new/form?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-fg">Nova loja</h1>
        <p className="text-sm text-fg/60">
          Primeiro selecione (ou cadastre) a marca vinculada ao parceiro. Em seguida, informe os dados da loja vinculada a
          essa marca.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
        <h2 className="text-sm font-semibold text-fg">1. Escolha o parceiro</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="partner" className="text-sm font-medium text-fg/80">
            Parceiro responsável
          </label>
          <select
            id="partner"
            value={selectedPartnerId}
            onChange={(event) => {
              setSelectedPartnerId(event.target.value)
              setSelectedBrand(null)
            }}
            disabled={loadingPartners || submitting}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {partnerOptions.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-fg">2. Cadastre ou selecione a marca</h2>
          {selectedBrand ? (
            <span className="text-xs text-fg/60">Marca atual: {selectedBrand.name}</span>
          ) : null}
        </div>
        <p className="text-xs text-fg/60">
          Digite o nome da marca para pesquisar. Caso não exista, use o botão &quot;Criar marca&quot; para registrá-la antes de prosseguir.
        </p>
        <BrandSelect
          partnerId={selectedPartnerId}
          value={selectedBrand?.id ?? ''}
          onChange={(brandId, brand) => {
            setSelectedBrand(brandId ? brand ?? { id: brandId, name: brand?.name ?? '' } : null)
          }}
          disabled={!selectedPartnerId || submitting}
        />
      </section>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => navigate('/stores')} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleContinue} disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continuar cadastro
        </Button>
      </div>
    </div>
  )
}
