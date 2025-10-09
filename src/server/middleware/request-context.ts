import type { RequestHandler } from 'express'
import { randomUUID } from 'node:crypto'

import { requestContextStorage, type RequestContext } from '../context'

const normalizeHeaderValue = (value: string | undefined | null) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const requestContextMiddleware: RequestHandler = (req, _res, next) => {
  const context: RequestContext = {
    actor: normalizeHeaderValue(req.header('x-actor-id') ?? req.header('x-user-id')),
    requestId: randomUUID(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  }

  requestContextStorage.run(context, () => {
    next()
  })
}
