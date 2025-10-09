import type { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma'
import { insensitiveContains } from '../utils/prisma-filters'

const partnersQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .transform((value) => value || undefined)
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10)
  })
  .strict()

const createPartnersRouter = ({ prisma: prismaClient }: { prisma: PrismaClient }) => {
  const partnersRouter = Router()

  partnersRouter.get('/', async (req, res) => {
    try {
      const { search, page, pageSize } = partnersQuerySchema.parse(req.query)

      const where = search
        ? {
            OR: [
              { name: insensitiveContains<'Partner'>(search) },
              { document: { contains: search } },
              { email: insensitiveContains<'Partner'>(search) }
            ]
          }
        : undefined

      const skip = (page - 1) * pageSize

      const [partners, total] = await prismaClient.$transaction([
        prismaClient.partner.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            name: true,
            document: true,
            email: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prismaClient.partner.count({ where })
      ])

      res.json({
        data: partners,
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

      console.error('Erro ao listar parceiros', error)
      res.status(500).json({ error: 'Não foi possível listar os parceiros' })
    }
  })

  return partnersRouter
}

const partnersRouter = createPartnersRouter({ prisma })

export { createPartnersRouter, partnersRouter }
