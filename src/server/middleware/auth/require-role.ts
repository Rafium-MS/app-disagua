import type { RequestHandler } from 'express'
import type { UserRoleName } from '../../../shared/auth'

export function requireRole(...roles: UserRoleName[]): RequestHandler {
  const allowed = new Set(roles)
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Autenticação necessária' })
      return
    }
    const hasRole = req.user.roles.some((role) => allowed.has(role))
    if (!hasRole) {
      res.status(403).json({ error: 'Acesso negado' })
      return
    }
    next()
  }
}
