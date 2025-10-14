import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useNavigate, useRouteInfo } from '@/routes/RouterProvider'
import { useToast } from '@/components/ui/toast'
import { storeProductLabels, storeProductTypes } from '@shared/store-utils'

import type { StoreProductType } from '@shared/store-utils'

type StoreResponse = {
  id: string
  partnerId: number
  brandId?: string | null
  name: string
  mall?: string | null
  addressRaw: string
  city: string
  state: string
  status: 'ACTIVE' | 'INACTIVE'
  deliveredProducts?: Array<{ product: StoreProductType }>
  brand?: { id: string; name: string | null } | null
  partner?: { id: number; name: string } | null
}

type StoreFormValues = {
  partnerId: string
  brandId: string
  name: string
  deliveryLocation: string
  addressRaw: string
  city: string
  state: string
  status: 'ACTIVE' | 'INACTIVE'
  productsDelivered: StoreProductType[]
}

function emptyToNull(value: string) {
  return value.trim().length === 0 ? undefined : value
}

export function StoreFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { activeRoute, params, query } = useRouteInfo()
  const isEditing = activeRoute?.path === '/stores/:id/edit'
  const storeId = params.id
  const [loadingStore, setLoadingStore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string } | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<{ id: string; name: string } | null>(null)

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
      deliveryLocation: '',
      addressRaw: '',
      city: '',
      state: '',
      status: 'ACTIVE',
      productsDelivered: [],
    },
  })

  const productsDelivered = watch('productsDelivered') ?? []

  useEffect(() => {
    if (isEditing) {
      return
    }

    const partnerIdParam = query.get('partnerId') ?? ''
    const brandIdParam = query.get('brandId') ?? ''
    const partnerNameParam = query.get('partnerName') ?? ''
    const brandNameParam = query.get('brandName') ?? ''

    if (!partnerIdParam || !brandIdParam) {
      toast({ title: 'Selecione a marca da loja antes de continuar', variant: 'error' })
      navigate('/stores/new', { replace: true })
      return
    }

    setValue('partnerId', partnerIdParam, { shouldDirty: false })
    setValue('brandId', brandIdParam, { shouldDirty: false })
    setSelectedPartner({ id: partnerIdParam, name: partnerNameParam || `Parceiro ${partnerIdParam}` })
    setSelectedBrand({ id: brandIdParam, name: brandNameParam || 'Marca selecionada' })
  }, [isEditing, navigate, query, setValue, toast])

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
          deliveryLocation: payload.mall ?? '',
          addressRaw: payload.addressRaw,
          city: payload.city,
          state: payload.state,
          status: payload.status,
          productsDelivered: (payload.deliveredProducts ?? []).map((item) => item.product),
        })
        setSelectedPartner(
          payload.partner ? { id: String(payload.partner.id), name: payload.partner.name } : null,
        )
        setSelectedBrand(
          payload.brand?.id
            ? { id: payload.brand.id, name: payload.brand.name ?? 'Marca vinculada' }
            : null,
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

  const toggleProduct = (product: StoreProductType) => {
    const current = new Set(productsDelivered)
    if (current.has(product)) {
      current.delete(product)
    } else {
      current.add(product)
    }
    const ordered = storeProductTypes.filter((item) => current.has(item))
    setValue('productsDelivered', ordered, { shouldDirty: true })
  }

  const onSubmit = async (formValues: StoreFormValues) => {
    setSaving(true)
    try {
      const payload = {
        partnerId: Number(formValues.partnerId),
        brandId: formValues.brandId || undefined,
        name: formValues.name.trim(),
        mall: emptyToNull(formValues.deliveryLocation),
        addressRaw: formValues.addressRaw.trim(),
        city: formValues.city.trim(),
        state: formValues.state.trim().toUpperCase(),
        status: formValues.status,
        prices: [],
        deliveredProducts: formValues.productsDelivered,
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-fg">{isEditing ? 'Editar loja' : 'Nova loja'}</h1>
        <p className="text-sm text-fg/60">
          Informe a marca selecionada, os dados de entrega e os produtos atendidos para concluir o cadastro da loja.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-fg">Marca e parceiro</h2>
          <input type="hidden" {...register('partnerId', { required: 'Selecione um parceiro' })} />
          <input type="hidden" {...register('brandId', { required: 'Selecione uma marca' })} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-card/70 p-3">
              <span className="text-xs font-medium uppercase tracking-wide text-fg/60">Parceiro</span>
              <span className="text-sm font-semibold text-fg">{selectedPartner?.name ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-card/70 p-3">
              <span className="text-xs font-medium uppercase tracking-wide text-fg/60">Marca</span>
              <span className="text-sm font-semibold text-fg">{selectedBrand?.name ?? '—'}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg/60">
            <span>O gerenciamento de parceiros foi movido para a página dedicada.</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/partners')}>
              Abrir parceiros
            </Button>
            {!isEditing ? (
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/stores/new')}>
                Alterar marca
              </Button>
            ) : null}
          </div>
          {errors.partnerId ? (
            <span className="text-xs text-red-400">{errors.partnerId.message}</span>
          ) : null}
          {errors.brandId ? <span className="text-xs text-red-400">{errors.brandId.message}</span> : null}
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-fg">Dados da loja</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor="name" className="text-sm font-medium text-fg/80">
                Nome da loja
              </label>
              <input
                id="name"
                type="text"
                {...register('name', { required: 'Informe o nome da loja' })}
                disabled={loadingStore || saving}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {errors.name ? <span className="text-xs text-red-400">{errors.name.message}</span> : null}
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor="deliveryLocation" className="text-sm font-medium text-fg/80">
                Local da entrega
              </label>
              <input
                id="deliveryLocation"
                type="text"
                {...register('deliveryLocation')}
                disabled={loadingStore || saving}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor="addressRaw" className="text-sm font-medium text-fg/80">
                Endereço completo
              </label>
              <textarea
                id="addressRaw"
                rows={3}
                {...register('addressRaw', { required: 'Informe o endereço completo' })}
                disabled={loadingStore || saving}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {errors.addressRaw ? <span className="text-xs text-red-400">{errors.addressRaw.message}</span> : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="city" className="text-sm font-medium text-fg/80">
                Cidade
              </label>
              <input
                id="city"
                type="text"
                {...register('city', { required: 'Informe a cidade' })}
                disabled={loadingStore || saving}
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
                disabled={loadingStore || saving}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {errors.state ? <span className="text-xs text-red-400">{errors.state.message}</span> : null}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-fg">Produtos entregues</h2>
          <p className="text-xs text-fg/60">Selecione os produtos que fazem parte da rotina de entrega desta loja.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {storeProductTypes.map((product) => {
              const checked = productsDelivered.includes(product)
              return (
                <label
                  key={product}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg hover:border-emerald-400"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border bg-card"
                    checked={checked}
                    onChange={() => toggleProduct(product)}
                    disabled={loadingStore || saving}
                  />
                  <span>{storeProductLabels[product]}</span>
                </label>
              )
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-fg">Status operacional</h2>
          <select
            {...register('status')}
            disabled={loadingStore || saving}
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
