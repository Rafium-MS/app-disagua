import type { RequestHandler } from 'express'
import { authConfig } from '../../config/auth'
import { verifyJwt } from '../../security/jwt'
import { setRequestActor } from '../../context'
import type { UserRoleName } from '../../../shared/auth'

function extractAccessToken(req: Parameters<RequestHandler>[0]) {
  const authHeader = req.header('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length)
  }
  return req.auth?.accessToken
}

export const attachUserMiddleware: RequestHandler = async (req, _res, next) => {
  const token = extractAccessToken(req)
  if (!token) {
    next()
    return
  }

  const payload = verifyJwt(token, authConfig.jwtSecret)
  if (!payload) {
    next()
    return
  }

  const userId = payload.sub
  const email = typeof payload.email === 'string' ? payload.email : null
  const name = typeof payload.name === 'string' ? payload.name : null
  const rolesPayload = Array.isArray(payload.roles) ? payload.roles : []
  const roles = rolesPayload.filter((role): role is UserRoleName => typeof role === 'string')

  if (!userId || !email || !name) {
    next()
    return
  }

  req.user = { id: userId, email, name, roles }
  req.auth = { ...req.auth, accessToken: token }
  setRequestActor(userId)

  next()
}
