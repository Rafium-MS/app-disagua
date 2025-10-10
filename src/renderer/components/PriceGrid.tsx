import { storeProductLabels, storeProductTypes, type StoreProductType } from '@shared/store-utils'

export type PriceGridValues = Partial<Record<StoreProductType, string>>

type PriceGridProps = {
  values: PriceGridValues
  onChange: (product: StoreProductType, value: string) => void
}

export function PriceGrid({ values, onChange }: PriceGridProps) {
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card/40 p-4 md:grid-cols-2">
      {storeProductTypes.map((product) => (
        <div key={product} className="space-y-1">
          <label className="block text-sm font-medium text-fg/80" htmlFor={`price-${product}`}>
            {storeProductLabels[product]}
          </label>
          <input
            id={`price-${product}`}
            type="text"
            inputMode="decimal"
            placeholder="R$ 0,00"
            value={values[product] ?? ''}
            onChange={(event) => onChange(product, event.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <p className="text-xs text-fg/50">Informe o valor no formato brasileiro (ex.: 25,90).</p>
        </div>
      ))}
    </div>
  )
}
