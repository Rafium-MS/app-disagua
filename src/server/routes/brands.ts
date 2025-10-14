import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

import { requireRole } from '../middleware/auth/require-role'
import { prisma } from '../prisma'
import { brandSchema } from '../schemas/store'

const listSchema = z
  .object({
    partnerId: z.string().trim().optional(),
    q: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length ? value : undefined)),
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

const P2002 = 'P2002'
const P2025 = 'P2025'

function parsePartnerId(partnerId: string): number {
  const parsed = Number(partnerId)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Identificador de parceiro inválido')
  }
  return parsed
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === P2002
}

function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === P2025
}

const createBrandsRouter = ({ prisma }: { prisma: PrismaClient }) => {
  const router = Router()

  router.use(requireRole('OPERADOR', 'SUPERVISOR', 'ADMIN'))

  router.get('/', async (req, res) => {
    try {
      const { partnerId, q, page, size } = listSchema.parse(req.query)

      const where: Prisma.BrandWhereInput = {
        ...(partnerId ? { partnerId: parsePartnerId(partnerId) } : {}),
        ...(q
          ? {
              name: {
                contains: q,
                mode: 'insensitive',
              },
            }
          : {}),
      }

      const skip = (page - 1) * size

      const [items, total] = await prisma.$transaction([
        prisma.brand.findMany({
          where,
          include: { partner: { select: { id: true, name: true } } },
          orderBy: { name: 'asc' },
          skip,
          take: size,
        }),
        prisma.brand.count({ where }),
      ])

      res.json({
        data: items,
        pagination: {
          page,
          size,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / size),
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Parâmetros inválidos', details: error.flatten().fieldErrors })
        return
      }

      if (error instanceof Error && error.message.includes('parceiro')) {
        res.status(400).json({ error: error.message })
        return
      }

      console.error('Erro ao listar marcas', error)
      res.status(500).json({ error: 'Não foi possível listar as marcas' })
    }
  })

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params
      const brand = await prisma.brand.findUnique({
        where: { id },
        include: { partner: { select: { id: true, name: true } } },
      })

      if (!brand) {
        res.status(404).json({ error: 'Marca não encontrada' })
        return
      }

      res.json(brand)
    } catch (error) {
      console.error('Erro ao carregar marca', error)
      res.status(500).json({ error: 'Não foi possível carregar a marca' })
    }
  })

  router.post('/', requireRole('ADMIN'), async (req, res) => {
    try {
      const payload = brandSchema.parse(req.body)
      const created = await prisma.brand.create({
        data: {
          ...payload,
          partnerId: parsePartnerId(payload.partnerId),
        },
        include: {
          partner: { select: { id: true, name: true } },
        },
      })

      res.status(201).json(created)
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Dados inválidos', details: error.flatten().fieldErrors })
        return
      }

      if (error instanceof Error && error.message.includes('parceiro')) {
        res.status(400).json({ error: error.message })
        return
      }

      if (isUniqueViolation(error)) {
        res.status(409).json({ error: 'Já existe uma marca com este nome para o parceiro informado' })
        return
      }

      console.error('Erro ao criar marca', error)
      res.status(500).json({ error: 'Não foi possível criar a marca' })
    }
  })

  router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
    try {
      const payload = brandSchema.partial({ partnerId: true }).parse(req.body)
      const { id } = req.params

      const data: Prisma.BrandUpdateInput = {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.code !== undefined ? { code: payload.code ?? null } : {}),
        ...(payload.partnerId
          ? {
              partner: {
                connect: { id: parsePartnerId(payload.partnerId) },
              },
            }
          : {}),
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: 'Informe ao menos um campo para atualização' })
        return
      }

      const updated = await prisma.brand.update({
        where: { id },
        data,
      })

      res.json(updated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Dados inválidos', details: error.flatten().fieldErrors })
        return
      }

      if (error instanceof Error && error.message.includes('parceiro')) {
        res.status(400).json({ error: error.message })
        return
      }

      if (isNotFound(error)) {
        res.status(404).json({ error: 'Marca não encontrada' })
        return
      }

      if (isUniqueViolation(error)) {
        res.status(409).json({ error: 'Já existe uma marca com este nome para o parceiro informado' })
        return
      }

      console.error('Erro ao atualizar marca', error)
      res.status(500).json({ error: 'Não foi possível atualizar a marca' })
    }
  })

  router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
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

const brandsRouter = createBrandsRouter({ prisma })

export { createBrandsRouter, brandsRouter }
