import type { Prisma, PrismaClient } from '@prisma/client'
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

const reportIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive()
  })
  .strict()

const pendingPartnersQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .transform(value => (value.length > 0 ? value : undefined))
      .optional(),
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

  reportsRouter.get('/:id/pending-partners', async (req, res) => {
    try {
      const { id: reportId } = reportIdParamSchema.parse(req.params)
      const { search, page, pageSize } = pendingPartnersQuerySchema.parse(req.query)

      const existingReport = await prismaClient.report.findUnique({
        where: { id: reportId },
        select: { id: true }
      })

      if (!existingReport) {
        res.status(404).json({ error: 'Relatório não encontrado' })
        return
      }

      const where: Prisma.PartnerWhereInput = {
        vouchers: {
          none: {
            reportId,
            redeemedAt: null
          }
        },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { document: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      }

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
            vouchers: {
              where: { reportId },
              orderBy: { issuedAt: 'desc' },
              select: {
                id: true,
                issuedAt: true,
                redeemedAt: true
              }
            }
          }
        }),
        prismaClient.partner.count({ where })
      ])

      const data = partners.map(partner => {
        const reportVouchers = partner.vouchers
        const totalVouchers = reportVouchers.length
        const validVouchers = reportVouchers.filter(voucher => voucher.redeemedAt === null).length
        const redeemedVouchers = totalVouchers - validVouchers
        const lastVoucherIssuedAt = reportVouchers[0]?.issuedAt ?? null

        return {
          id: partner.id,
          name: partner.name,
          document: partner.document,
          email: partner.email,
          reportVoucherStats: {
            total: totalVouchers,
            valid: validVouchers,
            redeemed: redeemedVouchers,
            lastIssuedAt: lastVoucherIssuedAt ? lastVoucherIssuedAt.toISOString() : null
          }
        }
      })

      res.json({
        data,
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

      console.error('Erro ao listar parceiros pendentes do relatório', error)
      res.status(500).json({ error: 'Não foi possível listar os parceiros pendentes' })
    }
  })

  return reportsRouter
}

const reportsRouter = createReportsRouter({ prisma })

export { createReportsRouter, reportsRouter }

