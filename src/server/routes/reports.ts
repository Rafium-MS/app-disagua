import type { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma'

const reportsQuerySchema = z
  .object({
    partnerId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10)
  })
  .strict()

const createReportsRouter = ({ prisma: prismaClient }: { prisma: PrismaClient }) => {
  const reportsRouter = Router()

  reportsRouter.get('/', async (req, res) => {
    try {
      const { partnerId, page, pageSize } = reportsQuerySchema.parse(req.query)

      const where = typeof partnerId === 'number' ? { partnerId } : undefined
      const skip = (page - 1) * pageSize

      const [reports, total] = await prismaClient.$transaction([
        prismaClient.report.findMany({
          where,
          orderBy: { issuedAt: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            title: true,
            summary: true,
            issuedAt: true,
            partner: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prismaClient.report.count({ where })
      ])

      res.json({
        data: reports,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Parâmetros inválidos',
          details: error.flatten().fieldErrors
        })
        return
      }

      console.error('Erro ao listar relatórios', error)
      res.status(500).json({ error: 'Não foi possível listar os relatórios' })
    }
  })

  return reportsRouter
}

const reportsRouter = createReportsRouter({ prisma })

export { createReportsRouter, reportsRouter }

