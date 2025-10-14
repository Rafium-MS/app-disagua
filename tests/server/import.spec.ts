import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'

import { createStoresRouter } from '../../src/server/routes/stores'

type MockClient = {
  store: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  brand: {
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  storePrice: {
    deleteMany: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

const createPrismaMock = (): MockClient => {
  const client: MockClient = {
    store: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    brand: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    storePrice: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (operations: unknown) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations)
      }
      if (typeof operations === 'function') {
        return (operations as (tx: MockClient) => unknown)(client)
      }
      return null
    }),
  }

  return client
}

describe('Store import', () => {
  let prismaMock: MockClient
  let app: express.Express

  beforeEach(() => {
    prismaMock = createPrismaMock()
    app = express()
    app.use((req, _res, next) => {
      ;(req as any).user = { id: 'user', email: 'user@test', name: 'User', roles: ['SUPERVISOR'] }
      next()
    })
    app.use('/api/stores', createStoresRouter({ prisma: prismaMock as unknown as PrismaClient }))
  })

  it('imports rows creating, updating and skipping stores', async () => {
    const rows = [
      { Parceiro: '1', Marca: 'Marca A', Loja: 'Loja Nova', 'Local Entrega': 'Rua A', Cidade: 'São Paulo', UF: 'SP' },
      { Parceiro: '1', Marca: 'Marca A', Loja: 'Loja Existente', 'Local Entrega': 'Rua B', Cidade: 'São Paulo', UF: 'SP' },
      { Parceiro: '', Marca: 'Marca A', Loja: 'Ignorar', 'Local Entrega': '' },
    ]
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilha')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    prismaMock.brand.findFirst.mockResolvedValueOnce({ id: 'bra_1', partnerId: 1, name: 'Marca A' })
    prismaMock.brand.findFirst.mockResolvedValueOnce({ id: 'bra_1', partnerId: 1, name: 'Marca A' })
    prismaMock.store.findFirst.mockResolvedValueOnce(null)
    prismaMock.store.findFirst.mockResolvedValueOnce({
      id: 'sto_existing',
      brandId: 'bra_1',
      normalizedName: 'loja existente',
      city: 'São Paulo',
      mall: null,
    })
    prismaMock.store.create.mockResolvedValue({ id: 'sto_new' })

    const response = await request(app)
      .post('/api/stores/import')
      .set('Content-Type', 'multipart/form-data')
      .attach('file', buffer, 'lojas.xlsx')
      .field(
        'mapping',
        JSON.stringify({
          mapping: {
            colPartner: 'Parceiro',
            colBrand: 'Marca',
            colStoreName: 'Loja',
            colDeliveryPlace: 'Local Entrega',
            colCity: 'Cidade',
            colState: 'UF',
          },
          allowCreateBrand: false,
        }),
      )

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        created: 1,
        updated: 1,
        skipped: 1,
      }),
    )
    expect(prismaMock.store.create).toHaveBeenCalled()
    expect(prismaMock.store.update).toHaveBeenCalled()
  })
})
