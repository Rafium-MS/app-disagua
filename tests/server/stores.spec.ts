import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createStoresRouter } from '../../src/server/routes/stores'

type MockStore = {
  create: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
}

type MockBrand = {
  findFirst: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}

type MockStorePrice = {
  deleteMany: ReturnType<typeof vi.fn>
  createMany: ReturnType<typeof vi.fn>
}

const createPrismaMock = () => {
  const store: MockStore = {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  }

  const brand: MockBrand = {
    findFirst: vi.fn(),
    create: vi.fn(),
  }

  const storePrice: MockStorePrice = {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  }

  const client = {
    store,
    brand,
    storePrice,
    $transaction: vi.fn(async (operations: unknown) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations)
      }
      if (typeof operations === 'function') {
        return (operations as (tx: typeof client) => unknown)(client)
      }
      return null
    }),
  }

  return client
}

describe('Stores router', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>
  let app: express.Express

  beforeEach(() => {
    prismaMock = createPrismaMock()
    app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      ;(req as any).user = { id: 'user', email: 'user@test', name: 'User', roles: ['ADMIN', 'SUPERVISOR'] }
      next()
    })
    app.use('/api/stores', createStoresRouter({ prisma: prismaMock as unknown as PrismaClient }))
  })

  it('lists stores with filters', async () => {
    prismaMock.store.findMany.mockResolvedValue([
      {
        id: 'sto_1',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Centro',
        normalizedName: 'loja centro',
        deliveryPlace: 'Rua A, 100',
        city: 'São Paulo',
        state: 'SP',
        mall: null,
        status: 'ACTIVE',
        prices: [],
        brand: { id: 'bra_1', name: 'Marca', code: null },
        partner: { id: 1, name: 'Parceiro' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
    prismaMock.store.count.mockResolvedValue(1)

    const response = await request(app)
      .get('/api/stores')
      .query({ brandId: 'bra_1', city: 'São Paulo', status: 'ACTIVE', page: 2, size: 5 })

    expect(response.status).toBe(200)
    expect(prismaMock.store.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ brandId: 'bra_1' }),
        take: 5,
        skip: 5,
        include: expect.any(Object),
      }),
    )
    expect(response.body).toHaveProperty('data')
  })

  it('creates a store and stores prices in centavos', async () => {
    prismaMock.store.create.mockResolvedValue({ id: 'sto_1', partnerId: 1, brandId: 'bra_1' })
    prismaMock.store.findUnique.mockResolvedValue({
      id: 'sto_1',
      partnerId: 1,
      brandId: 'bra_1',
      name: 'Loja Centro',
      normalizedName: 'loja centro',
      deliveryPlace: 'Rua A',
      city: 'São Paulo',
      state: 'SP',
      mall: null,
      status: 'ACTIVE',
      prices: [],
      brand: { id: 'bra_1', name: 'Marca', code: null },
      partner: { id: 1, name: 'Parceiro' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await request(app).post('/api/stores').send({
      partnerId: '1',
      brandId: 'bra_1',
      name: 'Loja Centro',
      deliveryPlace: 'Rua A',
      addressRaw: 'Rua A, 100 - Centro',
      prices: [
        { product: 'GALAO_20L', unitValueBRL: 'R$ 25,50' },
        { product: 'GALAO_10L', unitValueBRL: 'R$ 12,00' },
      ],
    })

    expect(response.status).toBe(201)
    expect(prismaMock.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partnerId: 1,
          brandId: 'bra_1',
          normalizedName: 'loja centro',
        }),
      }),
    )
    expect(prismaMock.storePrice.createMany).toHaveBeenCalledWith({
      data: [
        { product: 'GALAO_20L', unitCents: 2550, storeId: 'sto_1' },
        { product: 'GALAO_10L', unitCents: 1200, storeId: 'sto_1' },
      ],
      skipDuplicates: true,
    })
    expect(prismaMock.storePrice.deleteMany).toHaveBeenCalledWith({ where: { storeId: 'sto_1' } })
  })

  it('rejects creation without delivery place', async () => {
    const response = await request(app).post('/api/stores').send({ partnerId: '1', brandId: 'bra_1', name: 'Loja' })
    expect(response.status).toBe(400)
    expect(prismaMock.store.create).not.toHaveBeenCalled()
  })

  it('returns 409 with contextual message on unique violation', async () => {
    prismaMock.store.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique', {
        code: 'P2002',
        clientVersion: '5.18.0',
        meta: { target: 'Store_brandId_normalizedName_city_mall_key' },
      }),
    )

    const response = await request(app).post('/api/stores').send({
      partnerId: '1',
      brandId: 'bra_1',
      name: 'Loja Centro',
      deliveryPlace: 'Rua A',
    })

    expect(response.status).toBe(409)
    expect(response.body.error).toMatch(/já existe loja/i)
  })

  it('updates store and replaces prices', async () => {
    prismaMock.store.update.mockResolvedValue({ id: 'sto_1' })
    prismaMock.store.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'sto_1',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Centro',
        normalizedName: 'loja centro',
        deliveryPlace: 'Rua A',
        city: 'São Paulo',
        state: 'SP',
        mall: null,
        status: 'ACTIVE',
        prices: [],
        brand: { id: 'bra_1', name: 'Marca', code: null },
        partner: { id: 1, name: 'Parceiro' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    const response = await request(app).patch('/api/stores/sto_1').send({
      partnerId: '1',
      brandId: 'bra_1',
      name: 'Loja Atualizada',
      deliveryPlace: 'Rua Nova',
      prices: [{ product: 'GALAO_20L', unitValueBRL: 'R$ 30,00' }],
    })

    expect(response.status).toBe(200)
    expect(prismaMock.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sto_1' },
        data: expect.objectContaining({
          name: 'Loja Atualizada',
          normalizedName: 'loja atualizada',
          deliveryPlace: 'Rua Nova',
        }),
      }),
    )
    expect(prismaMock.storePrice.deleteMany).toHaveBeenCalledWith({ where: { storeId: 'sto_1' } })
    expect(prismaMock.storePrice.createMany).toHaveBeenCalled()
  })

  it('returns store details by id', async () => {
    prismaMock.store.findUnique.mockResolvedValue({
      id: 'sto_1',
      partnerId: 1,
      brandId: 'bra_1',
      name: 'Loja Centro',
      normalizedName: 'loja centro',
      deliveryPlace: 'Rua A',
      city: 'São Paulo',
      state: 'SP',
      status: 'ACTIVE',
      prices: [],
      brand: { id: 'bra_1', name: 'Marca', code: null },
      partner: { id: 1, name: 'Parceiro' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await request(app).get('/api/stores/sto_1')
    expect(response.status).toBe(200)
    expect(prismaMock.store.findUnique).toHaveBeenCalledWith({ where: { id: 'sto_1' }, include: expect.any(Object) })
  })

})
