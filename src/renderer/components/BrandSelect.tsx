import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, PlusCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

export type BrandOption = {
  id: string
  name: string
  code?: string | null
}

type BrandSelectProps = {
  partnerId?: number | string | null
  value?: string | null
  initialBrand?: BrandOption | null
  label?: string
  placeholder?: string
  disabled?: boolean
  onChange: (value: string | null, brand?: BrandOption | null) => void
}

export function BrandSelect({
  partnerId,
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

  const normalizedPartnerId = useMemo(() => {
    if (partnerId == null || partnerId === '') {
      return undefined
    }
    const numeric = Number(partnerId)
    return Number.isFinite(numeric) ? numeric : undefined
  }, [partnerId])

  useEffect(() => {
    if (!normalizedPartnerId) {
      setOptions([])
      return
    }

    let isMounted = true
    const controller = new AbortController()

    async function loadBrands() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          partnerId: String(normalizedPartnerId),
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
        const fetched: BrandOption[] = Array.isArray(payload.data) ? payload.data : []
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
  }, [normalizedPartnerId, search, toast, initialBrand, value])

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
    if (!normalizedPartnerId) {
      toast({ title: 'Selecione um parceiro antes de criar a marca', variant: 'error' })
      return
    }
    const name = search.trim()
    if (!name) {
      toast({ title: 'Informe um nome para criar a marca', variant: 'error' })
      return
    }
    setCreating(true)
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId: normalizedPartnerId, name }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Não foi possível criar a marca')
      }
      const brand = (await response.json()) as BrandOption
      setOptions((previous) => [brand, ...previous.filter((option) => option.id !== brand.id)])
      onChange(brand.id, brand)
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
  }, [normalizedPartnerId, onChange, search, toast])

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
            placeholder={normalizedPartnerId ? 'Buscar marca...' : 'Selecione o parceiro primeiro'}
            disabled={disabled || !normalizedPartnerId}
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
            disabled={disabled || !normalizedPartnerId || loading}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2"
          disabled={creating || !normalizedPartnerId || search.trim().length === 0}
          onClick={handleCreate}
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          Criar marca
        </Button>
      </div>
      {selectedOption && (
        <p className="text-xs text-fg/60">Marca selecionada: {selectedOption.name}</p>
      )}
    </div>
  )
}
