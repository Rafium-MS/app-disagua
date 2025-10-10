const requiredMappings = [
  { key: 'colPartner', label: 'Parceiro *' },
  { key: 'colStoreName', label: 'Nome da loja *' },
  { key: 'colCity', label: 'Cidade *' },
  { key: 'colState', label: 'UF *' },
]

const optionalMappings = [
  { key: 'colBrand', label: 'Marca' },
  { key: 'colMall', label: 'Shopping' },
  { key: 'colAddress', label: 'Endereço completo' },
  { key: 'colExternalCode', label: 'Código externo' },
  { key: 'colCNPJ', label: 'CNPJ' },
  { key: 'colPhone', label: 'Telefone' },
  { key: 'colEmail', label: 'Email' },
  { key: 'colValue20L', label: 'Preço Galão 20L' },
  { key: 'colValue10L', label: 'Preço Galão 10L' },
  { key: 'colValue1500', label: 'Preço PET 1500ml' },
  { key: 'colValueCopo', label: 'Preço Caixa Copo' },
  { key: 'colValueVasilhame', label: 'Preço Vasilhame' },
]

type MappingKey =
  | 'colPartner'
  | 'colStoreName'
  | 'colCity'
  | 'colState'
  | 'colBrand'
  | 'colMall'
  | 'colAddress'
  | 'colExternalCode'
  | 'colCNPJ'
  | 'colPhone'
  | 'colEmail'
  | 'colValue20L'
  | 'colValue10L'
  | 'colValue1500'
  | 'colValueCopo'
  | 'colValueVasilhame'

type ImportMappingProps = {
  columns: string[]
  value: Partial<Record<MappingKey, string | null | undefined>>
  onChange: (value: Partial<Record<MappingKey, string | null | undefined>>) => void
}

export function ImportMapping({ columns, value, onChange }: ImportMappingProps) {
  const renderSelect = (key: MappingKey, label: string, required?: boolean) => (
    <div key={key} className="flex flex-col gap-1">
      <label className="text-sm font-medium text-fg/80" htmlFor={key}>
        {label} {required ? <span className="text-red-400">*</span> : null}
      </label>
      <select
        id={key}
        value={value[key] ?? ''}
        onChange={(event) =>
          onChange({
            ...value,
            [key]: event.target.value === '' ? undefined : event.target.value,
          })
        }
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <option value="">— Não mapear —</option>
        {columns.map((column) => (
          <option key={column} value={column}>
            {column}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-fg">Campos obrigatórios</h3>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          {requiredMappings.map((field) => renderSelect(field.key as MappingKey, field.label, true))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-fg">Campos opcionais</h3>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          {optionalMappings.map((field) => renderSelect(field.key as MappingKey, field.label))}
        </div>
      </div>
    </div>
  )
}
