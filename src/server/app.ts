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

  return app
}

