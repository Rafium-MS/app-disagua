import type { Prisma, PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

import { registerPrismaAuditLogger } from '../../src/server/middleware/prisma-audit-logger'
import { runWithRequestContext, type RequestContext } from '../../src/server/context'

describe('prisma audit logger middleware', () => {
  let auditLogCreate: jest.Mock
  let useMiddleware: jest.Mock
  let prismaMock: PrismaClient

  beforeEach(() => {
    auditLogCreate = jest.fn().mockResolvedValue(undefined)
    useMiddleware = jest.fn()
    prismaMock = {
      auditLog: { create: auditLogCreate }
    } as unknown as PrismaClient
    ;(prismaMock as unknown as { $use: typeof useMiddleware }).$use = useMiddleware

    registerPrismaAuditLogger(prismaMock)
  })

  it('registra entradas de auditoria para operações de escrita', async () => {
    const middleware = useMiddleware.mock.calls[0][0] as Prisma.Middleware
    const params: Prisma.MiddlewareParams = {
      model: 'Partner',
      action: 'update',
      args: { data: { name: 'Atualizado' }, where: { id: 7 } }
    }
    const next = jest.fn().mockResolvedValue({ id: 7, name: 'Atualizado' })

    const context: RequestContext = {
      actor: 'usuario-1',
      requestId: 'req-123',
      method: 'PATCH',
      url: '/partners/7',
      ip: '127.0.0.1'
    }

    await runWithRequestContext(context, async () => {
      await middleware(params, next)
    })

    expect(next).toHaveBeenCalled()
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actor: 'usuario-1',
          action: 'update',
          entity: 'Partner',
          entityId: '7',
          requestMethod: 'PATCH',
          requestUrl: '/partners/7'
        })
      })
    )
  })

  it('não registra logs para consultas de leitura', async () => {
    const middleware = useMiddleware.mock.calls[0][0] as Prisma.Middleware
    const params: Prisma.MiddlewareParams = {
      model: 'Partner',
      action: 'findMany',
      args: {}
    }
    const next = jest.fn().mockResolvedValue([])

    await middleware(params, next)

    expect(next).toHaveBeenCalled()
    expect(auditLogCreate).not.toHaveBeenCalled()
  })
})
