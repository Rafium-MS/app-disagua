import express from 'express'
import cors from 'cors'

import { prisma } from './prisma'
import { requestContextMiddleware } from './middleware/request-context'
import { partnersRouter } from './routes/partners'
import { reportsRouter } from './routes/reports'
import { vouchersRouter } from './routes/vouchers'
import { auditLogsRouter } from './routes/audit-logs'
import { storesRouter } from './routes/stores'
import { buildCorsOptions } from './config/cors'
import { analyticsRouter } from './routes/analytics'
import { brandsRouter } from './routes/brands'
import { authRouter } from './routes/auth'
import { parseCookiesMiddleware } from './middleware/parse-cookies'
import { attachUserMiddleware } from './middleware/auth/attach-user'
import { requireAuth } from './middleware/auth/require-auth'
import { usersRouter } from './routes/users'

export function createApp() {
  const app = express()
  app.use(cors(buildCorsOptions()))
  app.use(express.json())
  app.use(parseCookiesMiddleware)
  app.use(requestContextMiddleware)
  app.use(attachUserMiddleware)

  // Healthcheck
  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/auth', authRouter)

  app.use(requireAuth)

  app.use('/api', analyticsRouter)
  app.use(['/api/partners', '/partners'], partnersRouter)
  app.use(['/api/reports', '/reports'], reportsRouter)
  app.use(['/api/vouchers', '/vouchers'], vouchersRouter)
  app.use(['/api/audit-logs', '/audit-logs'], auditLogsRouter)
  app.use(['/api/brands', '/brands'], brandsRouter)
  app.use(['/api/stores', '/stores'], storesRouter)
  app.use(['/api/users', '/users'], usersRouter)

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
