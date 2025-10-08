import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

import { createReportsRouter } from '../../src/server/routes/reports'

type PrismaMock = {
  report: { findUnique: jest.Mock }
  partner: { findMany: jest.Mock; count: jest.Mock }
  $transaction: jest.Mock
}

const createPrismaMock = (): PrismaMock => ({
  report: { findUnique: jest.fn() },
  partner: { findMany: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
})

describe('GET /api/reports/:id/pending-partners', () => {
  let prismaMock: PrismaMock
  let app: express.Express

  beforeEach(() => {
    prismaMock = createPrismaMock()
    app = express()
    app.use('/api/reports', createReportsRouter({ prisma: prismaMock as unknown as PrismaClient }))
  })

  it('retorna parceiros sem vouchers válidos para o relatório informado', async () => {
    prismaMock.report.findUnique.mockResolvedValue({ id: 1 })

    const partners = [
      {
        id: 10,
        name: 'Parceiro Sem Voucher Válido',
        document: '12345678900',
        email: 'contato@parceiro.com',
        vouchers: [
          {
            id: 99,
            issuedAt: new Date('2024-01-05T10:00:00Z'),
            redeemedAt: new Date('2024-02-01T12:00:00Z')
          }
        ]
      }
    ]

    prismaMock.partner.findMany.mockResolvedValue(partners)
    prismaMock.partner.count.mockResolvedValue(1)

    const response = await request(app)
      .get('/api/reports/1/pending-partners')
      .query({ page: 1, pageSize: 10, search: 'Parceiro' })

    expect(response.status).toBe(200)
    expect(prismaMock.partner.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          vouchers: {
            none: {
              reportId: 1,
              redeemedAt: null
            }
          }
        }),
        skip: 0,
        take: 10
      })
    )
    expect(response.body).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            id: 10,
            name: 'Parceiro Sem Voucher Válido',
            reportVoucherStats: {
              total: 1,
              valid: 0,
              redeemed: 1,
              lastIssuedAt: '2024-01-05T10:00:00.000Z'
            }
          })
        ],
        pagination: expect.objectContaining({ total: 1, totalPages: 1 })
      })
    )
  })

  it('retorna 404 quando o relatório não existe', async () => {
    prismaMock.report.findUnique.mockResolvedValue(null)

    const response = await request(app).get('/api/reports/999/pending-partners')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Relatório não encontrado' })
    expect(prismaMock.partner.findMany).not.toHaveBeenCalled()
  })
})
