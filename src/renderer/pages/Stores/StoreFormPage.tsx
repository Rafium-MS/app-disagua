import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useNavigate, useRouteInfo } from '@/routes/RouterProvider'
import { useToast } from '@/components/ui/toast'
import { BrandSelect, type BrandOption } from '@/components/BrandSelect'
import { PriceGrid, type PriceGridValues } from '@/components/PriceGrid'
import { storeProductTypes } from '@shared/store-utils'

import type { StoreProductType } from '@shared/store-utils'

type PartnerOption = {
  id: number
  name: string
}

type StoreResponse = {
  id: string
  partnerId: number
  brandId?: string | null
  name: string
  externalCode?: string | null
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  mall?: string | null
  addressRaw: string
  street?: string | null
  number?: string | null
  complement?: string | null
  district?: string | null
  city: string
  state: string
  postalCode?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  prices: Array<{ product: StoreProductType; unitCents: number }>
  brand?: { id: string; name: string | null } | null
}

type StoreFormValues = {
  partnerId: string
  brandId: string
  name: string
  externalCode: string
  cnpj: string
  phone: string
  email: string
  mall: string
  addressRaw: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  postalCode: string
  status: 'ACTIVE' | 'INACTIVE'
}

function emptyToNull(value: string) {
  return value.trim().length === 0 ? undefined : value
}

export function StoreFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { activeRoute, params } = useRouteInfo()
  const isEditing = activeRoute?.path === '/stores/:id/edit'
  const storeId = params.id
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [loadingStore, setLoadingStore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [priceValues, setPriceValues] = useState<PriceGridValues>({})
  const [initialBrand, setInitialBrand] = useState<BrandOption | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StoreFormValues>({
    defaultValues: {
      partnerId: '',
      brandId: '',
      name: '',
      externalCode: '',
      cnpj: '',
      phone: '',
      email: '',
      mall: '',
      addressRaw: '',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      postalCode: '',
      status: 'ACTIVE',
    },
  })

  const partnerIdValue = watch('partnerId')
  const brandIdValue = watch('brandId')

  const previousPartnerIdRef = useRef<string | undefined>(undefined)

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
    if (!isEditing || !storeId) {
      return
    }
    const controller = new AbortController()
    async function loadStore() {
      setLoadingStore(true)
      try {
        const response = await fetch(`/api/stores/${storeId}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Não foi possível carregar a loja')
        const payload = (await response.json()) as StoreResponse
        reset({
          partnerId: String(payload.partnerId),
          brandId: payload.brandId ?? '',
          name: payload.name,
          externalCode: payload.externalCode ?? '',
          cnpj: payload.cnpj ?? '',
          phone: payload.phone ?? '',
          email: payload.email ?? '',
          mall: payload.mall ?? '',
          addressRaw: payload.addressRaw,
          street: payload.street ?? '',
          number: payload.number ?? '',
          complement: payload.complement ?? '',
          district: payload.district ?? '',
          city: payload.city,
          state: payload.state,
          postalCode: payload.postalCode ?? '',
          status: payload.status,
        })
        setInitialBrand(
          payload.brand?.id
            ? { id: payload.brand.id, name: payload.brand.name ?? 'Marca vinculada' }
            : null,
        )
        setPriceValues(
          payload.prices.reduce<PriceGridValues>((accumulator, price) => {
            accumulator[price.product] = (price.unitCents / 100).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })
            return accumulator
          }, {}),
        )
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error)
          toast({ title: 'Erro ao carregar dados da loja', variant: 'error' })
        }
      } finally {
        setLoadingStore(false)
      }
    }
    loadStore()
    return () => controller.abort()
  }, [isEditing, reset, storeId, toast])

  const handlePriceChange = (product: StoreProductType, value: string) => {
    setPriceValues((previous) => ({ ...previous, [product]: value }))
  }

  useEffect(() => {
    if (previousPartnerIdRef.current && previousPartnerIdRef.current !== partnerIdValue) {
      setValue('brandId', '', { shouldDirty: true })
      setInitialBrand(null)
    }
    previousPartnerIdRef.current = partnerIdValue || undefined
  }, [partnerIdValue, setValue])

  const onSubmit = async (formValues: StoreFormValues) => {
    setSaving(true)
    try {
      const payload = {
        partnerId: Number(formValues.partnerId),
        brandId: formValues.brandId || undefined,
        name: formValues.name.trim(),
        externalCode: emptyToNull(formValues.externalCode),
        cnpj: emptyToNull(formValues.cnpj),
        phone: emptyToNull(formValues.phone),
        email: emptyToNull(formValues.email),
        mall: emptyToNull(formValues.mall),
        addressRaw: formValues.addressRaw.trim(),
        street: emptyToNull(formValues.street),
        number: emptyToNull(formValues.number),
        complement: emptyToNull(formValues.complement),
        district: emptyToNull(formValues.district),
        city: formValues.city.trim(),
        state: formValues.state.trim().toUpperCase(),
        postalCode: emptyToNull(formValues.postalCode),
        status: formValues.status,
        prices: storeProductTypes
          .map((product) => ({ product, value: priceValues[product] }))
          .filter((price) => price.value && price.value.trim().length > 0)
          .map((price) => ({ product: price.product, unitValueBRL: price.value! })),
      }

      const response = await fetch(isEditing ? `/api/stores/${storeId}` : '/api/stores', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.error || 'Não foi possível salvar a loja')
      }

      toast({ title: 'Loja salva com sucesso', variant: 'success' })
      navigate('/stores')
    } catch (error) {
      console.error(error)
      toast({
        title: 'Falha ao salvar loja',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const partnerOptions = useMemo(() => partners.map((partner) => ({ id: String(partner.id), label: partner.name })), [partners])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-fg">{isEditing ? 'Editar loja' : 'Nova loja'}</h1>
        <p className="text-sm text-fg/60">
          Preencha os dados de identificação, localização e preços para acompanhar as condições comerciais da loja.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-xl border border-border bg-card/40 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-fg">Identificação</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="partnerId" className="text-sm font-medium text-fg/80">
                Parceiro
              </label>
              <select
                id="partnerId"
                {...register('partnerId', { required: 'Selecione o parceiro' })}
                disabled={loadingStore || saving}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Selecione um parceiro</option>
                {partnerOptions.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.label}
                  </option>
                ))}
              </select>
              {errors.partnerId ? (
                <span className="text-xs text-red-400">{errors.partnerId.message}</span>
              ) : null}
            </div>
            <div>
              <BrandSelect
                partnerId={partnerIdValue}
                value={brandIdValue ?? ''}
                initialBrand={initialBrand}
                onChange={(brandId, brand) => {
                  setValue('brandId', brandId ?? '', { shouldDirty: true })
                  setInitialBrand(brand ?? null)
                }}
                disabled={!partnerIdValue || loadingStore || saving}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-medium text-fg/80">
                Nome da loja
              </label>
              <input
                id="name"
                type="text"
                {...register('name', { required: 'Informe o nome da loja' })}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {errors.name ? <span className="text-xs text-red-400">{errors.name.message}</span> : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="cnpj" className="text-sm font-medium text-fg/80">
                CNPJ
              </label>
              <input
                id="cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                {...register('cnpj')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="externalCode" className="text-sm font-medium text-fg/80">
                Código externo
              </label>
              <input
                id="externalCode"
                type="text"
                {...register('externalCode')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="phone" className="text-sm font-medium text-fg/80">
                Telefone
              </label>
              <input
                id="phone"
                type="text"
                {...register('phone')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-fg/80">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-fg">Localização</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor="addressRaw" className="text-sm font-medium text-fg/80">
                Endereço completo
              </label>
              <textarea
                id="addressRaw"
                rows={3}
                {...register('addressRaw', { required: 'Informe o endereço completo' })}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {errors.addressRaw ? <span className="text-xs text-red-400">{errors.addressRaw.message}</span> : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="street" className="text-sm font-medium text-fg/80">
                Rua
              </label>
              <input
                id="street"
                type="text"
                {...register('street')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="number" className="text-sm font-medium text-fg/80">
                Número
              </label>
              <input
                id="number"
                type="text"
                {...register('number')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="complement" className="text-sm font-medium text-fg/80">
                Complemento
              </label>
              <input
                id="complement"
                type="text"
                {...register('complement')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="district" className="text-sm font-medium text-fg/80">
                Bairro
              </label>
              <input
                id="district"
                type="text"
                {...register('district')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="city" className="text-sm font-medium text-fg/80">
                Cidade
              </label>
              <input
                id="city"
                type="text"
                {...register('city', { required: 'Informe a cidade' })}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {errors.city ? <span className="text-xs text-red-400">{errors.city.message}</span> : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="state" className="text-sm font-medium text-fg/80">
                UF
              </label>
              <input
                id="state"
                type="text"
                maxLength={2}
                {...register('state', { required: 'Informe a UF' })}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {errors.state ? <span className="text-xs text-red-400">{errors.state.message}</span> : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="postalCode" className="text-sm font-medium text-fg/80">
                CEP
              </label>
              <input
                id="postalCode"
                type="text"
                {...register('postalCode')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="mall" className="text-sm font-medium text-fg/80">
                Shopping
              </label>
              <input
                id="mall"
                type="text"
                {...register('mall')}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Preços praticados</h2>
            <span className="text-xs text-fg/60">Informe apenas os valores ativos — os demais serão ignorados.</span>
          </div>
          <PriceGrid values={priceValues} onChange={handlePriceChange} />
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-fg">Status operacional</h2>
          <select
            {...register('status')}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="ACTIVE">Ativa</option>
            <option value="INACTIVE">Inativa</option>
          </select>
        </section>

        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => navigate('/stores')} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar loja
          </Button>
        </div>
      </form>
    </div>
  )
}
