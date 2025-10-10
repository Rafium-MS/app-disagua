import type { Prisma, PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma'
import { brandSchema, brandUpdateSchema } from '../schemas/store'

const listSchema = z
  .object({
    partnerId: z.coerce.number().int().positive().optional(),
    q: z
      .string()
      .trim()
      .transform((value) => (value.length ? value : undefined))
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

const createBrandsRouter = ({ prisma }: { prisma: PrismaClient }) => {
  const router = Router()

  router.get('/', async (req, res) => {
    try {
      const { partnerId, q, page, pageSize } = listSchema.parse(req.query)

      const where = {
        ...(partnerId ? { partnerId } : {}),
        ...(q
          ? {
              name: {
                contains: q,
                mode: 'insensitive',
              } as Prisma.StringFilter,
            }
          : {}),
      }

      const skip = (page - 1) * pageSize
      const [items, total] = await prisma.$transaction([
        prisma.brand.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take: pageSize,
        }),
        prisma.brand.count({ where }),
      ])

      res.json({
        data: items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Parâmetros inválidos',
          details: error.flatten().fieldErrors,
        })
        return
      }

      console.error('Erro ao listar marcas', error)
      res.status(500).json({ error: 'Não foi possível carregar as marcas' })
    }
  })

  router.post('/', async (req, res) => {
    try {
      const payload = brandSchema.parse(req.body)

      const created = await prisma.brand.create({ data: payload })

      res.status(201).json(created)
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: error.flatten().fieldErrors,
        })
        return
      }

      if (isUniqueViolation(error)) {
        res.status(409).json({
          error: 'Já existe uma marca com este nome ou código para o parceiro informado',
        })
        return
      }

      console.error('Erro ao criar marca', error)
      res.status(500).json({ error: 'Não foi possível criar a marca' })
    }
  })

  router.patch('/:id', async (req, res) => {
    try {
      const payload = brandUpdateSchema.parse(req.body)
      const { id } = req.params

      if (Object.keys(payload).length === 0) {
        res.status(400).json({ error: 'Informe ao menos um campo para atualização' })
        return
      }

      const updated = await prisma.brand.update({
        where: { id },
        data: payload,
      })

      res.json(updated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: error.flatten().fieldErrors,
        })
        return
      }

      if (isNotFound(error)) {
        res.status(404).json({ error: 'Marca não encontrada' })
        return
      }

      if (isUniqueViolation(error)) {
        res.status(409).json({
          error: 'Já existe uma marca com este nome ou código para o parceiro informado',
        })
        return
      }

      console.error('Erro ao atualizar marca', error)
      res.status(500).json({ error: 'Não foi possível atualizar a marca' })
    }
  })

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params

      await prisma.brand.delete({ where: { id } })

      res.status(204).end()
    } catch (error) {
      if (isNotFound(error)) {
        res.status(404).json({ error: 'Marca não encontrada' })
        return
      }

      console.error('Erro ao remover marca', error)
      res.status(500).json({ error: 'Não foi possível remover a marca' })
    }
  })

  return router
}

const P2002 = 'P2002'
const P2025 = 'P2025'

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === P2002
}

function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === P2025
}

const brandsRouter = createBrandsRouter({ prisma })

export { createBrandsRouter, brandsRouter }
