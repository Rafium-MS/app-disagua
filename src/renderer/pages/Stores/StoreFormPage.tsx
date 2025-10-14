import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useNavigate, useRouteInfo } from '@/routes/RouterProvider'
import { useToast } from '@/components/ui/toast'
import { storeProductLabels } from '@shared/store-utils'

type PartnerOption = {
  id: number
  name: string
}

type BrandOption = {
  id: string
  name: string
  partnerId: number
}

type StoreDetail = {
  id: string
  partnerId: number
  brandId: string
  name: string
  deliveryPlace: string
  addressRaw?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  mall?: string | null
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  prices: Array<{ product: keyof typeof storeProductLabels; unitCents: number }>
  brand: { id: string; name: string }
  partner: { id: number; name: string }
}

type PriceField = keyof Pick<FormValues, 'price20L' | 'price10L' | 'price1500' | 'priceCopo' | 'priceVasilhame'>

const priceFieldMap: Array<{ field: PriceField; product: keyof typeof storeProductLabels; label: string }> = [
  { field: 'price20L', product: 'GALAO_20L', label: 'Galão 20L' },
  { field: 'price10L', product: 'GALAO_10L', label: 'Galão 10L' },
  { field: 'price1500', product: 'PET_1500ML', label: 'PET 1,5L' },
  { field: 'priceCopo', product: 'CAIXA_COPO', label: 'Caixa copo' },
  { field: 'priceVasilhame', product: 'VASILHAME', label: 'Vasilhame' },
]

const formSchema = z.object({
  partnerId: z.string().min(1, 'Selecione o parceiro'),
  brandId: z.string().min(1, 'Selecione a marca'),
  name: z.string().min(2, 'Informe o nome da loja'),
  deliveryPlace: z.string().min(2, 'Informe o local de entrega'),
  addressRaw: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z
    .string()
    .optional()
    .refine((value) => !value || /^[A-Za-z]{2}$/.test(value), 'Informe a UF com 2 letras'),
  postalCode: z.string().optional(),
  mall: z.string().optional(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  price20L: z.string().optional(),
  price10L: z.string().optional(),
  price1500: z.string().optional(),
  priceCopo: z.string().optional(),
  priceVasilhame: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

function formatBRL(value: string) {
  const digits = value.replace(/\D+/g, '')
  const numeric = Number(digits || '0') / 100
  return numeric === 0 ? '' : numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function StoreFormPage() {
  const { params, query, activeRoute } = useRouteInfo()
  const navigate = useNavigate()
  const { toast } = useToast()
  const storeId = params.id
  const isEditing = activeRoute?.path === '/stores/:id/edit'
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      partnerId: query.get('partnerId') ?? '',
      brandId: query.get('brandId') ?? '',
      name: '',
      deliveryPlace: '',
      status: 'ACTIVE',
    },
  })

  const partnerId = watch('partnerId')
  const brandId = watch('brandId')

  useEffect(() => {
    async function loadPartners() {
      try {
        const response = await fetch('/api/partners?page=1&pageSize=200')
        if (!response.ok) throw new Error('Erro ao carregar parceiros')
        const payload = await response.json()
        setPartners(payload.data ?? [])
      } catch (error) {
        console.error(error)
        toast({ title: 'Não foi possível carregar os parceiros', variant: 'error' })
      }
    }
    loadPartners()
  }, [toast])

  useEffect(() => {
    if (!partnerId) {
      setBrands([])
      return
    }
    let active = true
    async function loadBrands() {
      try {
        const response = await fetch(`/api/brands?partnerId=${partnerId}&page=1&size=200`)
        if (!response.ok) throw new Error('Erro ao carregar marcas')
        const payload = await response.json()
        if (active) {
          setBrands(payload.data ?? [])
        }
      } catch (error) {
        console.error(error)
        toast({ title: 'Não foi possível carregar as marcas', variant: 'error' })
      }
    }
    loadBrands()
    return () => {
      active = false
    }
  }, [partnerId, toast])

  useEffect(() => {
    if (!isEditing || !storeId) {
      return
    }
    const controller = new AbortController()
    async function loadStore() {
      setLoading(true)
      try {
        const response = await fetch(`/api/stores/${storeId}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Não foi possível carregar a loja')
        const payload = (await response.json()) as StoreDetail
        setPartners((previous) =>
          previous.some((partner) => partner.id === payload.partnerId)
            ? previous
            : [...previous, { id: payload.partnerId, name: payload.partner.name }],
        )
        setBrands((previous) =>
          previous.some((brand) => brand.id === payload.brandId)
            ? previous
            : [...previous, { id: payload.brandId, name: payload.brand.name, partnerId: payload.partnerId }],
        )
        reset({
          partnerId: String(payload.partnerId),
          brandId: payload.brandId,
          name: payload.name,
          deliveryPlace: payload.deliveryPlace,
          addressRaw: payload.addressRaw ?? '',
          street: payload.street ?? '',
          number: payload.number ?? '',
          complement: payload.complement ?? '',
          district: payload.district ?? '',
          city: payload.city ?? '',
          state: payload.state ?? '',
          postalCode: payload.postalCode ?? '',
          mall: payload.mall ?? '',
          cnpj: payload.cnpj ?? '',
          phone: payload.phone ?? '',
          email: payload.email ?? '',
          status: payload.status,
          price20L: payload.prices.find((price) => price.product === 'GALAO_20L')
            ? formatBRL(String(payload.prices.find((price) => price.product === 'GALAO_20L')?.unitCents ?? 0))
            : '',
          price10L: payload.prices.find((price) => price.product === 'GALAO_10L')
            ? formatBRL(String(payload.prices.find((price) => price.product === 'GALAO_10L')?.unitCents ?? 0))
            : '',
          price1500: payload.prices.find((price) => price.product === 'PET_1500ML')
            ? formatBRL(String(payload.prices.find((price) => price.product === 'PET_1500ML')?.unitCents ?? 0))
            : '',
          priceCopo: payload.prices.find((price) => price.product === 'CAIXA_COPO')
            ? formatBRL(String(payload.prices.find((price) => price.product === 'CAIXA_COPO')?.unitCents ?? 0))
            : '',
          priceVasilhame: payload.prices.find((price) => price.product === 'VASILHAME')
            ? formatBRL(String(payload.prices.find((price) => price.product === 'VASILHAME')?.unitCents ?? 0))
            : '',
        })
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error)
          toast({ title: 'Erro ao carregar loja', variant: 'error' })
        }
      } finally {
        setLoading(false)
      }
    }
    loadStore()
    return () => controller.abort()
  }, [isEditing, reset, storeId, toast])

  const onSubmit = async (values: FormValues) => {
    const parsed = formSchema.safeParse(values)
    if (!parsed.success) {
      clearErrors()
      const fieldErrors = parsed.error.flatten().fieldErrors
      Object.entries(fieldErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          setError(field as keyof FormValues, { message: messages[0] })
        }
      })
      toast({ title: 'Verifique os dados obrigatórios', variant: 'error' })
      return
    }

    const valid = parsed.data
    setSaving(true)
    try {
      const pricePayload = priceFieldMap
        .map(({ field, product }) => ({ product, unitValueBRL: valid[field] }))
        .filter((entry) => entry.unitValueBRL && entry.unitValueBRL.trim().length > 0)

      const payload = {
        partnerId: valid.partnerId,
        brandId: valid.brandId,
        name: valid.name.trim(),
        deliveryPlace: valid.deliveryPlace.trim(),
        addressRaw: valid.addressRaw?.trim() || undefined,
        street: valid.street?.trim() || undefined,
        number: valid.number?.trim() || undefined,
        complement: valid.complement?.trim() || undefined,
        district: valid.district?.trim() || undefined,
        city: valid.city?.trim() || undefined,
        state: valid.state?.trim().toUpperCase() || undefined,
        postalCode: valid.postalCode?.trim() || undefined,
        mall: valid.mall?.trim() || undefined,
        cnpj: valid.cnpj?.trim() || undefined,
        phone: valid.phone?.trim() || undefined,
        email: valid.email?.trim() || undefined,
        status: valid.status,
        prices: pricePayload,
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
      const redirectBrandId = valid.brandId
      navigate(`/brands/${redirectBrandId}/stores`)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao salvar loja',
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
          Informe a marca vinculada, o local de entrega e os preços praticados. O endereço estruturado é opcional.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/70">Identificação</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase text-fg/60">Parceiro</span>
              <select
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                {...register('partnerId')}
                onChange={(event) => {
                  const value = event.target.value
                  setValue('partnerId', value)
                  setValue('brandId', '')
                }}
              >
                <option value="">Selecione</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={String(partner.id)}>
                    {partner.name}
                  </option>
                ))}
              </select>
              {errors.partnerId && <span className="text-xs text-red-500">{errors.partnerId.message}</span>}
            </label>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase text-fg/60">Marca</span>
              <select
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                {...register('brandId')}
                disabled={!partnerId}
              >
                <option value="">Selecione</option>
                {brands
                  .filter((brand) => String(brand.partnerId) === partnerId)
                  .map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
              </select>
              {errors.brandId && <span className="text-xs text-red-500">{errors.brandId.message}</span>}
            </div>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-xs uppercase text-fg/60">Nome da loja</span>
              <input
                type="text"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                {...register('name')}
                placeholder="Ex: Loja Centro"
              />
              {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/70">Local de entrega</h2>
          <div className="mt-4 space-y-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase text-fg/60">Descrição do local</span>
              <textarea
                rows={3}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                {...register('deliveryPlace')}
                placeholder="Informe o ponto de entrega principal"
              />
              {errors.deliveryPlace && <span className="text-xs text-red-500">{errors.deliveryPlace.message}</span>}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase text-fg/60">Endereço completo (texto livre)</span>
              <textarea
                rows={2}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                {...register('addressRaw')}
                placeholder="Rua, número, bairro, cidade"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase text-fg/60">Rua</span>
                <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('street')} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase text-fg/60">Número</span>
                <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('number')} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase text-fg/60">Complemento</span>
                <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('complement')} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase text-fg/60">Bairro</span>
                <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('district')} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase text-fg/60">Cidade</span>
                <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('city')} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase text-fg/60">UF</span>
                <input
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm uppercase"
                  maxLength={2}
                  {...register('state')}
                />
                {errors.state && <span className="text-xs text-red-500">{errors.state.message}</span>}
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase text-fg/60">CEP</span>
                <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('postalCode')} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase text-fg/60">Shopping</span>
                <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('mall')} />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/70">Contatos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase text-fg/60">CNPJ</span>
              <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('cnpj')} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase text-fg/60">Telefone</span>
              <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('phone')} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase text-fg/60">E-mail</span>
              <input className="rounded-md border border-border bg-background px-3 py-2 text-sm" {...register('email')} />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/70">Produtos e preços</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {priceFieldMap.map(({ field, label }) => (
              <label key={field} className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase text-fg/60">{label}</span>
                <input
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  {...register(field)}
                  placeholder="R$ 0,00"
                  onBlur={(event) => {
                    const formatted = formatBRL(event.target.value)
                    setValue(field, formatted)
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/70">Status</h2>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="ACTIVE" {...register('status')} defaultChecked />
              <span>Ativa</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="INACTIVE" {...register('status')} />
              <span>Inativa</span>
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(brandId ? `/brands/${brandId}/stores` : '/brands')}>
            Cancelar
          </Button>
          <Button type="submit" className="flex items-center gap-2" disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar loja
          </Button>
        </div>
      </form>
    </div>
  )
}
