import type { Prisma, PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { registerPrismaAuditLogger } from '../../src/server/middleware/prisma-audit-logger'
import { runWithRequestContext, type RequestContext } from '../../src/server/context'

describe('prisma audit logger middleware', () => {
  let auditLogCreate: Mock
  let useMiddleware: Mock
  let prismaMock: PrismaClient

  beforeEach(() => {
    auditLogCreate = vi.fn().mockResolvedValue(undefined)
    useMiddleware = vi.fn()
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
    const next = vi.fn().mockResolvedValue({ id: 7, name: 'Atualizado' })

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

  it.each([
    ['createMany', { count: 2 }],
    ['updateMany', { count: 3 }],
    ['deleteMany', { count: 1 }]
  ] as Array<[Prisma.MiddlewareParams['action'], unknown]>)(
    'gera log para operações em lote %s',
    async (action, result) => {
      const middleware = useMiddleware.mock.calls[0][0] as Prisma.Middleware
      const params: Prisma.MiddlewareParams = {
        model: 'Voucher',
        action,
        args: { data: { redeemedAt: new Date() } }
      }
      const next = vi.fn().mockResolvedValue(result)

      await middleware(params, next)

      expect(next).toHaveBeenCalled()
      expect(auditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action,
            entity: 'Voucher'
          })
        })
      )
      auditLogCreate.mockClear()
    }
  )

  it('não registra logs para consultas de leitura', async () => {
    const middleware = useMiddleware.mock.calls[0][0] as Prisma.Middleware
    const params: Prisma.MiddlewareParams = {
      model: 'Partner',
      action: 'findMany',
      args: {}
    }
    const next = vi.fn().mockResolvedValue([])

    await middleware(params, next)

    expect(next).toHaveBeenCalled()
    expect(auditLogCreate).not.toHaveBeenCalled()
  })
})
