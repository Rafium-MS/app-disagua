import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, PlusCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

export type BrandOption = {
  id: string
  name: string
  code?: string | null
  partnerId: number
  partnerName: string
}

export type BrandSelectPartnerOption = {
  id: string
  label: string
}

type BrandSelectProps = {
  partners: BrandSelectPartnerOption[]
  loadingPartners?: boolean
  value?: string | null
  initialBrand?: BrandOption | null
  label?: string
  placeholder?: string
  disabled?: boolean
  onChange: (value: string | null, brand?: BrandOption | null) => void
}

export function BrandSelect({
  partners,
  loadingPartners,
  value,
  initialBrand,
  label = 'Marca',
  placeholder = 'Selecione a marca',
  disabled,
  onChange,
}: BrandSelectProps) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<BrandOption[]>([])
  const [creating, setCreating] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createBrandName, setCreateBrandName] = useState('')
  const [createBrandCode, setCreateBrandCode] = useState('')
  const [createBrandPartnerId, setCreateBrandPartnerId] = useState('')
  const createNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadBrands() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          pageSize: '200',
        })
        if (search.trim().length > 0) {
          params.set('q', search.trim())
        }
        const response = await fetch(`/api/brands?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Não foi possível carregar as marcas')
        }
        const payload = await response.json()
        if (!isMounted) return
        type ResponseBrand = {
          id: string
          name: string
          code?: string | null
          partnerId: number | string
          partner?: { id: number; name: string }
        }
        const fetched: BrandOption[] = Array.isArray(payload.data)
          ? (payload.data as ResponseBrand[]).map((brand) => ({
              id: brand.id,
              name: brand.name,
              code: brand.code ?? null,
              partnerId: Number(brand.partnerId),
              partnerName:
                brand.partner?.name ??
                partners.find((partner) => Number(partner.id) === Number(brand.partnerId))?.label ??
                `Parceiro ${brand.partnerId}`,
            }))
          : []
        setOptions(() => {
          const next = [...fetched]
          if (
            initialBrand &&
            value &&
            initialBrand.id === value &&
            !next.some((option) => option.id === initialBrand.id)
          ) {
            next.unshift(initialBrand)
          }
          return next
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }
        console.error(error)
        toast({ title: 'Falha ao carregar marcas', variant: 'error' })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadBrands()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [search, toast, initialBrand, value, partners])

  const selectedOption = useMemo(() => {
    if (!value) {
      return null
    }
    return (
      options.find((option) => option.id === value) ??
      (initialBrand && initialBrand.id === value ? initialBrand : null)
    )
  }, [options, value, initialBrand])

  const handleCreate = useCallback(async () => {
    const name = createBrandName.trim()
    if (!name) {
      toast({ title: 'Informe o nome da marca', variant: 'error' })
      return
    }
    if (!createBrandPartnerId) {
      toast({ title: 'Selecione o parceiro responsável', variant: 'error' })
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: Number(createBrandPartnerId),
          name,
          code: createBrandCode.trim() ? createBrandCode.trim() : undefined,
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Não foi possível criar a marca')
      }
      type CreatedBrand = {
        id: string
        name: string
        code?: string | null
        partnerId: number | string
        partner?: { id: number; name: string }
      }
      const payload = (await response.json()) as CreatedBrand
      const brand: BrandOption = {
        id: payload.id,
        name: payload.name,
        code: payload.code ?? null,
        partnerId: Number(payload.partnerId),
        partnerName:
          payload.partner?.name ??
          partners.find((partner) => Number(partner.id) === Number(payload.partnerId))?.label ??
          `Parceiro ${payload.partnerId}`,
      }
      setOptions((previous) => [brand, ...previous.filter((option) => option.id !== brand.id)])
      onChange(brand.id, brand)
      setCreateDialogOpen(false)
      setCreateBrandName('')
      setCreateBrandCode('')
      toast({ title: 'Marca criada com sucesso', variant: 'success' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Não foi possível criar a marca',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      })
    } finally {
      setCreating(false)
    }
  }, [createBrandCode, createBrandName, createBrandPartnerId, onChange, partners, toast])

  useEffect(() => {
    if (!createDialogOpen) {
      return
    }

    if (!createBrandPartnerId && partners.length > 0) {
      setCreateBrandPartnerId(partners[0].id)
    }
  }, [createDialogOpen, partners, createBrandPartnerId])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg/80" htmlFor="brand-select">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col gap-2 sm:max-w-sm">
          <input
            id="brand-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar marca..."
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <select
            id="brand-select"
            value={value ?? ''}
            onChange={(event) => {
              const optionId = event.target.value
              const selected =
                options.find((option) => option.id === optionId) ??
                (initialBrand && initialBrand.id === optionId ? initialBrand : null)
              onChange(selected ? selected.id : null, selected)
            }}
            disabled={disabled || loading}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} • {option.partnerName}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2"
          disabled={disabled || loadingPartners || partners.length === 0}
          onClick={() => {
            setCreateDialogOpen(true)
            setCreateBrandPartnerId((current) => {
              if (current) {
                return current
              }
              return partners[0]?.id ?? ''
            })
            setTimeout(() => {
              createNameInputRef.current?.focus()
            }, 0)
          }}
        >
          <PlusCircle className="h-4 w-4" />
          Criar marca
        </Button>
      </div>
      {selectedOption && (
        <p className="text-xs text-fg/60">
          Marca selecionada: {selectedOption.name} • {selectedOption.partnerName}
        </p>
      )}

      <Dialog
        open={createDialogOpen}
        onClose={() => {
          if (creating) {
            return
          }
          setCreateDialogOpen(false)
        }}
        title="Cadastrar marca"
        description="Informe o parceiro responsável e o nome da nova marca."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar marca
            </Button>
          </>
        }
        initialFocusRef={createNameInputRef}
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="create-brand-name" className="text-sm font-medium text-fg/80">
              Nome da marca
            </label>
            <input
              id="create-brand-name"
              ref={createNameInputRef}
              type="text"
              value={createBrandName}
              onChange={(event) => setCreateBrandName(event.target.value)}
              disabled={creating}
              placeholder="Ex.: Shopping das Águas"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="create-brand-partner" className="text-sm font-medium text-fg/80">
              Parceiro responsável
            </label>
            <select
              id="create-brand-partner"
              value={createBrandPartnerId}
              onChange={(event) => setCreateBrandPartnerId(event.target.value)}
              disabled={creating || partners.length === 0}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="create-brand-code" className="text-sm font-medium text-fg/80">
              Código interno (opcional)
            </label>
            <input
              id="create-brand-code"
              type="text"
              value={createBrandCode}
              onChange={(event) => setCreateBrandCode(event.target.value)}
              disabled={creating}
              placeholder="Código único, se necessário"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
