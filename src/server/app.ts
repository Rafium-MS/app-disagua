import express from 'express'
import cors from 'cors'

import { prisma } from './prisma'
import { requestContextMiddleware } from './middleware/request-context'
import { partnersRouter } from './routes/partners'
import { reportsRouter } from './routes/reports'
import { vouchersRouter } from './routes/vouchers'
import { auditLogsRouter } from './routes/audit-logs'
import { buildCorsOptions } from './config/cors'

export function createApp() {
  const app = express()
  app.use(cors(buildCorsOptions()))
  app.use(express.json())
  app.use(requestContextMiddleware)

  // Healthcheck
  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use(['/api/partners', '/partners'], partnersRouter)
  app.use(['/api/reports', '/reports'], reportsRouter)
  app.use(['/api/vouchers', '/vouchers'], vouchersRouter)
  app.use(['/api/audit-logs', '/audit-logs'], auditLogsRouter)

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
