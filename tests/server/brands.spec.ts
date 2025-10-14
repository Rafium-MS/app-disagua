import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createBrandsRouter } from '../../src/server/routes/brands'

const createPrismaMock = () => {
  const brand = {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  }

  return {
    brand,
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  }
}

describe('Brands router', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>
  let app: express.Express

  beforeEach(() => {
    prismaMock = createPrismaMock()
    app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      ;(req as any).user = { id: 'user', email: 'user@test', name: 'User', roles: ['ADMIN'] }
      next()
    })
    app.use('/api/brands', createBrandsRouter({ prisma: prismaMock as unknown as PrismaClient }))
  })

  it('lists brands with pagination and filters', async () => {
    const brands = [
      {
        id: 'bra_1',
        partnerId: 1,
        name: 'Marca A',
        code: 'A1',
        createdAt: new Date(),
        updatedAt: new Date(),
        partner: { id: 1, name: 'Parceiro 1' },
      },
    ]
    prismaMock.brand.findMany.mockResolvedValue(brands)
    prismaMock.brand.count.mockResolvedValue(1)

    const response = await request(app)
      .get('/api/brands')
      .query({ partnerId: '1', q: 'Marca', page: 2, size: 10 })

    expect(response.status).toBe(200)
    expect(prismaMock.brand.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ partnerId: 1 }),
        skip: 10,
        take: 10,
        include: {
          partner: {
            select: { id: true, name: true },
          },
        },
      }),
    )
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.pagination).toEqual(
      expect.objectContaining({ page: 2, size: 10, total: 1, totalPages: 1 }),
    )
  })

  it('creates a brand', async () => {
    prismaMock.brand.create.mockResolvedValue({
      id: 'bra_1',
      partnerId: 1,
      name: 'Nova Marca',
      code: 'NV',
      createdAt: new Date(),
      updatedAt: new Date(),
      partner: { id: 1, name: 'Parceiro 1' },
    })

    const response = await request(app).post('/api/brands').send({ partnerId: '1', name: 'Nova Marca', code: 'NV' })

    expect(response.status).toBe(201)
    expect(prismaMock.brand.create).toHaveBeenCalledWith({
      data: { partnerId: 1, name: 'Nova Marca', code: 'NV' },
      include: { partner: { select: { id: true, name: true } } },
    })
  })

  it('returns 409 when creating duplicate brand', async () => {
    prismaMock.brand.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '5.18.0',
        meta: { target: ['Brand_partnerId_name_key'] },
      }),
    )

    const response = await request(app).post('/api/brands').send({ partnerId: '1', name: 'Marca A' })

    expect(response.status).toBe(409)
    expect(response.body).toHaveProperty('error')
  })

  it('updates a brand', async () => {
    prismaMock.brand.update.mockResolvedValue({
      id: 'bra_1',
      partnerId: 1,
      name: 'Marca Editada',
      code: 'EDIT',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await request(app).patch('/api/brands/bra_1').send({ name: 'Marca Editada' })

    expect(response.status).toBe(200)
    expect(prismaMock.brand.update).toHaveBeenCalledWith({
      where: { id: 'bra_1' },
      data: { name: 'Marca Editada' },
    })
  })

  it('rejects update without fields', async () => {
    const response = await request(app).patch('/api/brands/bra_1').send({})

    expect(response.status).toBe(400)
    expect(prismaMock.brand.update).not.toHaveBeenCalled()
  })

  it('returns brand details', async () => {
    prismaMock.brand.findUnique.mockResolvedValue({
      id: 'bra_1',
      partnerId: 1,
      name: 'Marca A',
      code: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      partner: { id: 1, name: 'Parceiro 1' },
    })

    const response = await request(app).get('/api/brands/bra_1')

    expect(response.status).toBe(200)
    expect(prismaMock.brand.findUnique).toHaveBeenCalledWith({
      where: { id: 'bra_1' },
      include: { partner: { select: { id: true, name: true } } },
    })
  })

  it('deletes a brand', async () => {
    prismaMock.brand.delete.mockResolvedValue({ id: 'bra_1' })

    const response = await request(app).delete('/api/brands/bra_1')

    expect(response.status).toBe(204)
    expect(prismaMock.brand.delete).toHaveBeenCalledWith({ where: { id: 'bra_1' } })
  })
})
