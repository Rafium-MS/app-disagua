import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  city: z.string().min(2, 'Informe a cidade'),
  state: z
    .string()
    .min(2, 'UF inválida')
    .max(2, 'UF inválida'),
  name: z.string().min(3, 'Informe o nome do parceiro'),
  distributor: z.string().min(2, 'Informe a distribuidora'),
  document: z.string().min(11, 'Informe o CNPJ ou CPF'),
  phone: z.string().min(10, 'Informe o telefone'),
  email: z.string().email('Informe um e-mail válido'),
  paymentDay: z.coerce
    .number()
    .int('Informe um dia válido')
    .min(1, 'Informe o dia de pagamento')
    .max(31, 'Informe um dia entre 1 e 31'),
  bank: z.string().min(2, 'Informe o banco'),
  agencyAccount: z.string().min(3, 'Informe agência e conta'),
  pixKey: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ''),
  volumeCupBox: z.coerce.number().min(0, 'Informe um volume válido'),
  volume10L: z.coerce.number().min(0, 'Informe um volume válido'),
  volume20L: z.coerce.number().min(0, 'Informe um volume válido'),
  volume1500ml: z.coerce.number().min(0, 'Informe um volume válido'),
  volumeTotal: z.coerce.number(),
  status: z.enum(['ativo', 'inativo']),
})

export type PartnerFormValues = z.infer<typeof schema>

export type PartnerFormProps = {
  defaultValues?: PartnerFormValues
  onSubmit: (values: PartnerFormValues) => void
}

export function PartnerForm({ defaultValues, onSubmit }: PartnerFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PartnerFormValues>({
    defaultValues:
      defaultValues ?? {
        city: '',
        state: 'SP',
        name: '',
        distributor: '',
        document: '',
        phone: '',
        email: '',
        paymentDay: 1,
        bank: '',
        agencyAccount: '',
        pixKey: '',
        volumeCupBox: 0,
        volume10L: 0,
        volume20L: 0,
        volume1500ml: 0,
        volumeTotal: 0,
        status: 'ativo',
      },
  })

  const volumeCupBox = watch('volumeCupBox') ?? 0
  const volume10L = watch('volume10L') ?? 0
  const volume20L = watch('volume20L') ?? 0
  const volume1500ml = watch('volume1500ml') ?? 0

  const totalVolume =
    Number.isFinite(volumeCupBox) &&
    Number.isFinite(volume10L) &&
    Number.isFinite(volume20L) &&
    Number.isFinite(volume1500ml)
      ? volumeCupBox + volume10L + volume20L + volume1500ml
      : 0

  useEffect(() => {
    setValue('volumeTotal', totalVolume, { shouldValidate: false, shouldDirty: false })
  }, [setValue, totalVolume])

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues)
    }
  }, [defaultValues, reset])

  const internalSubmit = handleSubmit((values) => {
    const parsed = schema.safeParse({
      ...values,
      pixKey: values.pixKey?.trim() ?? '',
      volumeTotal: totalVolume,
    })

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0]
        if (typeof path === 'string') {
          setError(path as keyof PartnerFormValues, { message: issue.message })
        }
      })
      return
    }

    onSubmit(parsed.data)
  })

  return (
    <form onSubmit={internalSubmit} className="space-y-6">
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <header>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Dados do parceiro
          </h3>
        </header>
        <div className="grid gap-4 md:grid-cols-7">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Cidade
            </label>
            <input
              {...register('city')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.city && <p className="mt-1 text-xs text-rose-300">{errors.city.message}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Estado
            </label>
            <select
              {...register('state')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            >
              <option value="SP">SP</option>
              <option value="MG">MG</option>
              <option value="RJ">RJ</option>
              <option value="PR">PR</option>
              <option value="RS">RS</option>
            </select>
            {errors.state && <p className="mt-1 text-xs text-rose-300">{errors.state.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Parceiro
            </label>
            <input
              {...register('name')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-300">{errors.name.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Distribuidora
            </label>
            <input
              {...register('distributor')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.distributor && (
              <p className="mt-1 text-xs text-rose-300">{errors.distributor.message}</p>
            )}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              CNPJ / CPF
            </label>
            <input
              {...register('document')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.document && <p className="mt-1 text-xs text-rose-300">{errors.document.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Telefone
            </label>
            <input
              {...register('phone')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.phone && <p className="mt-1 text-xs text-rose-300">{errors.phone.message}</p>}
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email
            </label>
            <input
              {...register('email')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Status
            </label>
            <select
              {...register('status')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
            {errors.status && <p className="mt-1 text-xs text-rose-300">{errors.status.message}</p>}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <header>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Dados financeiros
          </h3>
        </header>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Dia pagto.
            </label>
            <input
              type="number"
              min={1}
              max={31}
              {...register('paymentDay', { valueAsNumber: true })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.paymentDay && (
              <p className="mt-1 text-xs text-rose-300">{errors.paymentDay.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Banco
            </label>
            <input
              {...register('bank')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.bank && <p className="mt-1 text-xs text-rose-300">{errors.bank.message}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Agência e conta
            </label>
            <input
              {...register('agencyAccount')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.agencyAccount && (
              <p className="mt-1 text-xs text-rose-300">{errors.agencyAccount.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              PIX
            </label>
            <input
              {...register('pixKey')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              placeholder="Chave opcional"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <header>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Volumes médios
          </h3>
        </header>
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Cx copo
            </label>
            <input
              type="number"
              min={0}
              {...register('volumeCupBox', { valueAsNumber: true })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.volumeCupBox && (
              <p className="mt-1 text-xs text-rose-300">{errors.volumeCupBox.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              10 litros
            </label>
            <input
              type="number"
              min={0}
              {...register('volume10L', { valueAsNumber: true })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.volume10L && (
              <p className="mt-1 text-xs text-rose-300">{errors.volume10L.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              20 litros
            </label>
            <input
              type="number"
              min={0}
              {...register('volume20L', { valueAsNumber: true })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.volume20L && (
              <p className="mt-1 text-xs text-rose-300">{errors.volume20L.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              1500 ml
            </label>
            <input
              type="number"
              min={0}
              {...register('volume1500ml', { valueAsNumber: true })}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            />
            {errors.volume1500ml && (
              <p className="mt-1 text-xs text-rose-300">{errors.volume1500ml.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total
            </label>
            <input
              readOnly
              value={totalVolume}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-emerald-300"
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 shadow hover:bg-emerald-400"
      >
        Salvar parceiro
      </button>
    </form>
  )
}
