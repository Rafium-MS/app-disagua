import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPartnersRouter } from '../../src/server/routes/partners'

const createPrismaMock = () => {
  const partner = {
    findMany: vi.fn(),
    count: vi.fn()
  }

  return {
    partner,
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
  }
}

describe('GET /api/partners', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>

  beforeEach(() => {
    prismaMock = createPrismaMock()
  })

  it('retorna parceiros paginados com metadados', async () => {
    const partners = [
      {
        id: 1,
        name: 'Parceiro A',
        document: '123',
        email: 'a@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    prismaMock.partner.findMany.mockResolvedValue(partners)
    prismaMock.partner.count.mockResolvedValue(5)

    const app = express()
    app.use(
      '/api/partners',
      createPartnersRouter({ prisma: prismaMock as unknown as PrismaClient })
    )

    const response = await request(app).get('/api/partners').query({ page: 2, pageSize: 1 })

    expect(response.status).toBe(200)
    expect(prismaMock.partner.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        take: 1
      })
    )
    expect(response.body).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: partners[0].id,
            name: partners[0].name,
            document: partners[0].document,
            email: partners[0].email,
            createdAt: partners[0].createdAt.toISOString(),
            updatedAt: partners[0].updatedAt.toISOString()
          })
        ]),
        pagination: expect.objectContaining({
          page: 2,
          pageSize: 1,
          total: 5,
          totalPages: 5
        })
      })
    )
  })

  it('retorna erro 400 quando a paginação é inválida', async () => {
    const app = express()
    app.use(
      '/api/partners',
      createPartnersRouter({ prisma: prismaMock as unknown as PrismaClient })
    )

    const response = await request(app).get('/api/partners').query({ page: 0 })

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error', 'Parâmetros inválidos')
  })
})
