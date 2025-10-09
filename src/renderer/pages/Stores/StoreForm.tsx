import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(3, 'Informe o nome da loja'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().min(2, 'UF obrigatória'),
  partner: z.string().min(1, 'Selecione um parceiro'),
  contact: z.string().optional(),
})

export type StoreFormValues = z.infer<typeof schema>

export type StoreFormProps = {
  defaultValues?: StoreFormValues
  onSubmit: (values: StoreFormValues) => void
}

export function StoreForm({ defaultValues, onSubmit }: StoreFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<StoreFormValues>({
    defaultValues: defaultValues ?? {
      name: '',
      cnpj: '',
      city: '',
      state: 'SP',
      partner: '',
      contact: '',
    },
  })

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues)
    }
  }, [defaultValues, reset])

  const internalSubmit = handleSubmit((values) => {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0]
        if (typeof path === 'string') {
          setError(path as keyof StoreFormValues, { message: issue.message })
        }
      })
      return
    }

    onSubmit(parsed.data)
  })

  return (
    <form onSubmit={internalSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">Nome da loja</label>
        <input
          {...register('name')}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
        />
        {errors.name && <p className="text-xs text-rose-300">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">CNPJ</label>
        <input
          {...register('cnpj')}
          placeholder="00.000.000/0000-00"
          className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
        />
        {errors.cnpj && <p className="text-xs text-rose-300">{errors.cnpj.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Cidade</label>
          <input
            {...register('city')}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
          />
          {errors.city && <p className="text-xs text-rose-300">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">UF</label>
          <select
            {...register('state')}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
          >
            <option value="SP">SP</option>
            <option value="MG">MG</option>
            <option value="RJ">RJ</option>
            <option value="PR">PR</option>
          </select>
          {errors.state && <p className="text-xs text-rose-300">{errors.state.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">Parceiro</label>
        <select
          {...register('partner')}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">Selecione</option>
          <option value="p-001">Aquarius Group</option>
          <option value="p-002">Fonte Viva</option>
          <option value="p-003">Rio Claro Distribuidora</option>
        </select>
        {errors.partner && <p className="text-xs text-rose-300">{errors.partner.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">Contato</label>
        <input
          {...register('contact')}
          placeholder="(11) 99999-9999"
          className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
        />
        {errors.contact && <p className="text-xs text-rose-300">{errors.contact.message}</p>}
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
      >
        Salvar loja
      </button>
    </form>
  )
}
