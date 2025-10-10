import { useEffect, useMemo, type FocusEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { zodResolver } from '@/lib/zod-resolver'
import {
  parseBrazilAddress,
  brlToCents,
  centsToBRL,
  storeProductLabels,
  storeProductTypes,
  type StoreProductType,
} from '@shared/store-utils'

const brazilStates = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

const productEnum = z.enum(storeProductTypes)

const priceSchema = z.object({
  product: productEnum,
  unitValueBRL: z.string().optional().nullable(),
})

export const storeSchema = z.object({
  partnerId: z.string().optional().nullable(),
  name: z.string().min(2, 'Nome da loja obrigatório'),
  externalCode: z.string().optional(),
  addressRaw: z.string().min(3, 'Informe o endereço (texto livre)'),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().min(2, 'Município obrigatório'),
  state: z.string().length(2, 'UF com 2 letras'),
  postalCode: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  prices: z.array(priceSchema).default([]),
})

export type StoreFormValues = z.infer<typeof storeSchema>

export type StoreFormSubmitPrice = {
  product: StoreProductType
  unitValueBRL: string
}

export type StoreFormSubmitValues = Omit<StoreFormValues, 'prices' | 'partnerId'> & {
  partnerId: string | null
  prices: StoreFormSubmitPrice[]
}

type StoreFormPriceDefaults = {
  product: StoreProductType
  unitValueCents?: number | null
  unitValueBRL?: string | null
}

type StoreFormDefaults =
  | undefined
  | (Partial<Omit<StoreFormValues, 'prices' | 'partnerId'>> & {
      partnerId?: string | number | null
      prices?: StoreFormPriceDefaults[]
    })

export type StoreFormProps = {
  defaultValues?: StoreFormDefaults
  partners: Array<{ id: string; name: string }>
  onSubmit: (values: StoreFormSubmitValues) => void
  onCancel?: () => void
}

export function StoreForm({ defaultValues, partners, onSubmit, onCancel }: StoreFormProps) {
  const initialValues = useMemo<StoreFormValues>(() => {
    const priceDefaults = storeProductTypes.map((product) => {
      const existing = defaultValues?.prices?.find((price) => price.product === product)
      const cents = existing?.unitValueCents ?? null
      const formatted = existing?.unitValueBRL ?? (cents != null ? centsToBRL(cents) : '')
      return {
        product,
        unitValueBRL: formatted ?? '',
      }
    })

    const normalizeValue = (value?: string | number | null) => {
      if (value == null) {
        return ''
      }
      const stringValue = typeof value === 'number' ? String(value) : value
      return stringValue?.trim?.() ?? ''
    }

    return {
      partnerId: normalizeValue(defaultValues?.partnerId),
      name: defaultValues?.name ?? '',
      externalCode: defaultValues?.externalCode ?? '',
      addressRaw: defaultValues?.addressRaw ?? '',
      street: defaultValues?.street ?? '',
      number: defaultValues?.number ?? '',
      complement: defaultValues?.complement ?? '',
      district: defaultValues?.district ?? '',
      city: defaultValues?.city ?? '',
      state: defaultValues?.state ?? 'SP',
      postalCode: defaultValues?.postalCode ?? '',
      prices: priceDefaults,
      status: defaultValues?.status ?? 'ACTIVE',
    }
  }, [defaultValues])

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StoreFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(storeSchema),
  })

  useEffect(() => {
    reset(initialValues)
  }, [initialValues, reset])

  const addressRaw = useWatch({ control, name: 'addressRaw' })

  useEffect(() => {
    if (!addressRaw) {
      return
    }

    const parsed = parseBrazilAddress(addressRaw)

    if (parsed.street && !getValues('street')) {
      setValue('street', parsed.street)
    }
    if (parsed.number && !getValues('number')) {
      setValue('number', parsed.number)
    }
    if (parsed.complement && !getValues('complement')) {
      setValue('complement', parsed.complement)
    }
    if (parsed.district && !getValues('district')) {
      setValue('district', parsed.district)
    }
    if (parsed.postalCode && !getValues('postalCode')) {
      setValue('postalCode', parsed.postalCode)
    }
  }, [addressRaw, getValues, setValue])

  const handleCurrencyBlur = (index: number) => (event: FocusEvent<HTMLInputElement>) => {
    const cents = brlToCents(event.target.value)
    setValue(`prices.${index}.unitValueBRL`, centsToBRL(cents ?? undefined))
  }

  const handleFormSubmit = handleSubmit((values) => {
    const { partnerId, prices, ...rest } = values

    const normalizedPrices = (prices ?? [])
      .map((price) => {
        const value = price.unitValueBRL?.trim()
        if (!value) {
          return null
        }
        return {
          product: price.product,
          unitValueBRL: value,
        }
      })
      .filter((price): price is StoreFormSubmitPrice => price !== null)

    onSubmit({
      ...rest,
      partnerId: partnerId ? partnerId : null,
      prices: normalizedPrices,
    })
  })

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex h-full flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <header className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Identificação</h3>
            <p className="text-xs text-slate-400">
              Defina a marca responsável e como a loja será identificada.
            </p>
          </header>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">Marca / Parceiro</span>
              <select
                {...register('partnerId')}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Sem vínculo</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
              {errors.partnerId && <p className="text-xs text-rose-300">{errors.partnerId.message}</p>}
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">Nome da loja *</span>
              <input
                {...register('name')}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              />
              {errors.name && <p className="text-xs text-rose-300">{errors.name.message}</p>}
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">Código externo</span>
              <input
                {...register('externalCode')}
                placeholder="Identificador no sistema Disagua"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              />
              {errors.externalCode && <p className="text-xs text-rose-300">{errors.externalCode.message}</p>}
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">Status</span>
              <select
                {...register('status')}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              >
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
              </select>
              {errors.status && <p className="text-xs text-rose-300">{errors.status.message}</p>}
            </label>
          </div>
        </section>

        <section className="flex h-full flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <header className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Endereço</h3>
            <p className="text-xs text-slate-400">
              Sempre preencha o campo livre. Os campos estruturados podem ser completados automaticamente ou ajustados
              manualmente.
            </p>
          </header>
          <div className="space-y-4">
            <label className="space-y-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">Endereço (texto livre) *</span>
              <textarea
                {...register('addressRaw')}
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              />
              {errors.addressRaw && <p className="text-xs text-rose-300">{errors.addressRaw.message}</p>}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span className="font-medium text-slate-200">Rua / Logradouro</span>
                <input
                  {...register('street')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                />
                {errors.street && <p className="text-xs text-rose-300">{errors.street.message}</p>}
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2 text-sm text-slate-300">
                  <span className="font-medium text-slate-200">Número</span>
                  <input
                    {...register('number')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  />
                  {errors.number && <p className="text-xs text-rose-300">{errors.number.message}</p>}
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  <span className="font-medium text-slate-200">Complemento</span>
                  <input
                    {...register('complement')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  />
                  {errors.complement && <p className="text-xs text-rose-300">{errors.complement.message}</p>}
                </label>
              </div>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="font-medium text-slate-200">Bairro</span>
                <input
                  {...register('district')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                />
                {errors.district && <p className="text-xs text-rose-300">{errors.district.message}</p>}
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  <span className="font-medium text-slate-200">Município *</span>
                  <input
                    {...register('city')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  />
                  {errors.city && <p className="text-xs text-rose-300">{errors.city.message}</p>}
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  <span className="font-medium text-slate-200">UF *</span>
                  <select
                    {...register('state')}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                  >
                    {brazilStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {errors.state && <p className="text-xs text-rose-300">{errors.state.message}</p>}
                </label>
              </div>
              <label className="space-y-2 text-sm text-slate-300">
                <span className="font-medium text-slate-200">CEP</span>
                <input
                  {...register('postalCode')}
                  placeholder="00000000"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                />
                {errors.postalCode && <p className="text-xs text-rose-300">{errors.postalCode.message}</p>}
              </label>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <header className="space-y-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Preços por produto</h3>
          <p className="text-xs text-slate-400">Preço por unidade. Preencha apenas os itens negociados.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {storeProductTypes.map((product, index) => (
            <label key={product} className="space-y-2 text-sm text-slate-300">
              <span className="font-medium text-slate-200">{storeProductLabels[product]}</span>
              <input
                type="hidden"
                value={product}
                readOnly
                {...register(`prices.${index}.product` as const)}
              />
              <input
                {...register(`prices.${index}.unitValueBRL` as const)}
                onBlur={handleCurrencyBlur(index)}
                inputMode="decimal"
                placeholder="R$ 0,00"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              />
              {errors.prices?.[index]?.unitValueBRL && (
                <p className="text-xs text-rose-300">{errors.prices[index]?.unitValueBRL?.message}</p>
              )}
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 shadow-sm xl:sticky xl:bottom-0 xl:z-10 xl:backdrop-blur">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Salvar loja
        </button>
      </div>
    </form>
  )
}
