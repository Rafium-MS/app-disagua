import type { RequestHandler } from 'express'
import { logger } from '../../utils/logger'

const WINDOW_MS = 60_000
const LIMIT = 10

const store = new Map<string, { count: number; first: number }>()

function getKey(req: Parameters<RequestHandler>[0]) {
  return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown'
}

export const loginRateLimiter: RequestHandler = (req, res, next) => {
  const key = getKey(req)
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.first > WINDOW_MS) {
    store.set(key, { count: 1, first: now })
    logger.info('auth.login.rate_limit.reset', { ip: key })
    next()
    return
  }

  if (entry.count >= LIMIT) {
    logger.warn('auth.login.rate_limit.blocked', {
      ip: key,
      windowStartedAt: new Date(entry.first).toISOString(),
      attempts: entry.count,
    })
    res.status(429).json({ error: 'Muitas tentativas, tente novamente em instantes' })
    return
  }

  entry.count += 1
  logger.info('auth.login.rate_limit.increment', { ip: key, attempts: entry.count })
  next()
}

export function resetLoginRateLimiter() {
  store.clear()
}
