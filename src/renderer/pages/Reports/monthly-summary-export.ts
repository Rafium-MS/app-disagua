import { centsToBRL } from '@shared/store-utils'

import type { MonthlySummaryResponse, MonthlySummaryRow, NumericKey } from './PartnersMonthlyTable'

type BuildCsvParams = {
  rows: MonthlySummaryResponse['rows']
  totals: MonthlySummaryResponse['totals']
  filteredRows: MonthlySummaryRow[]
  filteredTotals: Record<NumericKey, number>
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
  'TOTAL (R$)',
] as const

const quote = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`

function normalizeField(value: string | number | null): string {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'number') {
    return String(value)
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : '-'
}

export function buildMonthlySummaryCsv({ rows, totals, filteredRows, filteredTotals }: BuildCsvParams): string {
  const effectiveRows = filteredRows.length ? filteredRows : rows
  const effectiveTotals = filteredRows.length ? filteredTotals : totals

  const bodyLines = effectiveRows.map((row) => [
    normalizeField(row.CIDADE),
    normalizeField(row.ESTADO),
    row.PARCEIRO,
    normalizeField(row.DISTRIBUIDORA),
    normalizeField(row['CNPJ/CPF']),
    normalizeField(row.TELEFONE),
    normalizeField(row.EMAIL),
    normalizeField(row['DIA PAGTO.']),
    normalizeField(row.BANCO),
    normalizeField(row['AGÊNCIA E CONTA']),
    normalizeField(row.PIX),
    normalizeField(row['CX COPO_qtd']),
    centsToBRL(row['CX COPO_val']),
    normalizeField(row['10 LITROS_qtd']),
    centsToBRL(row['10 LITROS_val']),
    normalizeField(row['20 LITROS_qtd']),
    centsToBRL(row['20 LITROS_val']),
    normalizeField(row['1500 ML_qtd']),
    centsToBRL(row['1500 ML_val']),
    normalizeField(row.TOTAL_qtd),
    centsToBRL(row.TOTAL_val),
  ])

  const totalsLine = [
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
    normalizeField(effectiveTotals['CX COPO_qtd'] ?? 0),
    centsToBRL(effectiveTotals['CX COPO_val'] ?? 0),
    normalizeField(effectiveTotals['10 LITROS_qtd'] ?? 0),
    centsToBRL(effectiveTotals['10 LITROS_val'] ?? 0),
    normalizeField(effectiveTotals['20 LITROS_qtd'] ?? 0),
    centsToBRL(effectiveTotals['20 LITROS_val'] ?? 0),
    normalizeField(effectiveTotals['1500 ML_qtd'] ?? 0),
    centsToBRL(effectiveTotals['1500 ML_val'] ?? 0),
    normalizeField(effectiveTotals.TOTAL_qtd ?? 0),
    centsToBRL(effectiveTotals.TOTAL_val ?? 0),
  ]

  return [header, ...bodyLines, totalsLine].map((line) => line.map(quote).join(',')).join('\n')
}

export function buildMonthlySummaryFilename(month: string): string {
  const normalized = month.trim()
  if (!normalized) {
    return 'resumo-parceiros.csv'
  }

  const safeMonth = normalized.replace(/[^0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (!safeMonth) {
    return 'resumo-parceiros.csv'
  }

  return `resumo-parceiros-${safeMonth}.csv`
}

