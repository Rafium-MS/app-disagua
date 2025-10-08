import express from 'express'
import cors from 'cors'

import { prisma } from './prisma'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())

  // Healthcheck
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/partners', async (_req, res) => {
    try {
      const partners = await prisma.partner.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          document: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      })

      res.json({ data: partners })
    } catch (error) {
      console.error('Erro ao listar parceiros', error)
      res.status(500).json({ error: 'Não foi possível listar os parceiros' })
    }
  })

  app.get('/reports', async (_req, res) => {
    try {
      const reports = await prisma.report.findMany({
        orderBy: { issuedAt: 'desc' },
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
      })

      res.json({ data: reports })
    } catch (error) {
      console.error('Erro ao listar relatórios', error)
      res.status(500).json({ error: 'Não foi possível listar os relatórios' })
    }
  })

  app.get('/vouchers', async (_req, res) => {
    try {
      const vouchers = await prisma.voucher.findMany({
        orderBy: { issuedAt: 'desc' },
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
      })

      res.json({ data: vouchers })
    } catch (error) {
      console.error('Erro ao listar vouchers', error)
      res.status(500).json({ error: 'Não foi possível listar os vouchers' })
    }
  })

  app.get('/stats', async (_req, res) => {
    try {
      const [partnersCount, reportsCount, vouchersCount, redeemedVouchersCount] =
        await prisma.$transaction([
          prisma.partner.count(),
          prisma.report.count(),
          prisma.voucher.count(),
          prisma.voucher.count({
            where: { redeemedAt: { not: null } }
          })
        ])

      const pendingVouchersCount = vouchersCount - redeemedVouchersCount

      res.json({
        data: {
          partnersCount,
          reportsCount,
          vouchersCount,
          redeemedVouchersCount,
          pendingVouchersCount
        }
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas do dashboard', error)
      res.status(500).json({ error: 'Não foi possível carregar as estatísticas' })
    }
  })

  return app
}

