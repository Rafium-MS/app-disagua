import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'

import { createStoresRouter } from '../../src/server/routes/stores'

const createPrismaMock = () => {
  const store = {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const brand = {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  }

  const storePrice = {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  }

  const partner = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  }

  const voucher = {
    updateMany: vi.fn(),
  }

  const client = {
    store,
    brand,
    storePrice,
    partner,
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

describe('Stores router', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>
  let app: express.Express

  beforeEach(() => {
    prismaMock = createPrismaMock()
    app = express()
    app.use(express.json())
    app.use('/api/stores', createStoresRouter({ prisma: prismaMock as unknown as PrismaClient }))
  })

  it('creates a store with prices and brand', async () => {
    prismaMock.brand.upsert.mockResolvedValue({ id: 'bra_1', partnerId: 1, name: 'Marca Nova', code: null })
    prismaMock.store.create.mockResolvedValue({
      id: 'sto_1',
      partnerId: 1,
      brandId: 'bra_1',
      name: 'Loja Iguatemi',
      normalizedName: 'loja iguatemi',
      city: 'São Paulo',
      state: 'SP',
      status: 'ACTIVE',
      prices: [{ id: 'price_1', product: 'GALAO_20L', unitCents: 2200 }],
      brand: { id: 'bra_1', name: 'Marca Nova', code: null },
      partner: { id: 1, name: 'Parceiro' },
    })

    const payload = {
      partnerId: 1,
      createBrand: { name: 'Marca Nova' },
      name: 'Loja Iguatemi',
      addressRaw: 'Rua Faria Lima, 123',
      city: 'São Paulo',
      state: 'sp',
      postalCode: '01489000',
      prices: [
        { product: 'GALAO_20L', unitValueBRL: 'R$ 22,00' },
        { product: 'PET_1500ML', unitValueBRL: '' },
      ],
      status: 'ACTIVE',
    }

    const response = await request(app).post('/api/stores').send(payload)

    expect(response.status).toBe(201)
    expect(prismaMock.brand.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          partnerId_name: {
            partnerId: 1,
            name: 'Marca Nova',
          },
        },
      }),
    )
    expect(prismaMock.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partnerId: 1,
          brandId: 'bra_1',
          normalizedName: 'loja iguatemi',
          state: 'SP',
          prices: { create: [{ product: 'GALAO_20L', unitCents: 2200 }] },
        }),
      }),
    )
  })

  it('loads a store by id with relations', async () => {
    prismaMock.store.findUnique.mockResolvedValue({
      id: 'sto_1',
      partnerId: 1,
      brandId: 'bra_1',
      name: 'Loja Centro',
      normalizedName: 'loja centro',
      city: 'São Paulo',
      state: 'SP',
      status: 'ACTIVE',
      prices: [],
      brand: { id: 'bra_1', name: 'Marca', code: null },
      partner: { id: 1, name: 'Parceiro' },
    })

    const response = await request(app).get('/api/stores/sto_1')

    expect(response.status).toBe(200)
    expect(prismaMock.store.findUnique).toHaveBeenCalledWith({
      where: { id: 'sto_1' },
      include: {
        prices: true,
        brand: { select: { id: true, name: true, code: true } },
        partner: { select: { id: true, name: true } },
      },
    })
  })

  it('updates a store replacing prices', async () => {
    prismaMock.brand.findUnique.mockResolvedValue({ id: 'bra_1', partnerId: 1, name: 'Marca Nova', code: null })
    prismaMock.store.findUnique
      .mockResolvedValueOnce({
        id: 'sto_1',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Antiga',
        addressRaw: 'Rua antiga, 1',
        city: 'São Paulo',
        state: 'SP',
        postalCode: null,
      })
      .mockResolvedValueOnce({
        id: 'sto_1',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Atualizada',
        normalizedName: 'loja atualizada',
        addressRaw: 'Rua atual, 1',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01000000',
        status: 'ACTIVE',
        prices: [
          { id: 'price_1', storeId: 'sto_1', product: 'GALAO_10L', unitCents: 1500 },
        ],
        brand: { id: 'bra_1', name: 'Marca Nova', code: null },
        partner: { id: 1, name: 'Parceiro' },
      })

    prismaMock.store.update.mockResolvedValue({})

    const response = await request(app)
      .patch('/api/stores/sto_1')
      .send({
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Atualizada',
        addressRaw: 'Rua atual, 1',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01000000',
        prices: [{ product: 'GALAO_10L', unitValueBRL: '15,00' }],
        status: 'ACTIVE',
      })

    expect(response.status).toBe(200)
    expect(prismaMock.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sto_1' },
        data: expect.objectContaining({
          name: 'Loja Atualizada',
          normalizedName: 'loja atualizada',
        }),
      }),
    )
    expect(prismaMock.storePrice.deleteMany).toHaveBeenCalledWith({ where: { storeId: 'sto_1' } })
    expect(prismaMock.storePrice.createMany).toHaveBeenCalledWith({
      data: [{ storeId: 'sto_1', product: 'GALAO_10L', unitCents: 1500 }],
    })
  })

  it('returns 409 when create violates unique constraint', async () => {
    prismaMock.brand.upsert.mockResolvedValue({ id: 'bra_1', partnerId: 1, name: 'Marca', code: null })
    prismaMock.store.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '5.18.0',
        meta: { target: ['Store_partnerId_brandId_normalizedName_city_mall_key'] },
      }),
    )

    const response = await request(app)
      .post('/api/stores')
      .send({
        partnerId: 1,
        name: 'Duplicada',
        addressRaw: 'Rua 1',
        city: 'São Paulo',
        state: 'SP',
        prices: [],
        status: 'ACTIVE',
      })

    expect(response.status).toBe(409)
    expect(response.body).toHaveProperty('error')
  })

  it('filters stores on GET', async () => {
    prismaMock.store.findMany.mockResolvedValue([
      {
        id: 'sto_1',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Filtro',
        normalizedName: 'loja filtro',
        city: 'São Paulo',
        state: 'SP',
        status: 'ACTIVE',
        prices: [],
        brand: { id: 'bra_1', name: 'Marca', code: null },
        partner: { id: 1, name: 'Parceiro' },
      },
    ])
    prismaMock.store.count.mockResolvedValue(1)

    const response = await request(app)
      .get('/api/stores')
      .query({ partnerId: 1, brandId: 'bra_1', q: 'Filtro', city: 'São', state: 'SP', mall: 'Shop', status: 'ACTIVE' })

    expect(response.status).toBe(200)
    expect(prismaMock.store.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          partnerId: 1,
          brandId: 'bra_1',
          status: 'ACTIVE',
        }),
      }),
    )
  })

  it('imports stores from XLSX creating, updating and skipping rows', async () => {
    prismaMock.partner.findUnique
      .mockResolvedValueOnce({ id: 1, name: 'Parceiro 1' })
      .mockResolvedValueOnce({ id: 1, name: 'Parceiro 1' })
      .mockResolvedValueOnce(null)

    prismaMock.partner.findFirst.mockResolvedValue(null)

    prismaMock.brand.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'bra_1', partnerId: 1, name: 'Marca Nova', code: null })

    prismaMock.brand.create.mockResolvedValue({ id: 'bra_1', partnerId: 1, name: 'Marca Nova', code: null })

    prismaMock.store.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'sto_exist',
        partnerId: 1,
        brandId: 'bra_1',
        name: 'Loja Centro',
        addressRaw: 'Rua A, 100',
        city: 'São Paulo',
        state: 'SP',
        postalCode: null,
        complement: null,
        number: null,
        district: null,
      })

    prismaMock.store.create.mockResolvedValue({ id: 'sto_new' })
    prismaMock.store.update.mockResolvedValue({})

    const rows = [
      {
        Parceiro: '1',
        Marca: 'Marca Nova',
        Nome: 'Loja Centro',
        Cidade: 'São Paulo',
        UF: 'SP',
        Endereco: 'Rua A, 100',
        Shopping: 'Iguatemi',
        Externo: 'EXT-1',
        Valor20: '25,00',
      },
      {
        Parceiro: '1',
        Marca: 'Marca Nova',
        Nome: 'Loja Centro',
        Cidade: 'São Paulo',
        UF: 'SP',
        Endereco: 'Rua A, 100',
        Shopping: 'Iguatemi',
        Externo: 'EXT-1',
        Valor20: '26,00',
      },
      {
        Parceiro: '999',
        Nome: 'Sem Parceiro',
        Cidade: 'Rio de Janeiro',
        UF: 'RJ',
        Endereco: 'Rua B, 200',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lojas')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const response = await request(app)
      .post('/api/stores/import')
      .attach('file', buffer, 'stores.xlsx')
      .field(
        'mapping',
        JSON.stringify({
          colPartner: 'Parceiro',
          colBrand: 'Marca',
          colStoreName: 'Nome',
          colCity: 'Cidade',
          colState: 'UF',
          colAddress: 'Endereco',
          colMall: 'Shopping',
          colExternalCode: 'Externo',
          colValue20L: 'Valor20',
        }),
      )
      .field('allowCreateBrand', 'true')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({ created: 1, updated: 1, skipped: 1, conflicts: expect.any(Array) }),
    )
    expect(prismaMock.store.create).toHaveBeenCalled()
    expect(prismaMock.store.update).toHaveBeenCalled()
  })
})
