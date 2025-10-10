import { useEffect, useMemo, type FocusEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { zodResolver } from '@/lib/zod-resolver'
import { parseBrazilAddress, brlToCents, centsToBRL } from '@shared/store-utils'

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
  unitValueBRL: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export type StoreFormValues = z.infer<typeof storeSchema>

export type StoreFormSubmitValues = Omit<StoreFormValues, 'unitValueBRL'> & {
  unitValueCents: number | null
}

export type StoreFormProps = {
  defaultValues?: Partial<StoreFormValues & { unitValueCents?: number | null }>
  partners: Array<{ id: string; name: string }>
  onSubmit: (values: StoreFormSubmitValues) => void
  onCancel?: () => void
}

export function StoreForm({ defaultValues, partners, onSubmit, onCancel }: StoreFormProps) {
  const initialValues = useMemo<StoreFormValues>(() => {
    return {
      partnerId: defaultValues?.partnerId ?? '',
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
      unitValueBRL:
        defaultValues?.unitValueBRL ??
        (defaultValues?.unitValueCents != null ? centsToBRL(defaultValues.unitValueCents) : ''),
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

  const handleCurrencyBlur = (event: FocusEvent<HTMLInputElement>) => {
    const cents = brlToCents(event.target.value)
    setValue('unitValueBRL', centsToBRL(cents ?? undefined))
  }

  const handleFormSubmit = handleSubmit((values) => {
    const { unitValueBRL, partnerId, ...rest } = values
    const unitValueCents = brlToCents(unitValueBRL)

    onSubmit({
      ...rest,
      partnerId: partnerId ? partnerId : null,
      unitValueCents,
    })
  })

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <header>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Identificação
          </h3>
          <p className="text-xs text-slate-400">Defina a marca responsável e como a loja será identificada.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
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

      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <header>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Endereço</h3>
          <p className="text-xs text-slate-400">
            Sempre preencha o campo livre. Os campos estruturados podem ser completados automaticamente ou ajustados
            manualmente.
          </p>
        </header>
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
      </section>

      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <header>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Financeiro</h3>
          <p className="text-xs text-slate-400">Informe o valor unitário acordado em reais.</p>
        </header>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-slate-200">Valor unitário</span>
          <input
            {...register('unitValueBRL')}
            onBlur={handleCurrencyBlur}
            inputMode="decimal"
            placeholder="R$ 0,00"
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
          />
          {errors.unitValueBRL && <p className="text-xs text-rose-300">{errors.unitValueBRL.message}</p>}
        </label>
      </section>

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
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
