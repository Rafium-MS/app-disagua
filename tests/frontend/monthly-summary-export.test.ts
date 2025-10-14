import { describe, expect, it } from 'vitest'

import {
  buildMonthlySummaryCsv,
  buildMonthlySummaryFilename,
} from '../../src/renderer/pages/Reports/monthly-summary-export'
import type { MonthlySummaryRow, NumericKey } from '../../src/renderer/pages/Reports/PartnersMonthlyTable'

const baseRow: MonthlySummaryRow = {
  partnerId: 1,
  CIDADE: 'São Paulo',
  ESTADO: 'SP',
  PARCEIRO: 'Água "Boa" LTDA',
  DISTRIBUIDORA: 'Distribuidora Central',
  'CNPJ/CPF': '12.345.678/0001-99',
  TELEFONE: '(11) 91234-5678',
  EMAIL: 'contato@example.com',
  'DIA PAGTO.': 15,
  BANCO: 'Banco do Brasil',
  'AGÊNCIA E CONTA': '1234-5 / 67890-1',
  PIX: 'contato@example.com',
  'CX COPO_qtd': 10,
  'CX COPO_val': 12300,
  '10 LITROS_qtd': 5,
  '10 LITROS_val': 8900,
  '20 LITROS_qtd': 8,
  '20 LITROS_val': 13600,
  '1500 ML_qtd': 20,
  '1500 ML_val': 4500,
  TOTAL_qtd: 43,
  TOTAL_val: 39300,
  missingPriceCount: 0,
  hasMissingPrice: false,
  missingPriceProducts: [],
}

const emptyTotals: Record<NumericKey, number> = {
  'CX COPO_qtd': 0,
  'CX COPO_val': 0,
  '10 LITROS_qtd': 0,
  '10 LITROS_val': 0,
  '20 LITROS_qtd': 0,
  '20 LITROS_val': 0,
  '1500 ML_qtd': 0,
  '1500 ML_val': 0,
  TOTAL_qtd: 0,
  TOTAL_val: 0,
}

describe('monthly summary export helpers', () => {
  it('gera CSV com todas as linhas quando nenhum filtro é aplicado', () => {
    const csv = buildMonthlySummaryCsv({
      rows: [baseRow],
      totals: {
        ...emptyTotals,
        'CX COPO_qtd': 10,
        'CX COPO_val': 12300,
        '10 LITROS_qtd': 5,
        '10 LITROS_val': 8900,
        '20 LITROS_qtd': 8,
        '20 LITROS_val': 13600,
        '1500 ML_qtd': 20,
        '1500 ML_val': 4500,
        TOTAL_qtd: 43,
        TOTAL_val: 39300,
      },
      filteredRows: [],
      filteredTotals: emptyTotals,
    })

    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('"PARCEIRO"')
    expect(lines[1]).toContain('"Água ""Boa"" LTDA"')
    expect(lines[2]).toContain('"Totais"')
    expect(lines[2]).toContain('"10"')
    expect(lines[2]).toContain('"R$\u00a0123,00"')
    expect(lines[2]).toContain('"R$\u00a0136,00"')
    expect(lines[2]).toContain('"R$\u00a045,00"')
    expect(lines[2]).toContain('"43"')
  })

  it('usa linhas e totais filtrados quando fornecidos', () => {
    const filteredRow: MonthlySummaryRow = {
      ...baseRow,
      partnerId: 2,
      PARCEIRO: 'Distribuidora Sul',
      CIDADE: '',
      TELEFONE: null,
      PIX: '',
      'CX COPO_qtd': 0,
      'CX COPO_val': 0,
      '10 LITROS_qtd': 0,
      '10 LITROS_val': 0,
      '20 LITROS_qtd': 2,
      '20 LITROS_val': 8000,
      '1500 ML_qtd': 0,
      '1500 ML_val': 0,
      TOTAL_qtd: 2,
      TOTAL_val: 8000,
    }

    const csv = buildMonthlySummaryCsv({
      rows: [baseRow, filteredRow],
      totals: emptyTotals,
      filteredRows: [filteredRow],
      filteredTotals: {
        ...emptyTotals,
        '20 LITROS_qtd': 2,
        '20 LITROS_val': 8000,
        TOTAL_qtd: 2,
        TOTAL_val: 8000,
      },
    })

    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('"Distribuidora Sul"')
    expect(lines[1]).toContain('"-"')
    expect(lines[2]).toContain('"2"')
    expect(lines[2]).toContain('"R$\u00a080,00"')
  })

  it('gera nome de arquivo seguro baseado no mês', () => {
    expect(buildMonthlySummaryFilename('2024-04')).toBe('resumo-parceiros-2024-04.csv')
    expect(buildMonthlySummaryFilename('  2024/05  ')).toBe('resumo-parceiros-2024-05.csv')
    expect(buildMonthlySummaryFilename('')).toBe('resumo-parceiros.csv')
  })
})
