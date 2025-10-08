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

  app.get('/partners', async (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

      const partners = await prisma.partner.findMany({
        where:
          search.length > 0
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { document: { contains: search } },
                  { email: { contains: search, mode: 'insensitive' } }
                ]
              }
            : undefined,
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

      res.json(
        partners.map((partner) => ({
          ...partner,
          email: partner.email ?? null,
          createdAt: partner.createdAt.toISOString(),
          updatedAt: partner.updatedAt.toISOString()
        }))
      )
    } catch (error) {
      console.error('Erro ao listar parceiros', error)
      res.status(500).json({ error: 'internal_error' })
    }
  })

  return app
}

