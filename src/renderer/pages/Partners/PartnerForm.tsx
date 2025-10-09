import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(3, 'Informe o nome do parceiro'),
  email: z.string().email('Informe um e-mail válido'),
  state: z.string().min(2, 'UF inválida'),
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
  } = useForm<PartnerFormValues>({
    defaultValues: defaultValues ?? {
      name: '',
      email: '',
      state: 'SP',
      status: 'ativo',
    },
  })

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues)
    }
  }, [defaultValues, reset])

  const internalSubmit = handleSubmit((values) => {
    const result = schema.safeParse(values)
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const path = issue.path[0]
        if (typeof path === 'string') {
          setError(path as keyof PartnerFormValues, { message: issue.message })
        }
      })
      return
    }

    onSubmit(result.data)
  })

  return (
    <form onSubmit={internalSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">Nome</label>
        <input
          {...register('name')}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
        />
        {errors.name && <p className="text-xs text-rose-300">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">E-mail</label>
        <input
          {...register('email')}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
        />
        {errors.email && <p className="text-xs text-rose-300">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
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
            <option value="RS">RS</option>
          </select>
          {errors.state && <p className="text-xs text-rose-300">{errors.state.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Status</label>
          <select
            {...register('status')}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
          {errors.status && <p className="text-xs text-rose-300">{errors.status.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
      >
        Salvar parceiro
      </button>
    </form>
  )
}
