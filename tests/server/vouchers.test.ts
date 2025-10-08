import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

import { createVouchersRouter } from '../../src/server/routes/vouchers'

const createPrismaMock = () => {
  const voucher = {
    findMany: jest.fn(),
    count: jest.fn()
  }

  return {
    voucher,
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
  }
}

describe('GET /api/vouchers', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>

  beforeEach(() => {
    prismaMock = createPrismaMock()
  })

  it('filtra vouchers por parceiro e status', async () => {
    const vouchers = [
      {
        id: 1,
        code: 'ABC123',
        issuedAt: new Date(),
        redeemedAt: null,
        partner: { id: 10, name: 'Parceiro' },
        report: { id: 5, title: 'Relatório' }
      }
    ]

    prismaMock.voucher.findMany.mockResolvedValue(vouchers)
    prismaMock.voucher.count.mockResolvedValue(1)

    const app = express()
    app.use('/api/vouchers', createVouchersRouter({ prisma: prismaMock as unknown as PrismaClient }))

    const response = await request(app)
      .get('/api/vouchers')
      .query({ partnerId: 10, status: 'pending', page: 1, pageSize: 5 })

    expect(response.status).toBe(200)
    expect(prismaMock.voucher.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { partnerId: 10, redeemedAt: null }
      })
    )
    expect(response.body).toEqual(
      expect.objectContaining({
        data: vouchers,
        pagination: expect.objectContaining({ total: 1, totalPages: 1 })
      })
    )
  })

  it('retorna erro 400 para status inválido', async () => {
    const app = express()
    app.use('/api/vouchers', createVouchersRouter({ prisma: prismaMock as unknown as PrismaClient }))

    const response = await request(app).get('/api/vouchers').query({ status: 'invalid' })

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error', 'Parâmetros inválidos')
  })
})

