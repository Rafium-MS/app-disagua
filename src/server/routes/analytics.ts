import type { Prisma, PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma'

type ProductColumn = 'CX COPO' | '10 LITROS' | '20 LITROS' | '1500 ML'
type QuantityKey = `${ProductColumn}_qtd`
type ValueKey = `${ProductColumn}_val`
type NumericKey = QuantityKey | ValueKey | 'TOTAL_qtd' | 'TOTAL_val'

const productLabelByCode: Record<string, ProductColumn | undefined> = {
  CAIXA_COPO: 'CX COPO',
  GALAO_10L: '10 LITROS',
  GALAO_20L: '20 LITROS',
  PET_1500ML: '1500 ML'
}

type PartnerWithStores = Prisma.PartnerGetPayload<{
  select: {
    id: true
    name: true
    distributor: true
    taxId: true
    document: true
    phone: true
    email: true
    city: true
    state: true
    paymentDay: true
    bankName: true
    bankBranch: true
    bankAccount: true
    pixKey: true
    stores: { select: { id: true; city: true; state: true } }
  }
}>

type InternalMonthlyRow = {
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
  missingPriceProducts: Set<ProductColumn>
}

export type MonthlySummaryRow = Omit<InternalMonthlyRow, 'missingPriceProducts'> & {
  missingPriceProducts: ProductColumn[]
  hasMissingPrice: boolean
}

type Totals = Record<NumericKey, number>

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

const monthlySummaryQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Informe o mês no formato YYYY-MM'),
    state: z
      .string()
      .trim()
      .transform((value) => (value ? value.toUpperCase() : value))
      .refine((value) => !value || /^[A-Z]{2}$/.test(value), {
        message: 'Informe a UF com 2 letras'
      })
      .optional(),
    distributor: z
      .string()
      .trim()
      .transform((value) => value || undefined)
      .optional()
  })
  .strict()

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function createEmptyTotals(): Totals {
  return numericKeys.reduce((accumulator, key) => {
    accumulator[key] = 0
    return accumulator
  }, {} as Totals)
}

function resolvePartnerLocation(partner: PartnerWithStores) {
  let cidade = partner.city ?? null
  let estado = partner.state ?? null

  if (!cidade || !estado) {
    const counters = new Map<string, number>()
    for (const store of partner.stores ?? []) {
      const city = store.city?.trim() ?? ''
      const state = store.state?.trim() ?? ''
      if (!city && !state) {
        continue
      }
      const key = `${city}|${state}`
      counters.set(key, (counters.get(key) ?? 0) + 1)
    }

    const [topKey] = [...counters.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
    if (topKey) {
      const [city, state] = topKey.split('|')
      if (!cidade && city) {
        cidade = city
      }
      if (!estado && state) {
        estado = state
      }
    }
  }

  return { cidade: cidade ?? null, estado: estado ?? null }
}

function ensureRow(
  rows: Map<number, InternalMonthlyRow>,
  partnerId: number,
  partnerMap: Map<number, PartnerWithStores>
) {
  const existing = rows.get(partnerId)
  if (existing) {
    return existing
  }

  const partner = partnerMap.get(partnerId)
  if (!partner) {
    throw new Error(`Parceiro ${partnerId} não encontrado para agregação`)
  }

  const agenciaConta = [partner.bankBranch, partner.bankAccount]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' / ')

  const { cidade, estado } = resolvePartnerLocation(partner)

  const row: InternalMonthlyRow = {
    partnerId,
    CIDADE: cidade,
    ESTADO: estado,
    PARCEIRO: partner.name,
    DISTRIBUIDORA: partner.distributor ?? null,
    'CNPJ/CPF': partner.taxId ?? partner.document ?? null,
    TELEFONE: partner.phone ?? null,
    EMAIL: partner.email ?? null,
    'DIA PAGTO.': partner.paymentDay ?? null,
    BANCO: partner.bankName ?? null,
    'AGÊNCIA E CONTA': agenciaConta || null,
    PIX: partner.pixKey ?? null,
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
    missingPriceCount: 0,
    missingPriceProducts: new Set()
  }

  rows.set(partnerId, row)
  return row
}

const createAnalyticsRouter = ({ prisma: prismaClient }: { prisma: PrismaClient }) => {
  const router = Router()

  router.get('/partners/monthly-summary', async (req, res) => {
    try {
      const { month, state, distributor } = monthlySummaryQuerySchema.parse(req.query)

      const periodStart = startOfMonth(new Date(`${month}-01T00:00:00`))
      const periodEnd = endOfMonth(periodStart)

      const vouchers = await prismaClient.voucher.findMany({
        where: {
          issuedAt: {
            gte: periodStart,
            lte: periodEnd
          }
        },
        select: {
          id: true,
          partnerId: true,
          storeId: true,
          product: true,
          quantity: true
        }
      })

      if (vouchers.length === 0) {
        res.json({
          month,
          currency: 'BRL',
          rows: [],
          totals: createEmptyTotals(),
          filters: { states: [], distributors: [] }
        })
        return
      }

      const storeIds = [...new Set(vouchers.map((voucher) => voucher.storeId).filter(Boolean) as string[])]

      const storePrices = await prismaClient.storePrice.findMany({
        where: storeIds.length ? { storeId: { in: storeIds } } : undefined,
        select: { storeId: true, product: true, unitCents: true }
      })

      const priceMap = new Map<string, number>()
      for (const price of storePrices) {
        priceMap.set(`${price.storeId}:${price.product}`, price.unitCents)
      }

      const partnerIds = [...new Set(vouchers.map((voucher) => voucher.partnerId))]

      const partners = await prismaClient.partner.findMany({
        where: { id: { in: partnerIds } },
        select: {
          id: true,
          name: true,
          distributor: true,
          taxId: true,
          document: true,
          phone: true,
          email: true,
          city: true,
          state: true,
          paymentDay: true,
          bankName: true,
          bankBranch: true,
          bankAccount: true,
          pixKey: true,
          stores: { select: { id: true, city: true, state: true } }
        }
      })

      const partnerMap = new Map<number, PartnerWithStores>(partners.map((partner) => [partner.id, partner]))

      const rows = new Map<number, InternalMonthlyRow>()

      for (const voucher of vouchers) {
        const partner = partnerMap.get(voucher.partnerId)
        if (!partner) {
          continue
        }

        const row = ensureRow(rows, voucher.partnerId, partnerMap)
        const quantity = Math.max(1, voucher.quantity ?? 1)
        const productLabel = voucher.product ? productLabelByCode[voucher.product] : undefined
        const priceKey = voucher.storeId && voucher.product ? `${voucher.storeId}:${voucher.product}` : null
        const hasPrice = priceKey ? priceMap.has(priceKey) : false
        const unitValue = hasPrice ? priceMap.get(priceKey!) ?? 0 : 0
        const totalValue = unitValue * quantity

        if (productLabel) {
          const qtyKey = `${productLabel}_qtd` as QuantityKey
          const valKey = `${productLabel}_val` as ValueKey
          row[qtyKey] += quantity
          row[valKey] += totalValue
        }

        row.TOTAL_qtd += quantity
        row.TOTAL_val += totalValue

        if (!hasPrice && (voucher.product || voucher.storeId)) {
          row.missingPriceCount += 1
          if (productLabel) {
            row.missingPriceProducts.add(productLabel)
          }
        }
      }

      let outputRows: MonthlySummaryRow[] = [...rows.values()].map((row) => ({
        ...row,
        missingPriceProducts: [...row.missingPriceProducts],
        hasMissingPrice: row.missingPriceCount > 0
      }))

      outputRows.sort((a, b) => a.PARCEIRO.localeCompare(b.PARCEIRO, 'pt-BR'))

      const availableStates = Array.from(
        new Set(outputRows.map((row) => row.ESTADO).filter((value): value is string => Boolean(value)))
      ).sort()

      const availableDistributors = Array.from(
        new Set(
          outputRows
            .map((row) => row.DISTRIBUIDORA)
            .filter((value): value is string => Boolean(value))
            .map((value) => value.trim())
        )
      ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

      const distributorFilter = distributor?.toLocaleLowerCase('pt-BR')

      outputRows = outputRows.filter((row) => {
        if (state && row.ESTADO?.toUpperCase() !== state) {
          return false
        }
        if (distributorFilter) {
          const rowDistributor = row.DISTRIBUIDORA?.toLocaleLowerCase('pt-BR')
          if (!rowDistributor || rowDistributor !== distributorFilter) {
            return false
          }
        }
        return true
      })

      const totals = createEmptyTotals()
      for (const row of outputRows) {
        for (const key of numericKeys) {
          totals[key] += row[key]
        }
      }

      res.json({
        month,
        currency: 'BRL',
        rows: outputRows,
        totals,
        filters: {
          states: availableStates,
          distributors: availableDistributors
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Parâmetros inválidos',
          details: error.flatten().fieldErrors
        })
        return
      }

      console.error('Erro ao gerar resumo mensal de parceiros', error)
      res.status(500).json({ error: 'Não foi possível gerar o resumo mensal' })
    }
  })

  return router
}

const analyticsRouter = createAnalyticsRouter({ prisma })

export { createAnalyticsRouter, analyticsRouter }
