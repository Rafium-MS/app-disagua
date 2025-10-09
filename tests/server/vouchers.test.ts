import { Prisma, type PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createVouchersRouter } from '../../src/server/routes/vouchers'

const createPrismaMock = () => {
  const voucher = {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn()
  }

  return {
    voucher,
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
  }
}

const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads')

const createApp = (prismaMock: PrismaClient) => {
  const app = express()
  app.use('/api/vouchers', createVouchersRouter({ prisma: prismaMock }))
  return app
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
        data: expect.arrayContaining([
          expect.objectContaining({
            id: vouchers[0].id,
            code: vouchers[0].code,
            issuedAt: vouchers[0].issuedAt.toISOString(),
            redeemedAt: vouchers[0].redeemedAt,
            partner: vouchers[0].partner,
            report: vouchers[0].report
          })
        ]),
        pagination: expect.objectContaining({ total: 1, totalPages: 1 })
      })
    )
  })

  it('filtra vouchers por relatório', async () => {
    const vouchers = [
      {
        id: 2,
        code: 'REL456',
        issuedAt: new Date(),
        redeemedAt: null,
        partner: { id: 4, name: 'Parceiro 4' },
        report: { id: 8, title: 'Relatório Especial' }
      }
    ]

    prismaMock.voucher.findMany.mockResolvedValue(vouchers)
    prismaMock.voucher.count.mockResolvedValue(1)

    const app = express()
    app.use('/api/vouchers', createVouchersRouter({ prisma: prismaMock as unknown as PrismaClient }))

    const response = await request(app)
      .get('/api/vouchers')
      .query({ reportId: 8, page: 1, pageSize: 5 })

    expect(response.status).toBe(200)
    expect(prismaMock.voucher.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reportId: 8 }
      })
    )
    expect(response.body).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: vouchers[0].id,
            code: vouchers[0].code,
            issuedAt: vouchers[0].issuedAt.toISOString(),
            redeemedAt: vouchers[0].redeemedAt,
            partner: vouchers[0].partner,
            report: vouchers[0].report
          })
        ]),
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

describe('POST /api/vouchers/:id/upload', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>

  beforeEach(() => {
    prismaMock = createPrismaMock()
    fs.mkdirSync(uploadsDir, { recursive: true })
  })

  afterEach(() => {
    if (!fs.existsSync(uploadsDir)) {
      return
    }

    for (const entry of fs.readdirSync(uploadsDir)) {
      if (entry === '.gitignore') {
        continue
      }

      fs.rmSync(path.join(uploadsDir, entry), { recursive: true, force: true })
    }
  })

  it('salva o arquivo e atualiza o caminho do voucher', async () => {
    prismaMock.voucher.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      filePath: data.filePath
    }))

    const app = createApp(prismaMock as unknown as PrismaClient)

    const response = await request(app)
      .post('/api/vouchers/1/upload')
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'comprovante.pdf',
        contentType: 'application/pdf'
      })

    expect(response.status).toBe(200)
    expect(prismaMock.voucher.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { filePath: expect.stringMatching(/^data\/uploads\//) }
      })
    )
    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'Upload realizado com sucesso',
        voucher: {
          id: 1,
          filePath: expect.stringMatching(/^data\/uploads\//)
        }
      })
    )
  })

  it('retorna erro amigável quando o tipo de arquivo é inválido', async () => {
    const app = createApp(prismaMock as unknown as PrismaClient)

    const response = await request(app)
      .post('/api/vouchers/1/upload')
      .attach('file', Buffer.from('texto'), {
        filename: 'arquivo.txt',
        contentType: 'text/plain'
      })

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty(
      'error',
      'Tipo de arquivo não suportado. Envie apenas PDF, JPG ou PNG.'
    )
    expect(prismaMock.voucher.update).not.toHaveBeenCalled()
  })

  it('retorna 404 quando o voucher não existe', async () => {
    prismaMock.voucher.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('No record found', {
        code: 'P2025',
        clientVersion: '5.18.0'
      })
    )

    const app = createApp(prismaMock as unknown as PrismaClient)

    const response = await request(app)
      .post('/api/vouchers/99/upload')
      .attach('file', Buffer.from('data'), {
        filename: 'imagem.png',
        contentType: 'image/png'
      })

    expect(response.status).toBe(404)
    expect(response.body).toHaveProperty('error', 'Voucher não encontrado.')
  })
})

