import express from 'express'
import request from 'supertest'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createAnalyticsRouter } from '../../src/server/routes/analytics'

const createPrismaMock = () => ({
  voucher: {
    findMany: vi.fn()
  },
  storePrice: {
    findMany: vi.fn()
  },
  partner: {
    findMany: vi.fn()
  }
})

const createApp = (prismaMock: ReturnType<typeof createPrismaMock>) => {
  const app = express()
  app.use('/api', createAnalyticsRouter({ prisma: prismaMock as unknown as PrismaClient }))
  return app
}

describe('GET /api/partners/monthly-summary', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>

  beforeEach(() => {
    prismaMock = createPrismaMock()
  })

  it('valida o parâmetro de mês', async () => {
    const app = createApp(prismaMock)

    const response = await request(app).get('/api/partners/monthly-summary').query({ month: '2024/04' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual(expect.objectContaining({ error: 'Parâmetros inválidos' }))
  })

  it('retorna linhas agregadas com totais e indicadores de preço ausente', async () => {
    const vouchers = [
      {
        id: 1,
        partnerId: 10,
        storeId: 'store-1',
        product: 'GALAO_20L',
        quantity: 2
      },
      {
        id: 2,
        partnerId: 10,
        storeId: 'store-1',
        product: 'GALAO_20L',
        quantity: 1
      },
      {
        id: 3,
        partnerId: 10,
        storeId: 'store-2',
        product: 'CAIXA_COPO',
        quantity: null
      }
    ]

    prismaMock.voucher.findMany.mockResolvedValue(vouchers)
    prismaMock.storePrice.findMany.mockResolvedValue([
      { storeId: 'store-1', product: 'GALAO_20L', unitCents: 1500 }
    ])
    prismaMock.partner.findMany.mockResolvedValue([
      {
        id: 10,
        name: 'Fonte Viva',
        distributor: 'Distribuidora XPTO',
        taxId: '12.345.678/0001-90',
        document: '12345678000190',
        phone: '(11) 99999-8888',
        email: 'contato@fonteviva.com',
        city: null,
        state: null,
        paymentDay: 15,
        bankName: 'Banco do Brasil',
        bankBranch: '1234',
        bankAccount: '98765-0',
        pixKey: 'pix@fonteviva.com',
        stores: [
          { id: 'store-1', city: 'São Paulo', state: 'SP' },
          { id: 'store-2', city: 'Campinas', state: 'SP' }
        ]
      }
    ])

    const app = createApp(prismaMock)

    const response = await request(app)
      .get('/api/partners/monthly-summary')
      .query({ month: '2024-04' })

    expect(response.status).toBe(200)
    expect(prismaMock.voucher.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          issuedAt: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        }
      })
    )

    expect(prismaMock.storePrice.findMany).toHaveBeenCalled()
    expect(prismaMock.partner.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [10] } } })
    )

    expect(response.body).toEqual(
      expect.objectContaining({
        month: '2024-04',
        currency: 'BRL',
        totals: expect.objectContaining({
          '20 LITROS_qtd': 3,
          '20 LITROS_val': 4500,
          'CX COPO_qtd': 1,
          'CX COPO_val': 0,
          TOTAL_qtd: 4,
          TOTAL_val: 4500
        }),
        filters: expect.objectContaining({
          states: expect.arrayContaining(['SP']),
          distributors: expect.arrayContaining(['Distribuidora XPTO'])
        })
      })
    )

    expect(response.body.rows).toHaveLength(1)
    const [row] = response.body.rows

    expect(row).toEqual(
      expect.objectContaining({
        partnerId: 10,
        PARCEIRO: 'Fonte Viva',
        CIDADE: 'São Paulo',
        ESTADO: 'SP',
        'DIA PAGTO.': 15,
        BANCO: 'Banco do Brasil',
        'AGÊNCIA E CONTA': '1234 / 98765-0',
        PIX: 'pix@fonteviva.com',
        '20 LITROS_qtd': 3,
        '20 LITROS_val': 4500,
        'CX COPO_qtd': 1,
        'CX COPO_val': 0,
        TOTAL_qtd: 4,
        TOTAL_val: 4500,
        hasMissingPrice: true
      })
    )

    expect(row.missingPriceProducts).toContain('CX COPO')
  })

  it('retorna lista vazia quando não há comprovantes no período', async () => {
    prismaMock.voucher.findMany.mockResolvedValue([])

    const app = createApp(prismaMock)

    const response = await request(app)
      .get('/api/partners/monthly-summary')
      .query({ month: '2024-05' })

    expect(response.status).toBe(200)
    expect(response.body.rows).toEqual([])
    expect(response.body.totals).toEqual(
      expect.objectContaining({
        '20 LITROS_qtd': 0,
        TOTAL_val: 0
      })
    )
    expect(prismaMock.storePrice.findMany).not.toHaveBeenCalled()
    expect(prismaMock.partner.findMany).not.toHaveBeenCalled()
  })
})
