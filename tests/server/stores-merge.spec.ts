import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createStoresRouter } from '../../src/server/routes/stores'

const createPrismaMock = () => {
  const store = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  }

  const storePrice = {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  }

  const voucher = {
    updateMany: vi.fn(),
  }

  const client = {
    store,
    storePrice,
    voucher,
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof client) => unknown)(client)
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg)
      }
      return null
    }),
  }

  return client
}

describe('Store deduplication and merge', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>
  let app: express.Express

  beforeEach(() => {
    prismaMock = createPrismaMock()
    app = express()
    app.use(express.json())
    app.use('/api/stores', createStoresRouter({ prisma: prismaMock as unknown as PrismaClient }))
  })

  it('detects potential duplicates by name/city and CNPJ', async () => {
    prismaMock.store.findMany.mockResolvedValue([
      {
        id: 'sto_1',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Centro',
        normalizedName: 'loja centro',
        city: 'São Paulo',
        mall: 'Iguatemi',
        cnpj: '12.345.678/0001-90',
        updatedAt: new Date('2024-01-01'),
        prices: [],
        brand: { id: 'bra_1', name: 'Marca' },
        partner: { id: 1, name: 'Parceiro' },
      },
      {
        id: 'sto_2',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Centro',
        normalizedName: 'loja centro',
        city: 'São Paulo',
        mall: 'Iguatemi',
        cnpj: '98.765.432/0001-10',
        updatedAt: new Date('2024-02-01'),
        prices: [],
        brand: { id: 'bra_1', name: 'Marca' },
        partner: { id: 1, name: 'Parceiro' },
      },
      {
        id: 'sto_3',
        partnerId: 1,
        brandId: 'bra_2',
        name: 'Loja Norte',
        normalizedName: 'loja norte',
        city: 'Rio de Janeiro',
        mall: null,
        cnpj: '12.345.678/0001-90',
        updatedAt: new Date('2024-03-01'),
        prices: [],
        brand: { id: 'bra_2', name: 'Marca B' },
        partner: { id: 1, name: 'Parceiro' },
      },
    ])

    const response = await request(app).post('/api/stores/detect-duplicates').send({ partnerId: 1 })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'NAME_CITY', stores: expect.any(Array) }),
        expect.objectContaining({ reason: 'CNPJ', stores: expect.any(Array) }),
      ]),
    )
  })

  it('merges stores moving vouchers and prices', async () => {
    prismaMock.store.findMany.mockResolvedValue([
      {
        id: 'sto_target',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Alvo',
        normalizedName: 'loja alvo',
        addressRaw: 'Rua A, 10',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01000000',
        status: 'ACTIVE',
        phone: null,
        email: null,
        mall: null,
        externalCode: 'EXT-1',
        cnpj: null,
        updatedAt: new Date('2024-01-01'),
        prices: [{ id: 'price1', storeId: 'sto_target', product: 'GALAO_20L', unitCents: 2000 }],
        vouchers: [],
        brand: { id: 'bra_1', name: 'Marca' },
        partner: { id: 1, name: 'Parceiro' },
      },
      {
        id: 'sto_source',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Fonte',
        normalizedName: 'loja fonte',
        addressRaw: 'Rua B, 20',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '02000000',
        status: 'INACTIVE',
        phone: '1199999-0000',
        email: 'contato@loja.com',
        mall: 'Shopping',
        externalCode: 'EXT-2',
        cnpj: '12.345.678/0001-90',
        updatedAt: new Date('2024-04-01'),
        prices: [
          { id: 'price2', storeId: 'sto_source', product: 'GALAO_10L', unitCents: 1500 },
          { id: 'price3', storeId: 'sto_source', product: 'PET_1500ML', unitCents: 500 },
        ],
        vouchers: [{ id: 1 }],
        brand: { id: 'bra_1', name: 'Marca' },
        partner: { id: 1, name: 'Parceiro' },
      },
    ])

    prismaMock.store.update.mockResolvedValue({})
    prismaMock.store.findUnique.mockResolvedValue({
      id: 'sto_target',
      partnerId: 1,
      brandId: 'bra_1',
      name: 'Loja Fonte',
      normalizedName: 'loja fonte',
      addressRaw: 'Rua B, 20',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '02000000',
      status: 'INACTIVE',
      phone: '1199999-0000',
      email: 'contato@loja.com',
      mall: 'Shopping',
      externalCode: 'EXT-2',
      cnpj: '12.345.678/0001-90',
      prices: [
        { id: 'priceT', storeId: 'sto_target', product: 'GALAO_20L', unitCents: 2000 },
        { id: 'priceNew', storeId: 'sto_target', product: 'GALAO_10L', unitCents: 1500 },
      ],
      brand: { id: 'bra_1', name: 'Marca' },
      partner: { id: 1, name: 'Parceiro' },
    })

    const response = await request(app)
      .post('/api/stores/merge')
      .send({ targetId: 'sto_target', sourceIds: ['sto_source'], fieldsStrategy: 'mostRecent' })

    expect(response.status).toBe(200)
    expect(prismaMock.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sto_target' },
        data: expect.objectContaining({
          name: 'Loja Fonte',
          normalizedName: 'loja fonte',
          mall: 'Shopping',
          phone: '1199999-0000',
        }),
      }),
    )
    expect(prismaMock.storePrice.deleteMany).toHaveBeenCalledWith({ where: { storeId: 'sto_target' } })
    expect(prismaMock.storePrice.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          { storeId: 'sto_target', product: 'GALAO_20L', unitCents: 2000 },
          { storeId: 'sto_target', product: 'GALAO_10L', unitCents: 1500 },
          { storeId: 'sto_target', product: 'PET_1500ML', unitCents: 500 },
        ]),
      }),
    )
    expect(prismaMock.voucher.updateMany).toHaveBeenCalledWith({
      where: { storeId: { in: ['sto_source'] } },
      data: { storeId: 'sto_target' },
    })
    expect(prismaMock.store.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['sto_source'] } } })
  })
})
