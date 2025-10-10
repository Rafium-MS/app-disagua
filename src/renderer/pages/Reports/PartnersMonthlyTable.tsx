import { useEffect, useMemo, useState } from 'react'

import { centsToBRL } from '@shared/store-utils'

type MonthlySummaryRow = {
  partnerId: number
  CIDADE: string | null
  ESTADO: string | null
  PARCEIRO: string
  DISTRIBUIDORA: string | null
  'CNPJ/CPF': string | null
  TELEFONE: string | null
  EMAIL: string | null
  'DIA PAGTO.': number | null
  BANCO: string | null
  'AGÊNCIA E CONTA': string | null
  PIX: string | null
  'CX COPO_qtd': number
  'CX COPO_val': number
  '10 LITROS_qtd': number
  '10 LITROS_val': number
  '20 LITROS_qtd': number
  '20 LITROS_val': number
  '1500 ML_qtd': number
  '1500 ML_val': number
  TOTAL_qtd: number
  TOTAL_val: number
  missingPriceCount: number
  hasMissingPrice: boolean
  missingPriceProducts: string[]
}

type NumericKey =
  | 'CX COPO_qtd'
  | 'CX COPO_val'
  | '10 LITROS_qtd'
  | '10 LITROS_val'
  | '20 LITROS_qtd'
  | '20 LITROS_val'
  | '1500 ML_qtd'
  | '1500 ML_val'
  | 'TOTAL_qtd'
  | 'TOTAL_val'

type MonthlySummaryResponse = {
  month: string
  currency: string
  rows: MonthlySummaryRow[]
  totals: Record<NumericKey, number>
  filters: {
    states: string[]
    distributors: string[]
  }
}

const numericKeys: NumericKey[] = [
  'CX COPO_qtd',
  'CX COPO_val',
  '10 LITROS_qtd',
  '10 LITROS_val',
  '20 LITROS_qtd',
  '20 LITROS_val',
  '1500 ML_qtd',
  '1500 ML_val',
  'TOTAL_qtd',
  'TOTAL_val'
]

function createEmptyTotals() {
  return numericKeys.reduce<Record<NumericKey, number>>((accumulator, key) => {
    accumulator[key] = 0
    return accumulator
  }, {} as Record<NumericKey, number>)
}

type PartnersMonthlyTableProps = {
  month: string
}

export default function PartnersMonthlyTable({ month }: PartnersMonthlyTableProps) {
  const [data, setData] = useState<MonthlySummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [distributorFilter, setDistributorFilter] = useState<string>('all')
  const [onlyMissingPrice, setOnlyMissingPrice] = useState<boolean>(false)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    setData(null)

    fetch(`/api/partners/monthly-summary?month=${month}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? 'Erro ao carregar resumo mensal')
        }
        return response.json() as Promise<MonthlySummaryResponse>
      })
      .then((payload) => {
        setData(payload)
      })
      .catch((fetchError) => {
        if (fetchError.name === 'AbortError') {
          return
        }
        setError(fetchError.message ?? 'Erro desconhecido ao carregar o resumo mensal')
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [month])

  useEffect(() => {
    setStateFilter('all')
    setDistributorFilter('all')
    setOnlyMissingPrice(false)
  }, [month])

  const filteredRows = useMemo(() => {
    if (!data) {
      return [] as MonthlySummaryRow[]
    }

    return data.rows.filter((row) => {
      if (stateFilter !== 'all' && row.ESTADO !== stateFilter) {
        return false
      }

      if (distributorFilter !== 'all' && row.DISTRIBUIDORA !== distributorFilter) {
        return false
      }

      if (onlyMissingPrice && !row.hasMissingPrice) {
        return false
      }

      return true
    })
  }, [data, stateFilter, distributorFilter, onlyMissingPrice])

  const totals = useMemo(() => {
    if (!filteredRows.length) {
      return createEmptyTotals()
    }

    return filteredRows.reduce<Record<NumericKey, number>>((accumulator, row) => {
      for (const key of numericKeys) {
        accumulator[key] = (accumulator[key] ?? 0) + row[key]
      }
      return accumulator
    }, createEmptyTotals())
  }, [filteredRows])

  const hasData = !!data && filteredRows.length > 0

  function handleExportCsv() {
    if (!data) {
      return
    }

    const header = [
      'CIDADE',
      'ESTADO',
      'PARCEIRO',
      'DISTRIBUIDORA',
      'CNPJ/CPF',
      'TELEFONE',
      'EMAIL',
      'DIA PAGTO.',
      'BANCO',
      'AGÊNCIA E CONTA',
      'PIX',
      'CX COPO (qtd)',
      'CX COPO (R$)',
      '10 LITROS (qtd)',
      '10 LITROS (R$)',
      '20 LITROS (qtd)',
      '20 LITROS (R$)',
      '1500 ML (qtd)',
      '1500 ML (R$)',
      'TOTAL (qtd)',
      'TOTAL (R$)'
    ]

    const rows = filteredRows.length ? filteredRows : data.rows
    const exportTotals = filteredRows.length ? totals : data.totals

    const csvRows = rows.map((row) => [
      row.CIDADE ?? '-',
      row.ESTADO ?? '-',
      row.PARCEIRO,
      row.DISTRIBUIDORA ?? '-',
      row['CNPJ/CPF'] ?? '-',
      row.TELEFONE ?? '-',
      row.EMAIL ?? '-',
      row['DIA PAGTO.'] ?? '-',
      row.BANCO ?? '-',
      row['AGÊNCIA E CONTA'] ?? '-',
      row.PIX ?? '-',
      String(row['CX COPO_qtd']),
      centsToBRL(row['CX COPO_val']),
      String(row['10 LITROS_qtd']),
      centsToBRL(row['10 LITROS_val']),
      String(row['20 LITROS_qtd']),
      centsToBRL(row['20 LITROS_val']),
      String(row['1500 ML_qtd']),
      centsToBRL(row['1500 ML_val']),
      String(row.TOTAL_qtd),
      centsToBRL(row.TOTAL_val)
    ])

    const totalsRow = [
      'Totais',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      String(exportTotals['CX COPO_qtd'] ?? 0),
      centsToBRL(exportTotals['CX COPO_val'] ?? 0),
      String(exportTotals['10 LITROS_qtd'] ?? 0),
      centsToBRL(exportTotals['10 LITROS_val'] ?? 0),
      String(exportTotals['20 LITROS_qtd'] ?? 0),
      centsToBRL(exportTotals['20 LITROS_val'] ?? 0),
      String(exportTotals['1500 ML_qtd'] ?? 0),
      centsToBRL(exportTotals['1500 ML_val'] ?? 0),
      String(exportTotals.TOTAL_qtd ?? 0),
      centsToBRL(exportTotals.TOTAL_val ?? 0)
    ]

    const csvContent = [header, ...csvRows, totalsRow]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `resumo-parceiros-${month}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <div>Carregando…</div>
  }

  if (error) {
    return <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
  }

  if (!data) {
    return null
  }

  if (!data.rows.length) {
    return <div>Sem comprovantes no período.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-state" className="text-xs uppercase tracking-wide text-fg/60">
            UF
          </label>
          <select
            id="filter-state"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
            className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Todas</option>
            {data.filters.states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-distributor" className="text-xs uppercase tracking-wide text-fg/60">
            Distribuidora
          </label>
          <select
            id="filter-distributor"
            value={distributorFilter}
            onChange={(event) => setDistributorFilter(event.target.value)}
            className="min-w-[180px] rounded-lg border border-border bg-bg px-2 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Todas</option>
            {data.filters.distributors.map((distributor) => (
              <option key={distributor} value={distributor}>
                {distributor}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs text-fg/70">
          <input
            type="checkbox"
            checked={onlyMissingPrice}
            onChange={(event) => setOnlyMissingPrice(event.target.checked)}
            className="h-3 w-3 rounded border border-border bg-card"
          />
          Somente parceiros com preço ausente
        </label>

        <button
          type="button"
          onClick={handleExportCsv}
          className="ml-auto rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-fg transition hover:bg-muted"
        >
          Exportar CSV
        </button>
      </div>

      <div className="overflow-auto rounded-xl border border-border">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-fg/60">
            <tr>
              <th className="p-2 text-left">CIDADE</th>
              <th className="p-2 text-left">ESTADO</th>
              <th className="p-2 text-left">PARCEIRO</th>
              <th className="p-2 text-left">DISTRIBUIDORA</th>
              <th className="p-2 text-left">CNPJ/CPF</th>
              <th className="p-2 text-left">TELEFONE</th>
              <th className="p-2 text-left">EMAIL</th>
              <th className="p-2 text-left">DIA PAGTO.</th>
              <th className="p-2 text-left">BANCO</th>
              <th className="p-2 text-left">AGÊNCIA E CONTA</th>
              <th className="p-2 text-left">PIX</th>
              <th className="p-2 text-right">CX COPO (qtd)</th>
              <th className="p-2 text-right">CX COPO (R$)</th>
              <th className="p-2 text-right">10 LITROS (qtd)</th>
              <th className="p-2 text-right">10 LITROS (R$)</th>
              <th className="p-2 text-right">20 LITROS (qtd)</th>
              <th className="p-2 text-right">20 LITROS (R$)</th>
              <th className="p-2 text-right">1500 ML (qtd)</th>
              <th className="p-2 text-right">1500 ML (R$)</th>
              <th className="p-2 text-right">TOTAL (qtd)</th>
              <th className="p-2 text-right">TOTAL (R$)</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {filteredRows.map((row) => (
              <tr key={row.partnerId} className="odd:bg-card even:bg-muted/20">
                <td className="p-2">{row.CIDADE ?? '-'}</td>
                <td className="p-2">{row.ESTADO ?? '-'}</td>
                <td className="p-2 font-medium">
                  <span>{row.PARCEIRO}</span>
                  {row.hasMissingPrice ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide badge-warn">
                      preço pendente
                    </span>
                  ) : null}
                </td>
                <td className="p-2">{row.DISTRIBUIDORA ?? '-'}</td>
                <td className="p-2">{row['CNPJ/CPF'] ?? '-'}</td>
                <td className="p-2">{row.TELEFONE ?? '-'}</td>
                <td className="p-2">{row.EMAIL ?? '-'}</td>
                <td className="p-2">{row['DIA PAGTO.'] ?? '-'}</td>
                <td className="p-2">{row.BANCO ?? '-'}</td>
                <td className="p-2">{row['AGÊNCIA E CONTA'] ?? '-'}</td>
                <td className="p-2">{row.PIX ?? '-'}</td>
                <td className="p-2 text-right">{row['CX COPO_qtd']}</td>
                <td
                  className={`p-2 text-right ${
                    row.missingPriceProducts.includes('CX COPO') && row['CX COPO_qtd'] > 0
                      ? 'text-[rgb(var(--warn))]'
                      : ''
                  }`}
                >
                  {centsToBRL(row['CX COPO_val'])}
                </td>
                <td className="p-2 text-right">{row['10 LITROS_qtd']}</td>
                <td
                  className={`p-2 text-right ${
                    row.missingPriceProducts.includes('10 LITROS') && row['10 LITROS_qtd'] > 0
                      ? 'text-[rgb(var(--warn))]'
                      : ''
                  }`}
                >
                  {centsToBRL(row['10 LITROS_val'])}
                </td>
                <td className="p-2 text-right">{row['20 LITROS_qtd']}</td>
                <td
                  className={`p-2 text-right ${
                    row.missingPriceProducts.includes('20 LITROS') && row['20 LITROS_qtd'] > 0
                      ? 'text-[rgb(var(--warn))]'
                      : ''
                  }`}
                >
                  {centsToBRL(row['20 LITROS_val'])}
                </td>
                <td className="p-2 text-right">{row['1500 ML_qtd']}</td>
                <td
                  className={`p-2 text-right ${
                    row.missingPriceProducts.includes('1500 ML') && row['1500 ML_qtd'] > 0
                      ? 'text-[rgb(var(--warn))]'
                      : ''
                  }`}
                >
                  {centsToBRL(row['1500 ML_val'])}
                </td>
                <td className="p-2 text-right font-semibold">{row.TOTAL_qtd}</td>
                <td className="p-2 text-right font-semibold">{centsToBRL(row.TOTAL_val)}</td>
              </tr>
            ))}

            {!hasData && (
              <tr>
                <td colSpan={21} className="p-4 text-center text-sm text-fg/60">
                  Nenhum parceiro encontrado com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 font-semibold text-fg">
              <td className="p-2 text-right" colSpan={11}>
                Totais do período
              </td>
              <td className="p-2 text-right">{totals['CX COPO_qtd']}</td>
              <td className="p-2 text-right">{centsToBRL(totals['CX COPO_val'])}</td>
              <td className="p-2 text-right">{totals['10 LITROS_qtd']}</td>
              <td className="p-2 text-right">{centsToBRL(totals['10 LITROS_val'])}</td>
              <td className="p-2 text-right">{totals['20 LITROS_qtd']}</td>
              <td className="p-2 text-right">{centsToBRL(totals['20 LITROS_val'])}</td>
              <td className="p-2 text-right">{totals['1500 ML_qtd']}</td>
              <td className="p-2 text-right">{centsToBRL(totals['1500 ML_val'])}</td>
              <td className="p-2 text-right">{totals.TOTAL_qtd}</td>
              <td className="p-2 text-right">{centsToBRL(totals.TOTAL_val)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-fg/60">
        {hasData
          ? `${filteredRows.length} parceiro(s) exibido(s).`
          : 'Ajuste os filtros para visualizar os parceiros.'}
      </p>
    </div>
  )
}
