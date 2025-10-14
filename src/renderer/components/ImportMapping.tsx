const requiredMappings = [
  { key: 'colPartner', label: 'Parceiro *' },
  { key: 'colBrand', label: 'Marca *' },
  { key: 'colStoreName', label: 'Nome da loja *' },
  { key: 'colDeliveryPlace', label: 'Local de entrega *' },
]

const optionalMappings = [
  { key: 'colAddressRaw', label: 'Endereço completo' },
  { key: 'colCity', label: 'Cidade' },
  { key: 'colState', label: 'UF' },
  { key: 'colMall', label: 'Shopping' },
  { key: 'colCNPJ', label: 'CNPJ' },
  { key: 'colPhone', label: 'Telefone' },
  { key: 'colEmail', label: 'Email' },
  { key: 'colPrice20L', label: 'Preço Galão 20L' },
  { key: 'colPrice10L', label: 'Preço Galão 10L' },
  { key: 'colPrice1500', label: 'Preço PET 1500ml' },
  { key: 'colPriceCopo', label: 'Preço Caixa Copo' },
  { key: 'colPriceVasilhame', label: 'Preço Vasilhame' },
]

type MappingKey =
  | 'colPartner'
  | 'colBrand'
  | 'colStoreName'
  | 'colDeliveryPlace'
  | 'colAddressRaw'
  | 'colCity'
  | 'colState'
  | 'colMall'
  | 'colCNPJ'
  | 'colPhone'
  | 'colEmail'
  | 'colPrice20L'
  | 'colPrice10L'
  | 'colPrice1500'
  | 'colPriceCopo'
  | 'colPriceVasilhame'

export type ImportMappingValue = Partial<Record<MappingKey, string | null | undefined>>

type ImportMappingProps = {
  columns: string[]
  value: ImportMappingValue
  onChange: (value: ImportMappingValue) => void
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
