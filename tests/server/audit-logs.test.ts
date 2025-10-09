import type { PrismaClient } from '@prisma/client'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAuditLogsRouter } from '../../src/server/routes/audit-logs'

const createPrismaMock = () => {
  const auditLog = {
    findMany: vi.fn(),
    count: vi.fn()
  }

  return {
    auditLog,
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations))
  }
}

describe('GET /api/audit-logs', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>

  beforeEach(() => {
    prismaMock = createPrismaMock()
  })

  it('retorna logs com filtros aplicados', async () => {
    const logs = [
      {
        id: 1,
        createdAt: new Date(),
        action: 'update',
        entity: 'Partner',
        entityId: '1',
        actor: 'user-1',
        requestId: 'req-1',
        requestMethod: 'PATCH',
        requestUrl: '/partners/1',
        ipAddress: '127.0.0.1',
        changes: JSON.stringify({ action: 'update' })
      }
    ]

    prismaMock.auditLog.findMany.mockResolvedValue(logs)
    prismaMock.auditLog.count.mockResolvedValue(1)

    const app = express()
    app.use(
      '/api/audit-logs',
      createAuditLogsRouter({ prisma: prismaMock as unknown as PrismaClient })
    )

    const response = await request(app)
      .get('/api/audit-logs')
      .query({ entity: 'Partner', pageSize: 5 })

    expect(response.status).toBe(200)
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entity: expect.objectContaining({ contains: 'Partner', mode: 'insensitive' })
        }),
        take: 5
      })
    )
    expect(response.body).toEqual(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ entity: 'Partner' })]),
        pagination: expect.objectContaining({ total: 1, pageSize: 5 })
      })
    )
  })

  it('retorna erro 400 quando filtros são inválidos', async () => {
    const app = express()
    app.use(
      '/api/audit-logs',
      createAuditLogsRouter({ prisma: prismaMock as unknown as PrismaClient })
    )

    const response = await request(app).get('/api/audit-logs').query({ from: 'data-invalida' })

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error', 'Parâmetros inválidos')
  })
})
