import type { Prisma, PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma'
import { insensitiveContains } from '../utils/prisma-filters'

const auditLogsQuerySchema = z
  .object({
    entity: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional(),
    action: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional(),
    actor: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional(),
    from: z
      .string()
      .trim()
      .refine(value => !Number.isNaN(Date.parse(value)), 'Data inicial inválida')
      .optional(),
    to: z
      .string()
      .trim()
      .refine(value => !Number.isNaN(Date.parse(value)), 'Data final inválida')
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
  })
  .strict()

const createAuditLogsRouter = ({ prisma: prismaClient }: { prisma: PrismaClient }) => {
  const router = Router()

  router.get('/', async (req, res) => {
    const parsedQuery = auditLogsQuerySchema.safeParse(req.query)

    if (!parsedQuery.success) {
      res.status(400).json({
        error: 'Parâmetros inválidos',
        details: parsedQuery.error.flatten().fieldErrors
      })
      return
    }

    const { entity, action, actor, from, to, page, pageSize } = parsedQuery.data

    const where: Prisma.AuditLogWhereInput = {
      ...(entity ? { entity: insensitiveContains<'AuditLog'>(entity) } : {}),
      ...(action ? { action: insensitiveContains<'AuditLog'>(action) } : {}),
      ...(actor ? { actor: insensitiveContains<'AuditLog'>(actor) } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {})
            }
          }
        : {})
    }

    const skip = (page - 1) * pageSize

    try {
      const [logs, total] = await prismaClient.$transaction([
        prismaClient.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            createdAt: true,
            action: true,
            entity: true,
            entityId: true,
            actor: true,
            requestId: true,
            requestMethod: true,
            requestUrl: true,
            ipAddress: true,
            changes: true
          }
        }),
        prismaClient.auditLog.count({ where })
      ])

      res.json({
        data: logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
        }
      })
    } catch (error) {
      console.error('Erro ao consultar logs de auditoria', error)
      res.status(500).json({ error: 'Não foi possível carregar os logs de auditoria.' })
    }
  })

  return router
}

const auditLogsRouter = createAuditLogsRouter({ prisma })

export { createAuditLogsRouter, auditLogsRouter }
