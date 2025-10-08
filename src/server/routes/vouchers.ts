import type { Prisma, PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma'

const vouchersQuerySchema = z
  .object({
    partnerId: z.coerce.number().int().positive().optional(),
    status: z.enum(['redeemed', 'pending']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10)
  })
  .strict()

const createVouchersRouter = ({ prisma: prismaClient }: { prisma: PrismaClient }) => {
  const vouchersRouter = Router()

  vouchersRouter.get('/', async (req, res) => {
    try {
      const { partnerId, status, page, pageSize } = vouchersQuerySchema.parse(req.query)

      const where: Prisma.VoucherWhereInput = {
        ...(typeof partnerId === 'number' ? { partnerId } : {}),
        ...(status === 'redeemed'
          ? { redeemedAt: { not: null } }
          : status === 'pending'
            ? { redeemedAt: null }
            : {})
      }

      const hasFilters = Object.keys(where).length > 0
      const skip = (page - 1) * pageSize

      const [vouchers, total] = await prismaClient.$transaction([
        prismaClient.voucher.findMany({
          where: hasFilters ? where : undefined,
          orderBy: { issuedAt: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            code: true,
            issuedAt: true,
            redeemedAt: true,
            partner: {
              select: {
                id: true,
                name: true
              }
            },
            report: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }),
        prismaClient.voucher.count({ where: hasFilters ? where : undefined })
      ])

      res.json({
        data: vouchers,
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

      console.error('Erro ao listar vouchers', error)
      res.status(500).json({ error: 'Não foi possível listar os vouchers' })
    }
  })

  return vouchersRouter
}

const vouchersRouter = createVouchersRouter({ prisma })

export { createVouchersRouter, vouchersRouter }

