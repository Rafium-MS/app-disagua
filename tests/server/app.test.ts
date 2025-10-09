import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/server/app'
import { prisma } from '../../src/server/prisma'

describe('createApp integration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('responde ao healthcheck com ok: true', async () => {
    const app = createApp()
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  it('retorna estatísticas agregadas em /stats', async () => {
    vi.spyOn(prisma.partner, 'count').mockResolvedValue(5)
    vi.spyOn(prisma.report, 'count').mockResolvedValue(3)
    vi.spyOn(prisma.voucher, 'count').mockImplementation(async (args?: unknown) => {
      if (
        args &&
        typeof args === 'object' &&
        'where' in args &&
        (args as { where?: unknown }).where
      ) {
        return 2
      }

      return 4
    })

    vi.spyOn(prisma, '$transaction').mockImplementation(async (operations: unknown[]) => {
      const promises = operations as Promise<unknown>[]
      return Promise.all(promises)
    })

    const app = createApp()
    const response = await request(app).get('/stats')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        partnersCount: 5,
        reportsCount: 3,
        vouchersCount: 4,
        redeemedVouchersCount: 2,
        pendingVouchersCount: 2
      }
    })
  })
})
