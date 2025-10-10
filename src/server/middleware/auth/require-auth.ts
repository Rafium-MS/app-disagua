import type { RequestHandler } from 'express'

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação necessária' })
    return
  }
  next()
}
