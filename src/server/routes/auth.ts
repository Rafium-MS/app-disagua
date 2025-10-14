import { Router, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { authConfig } from '../config/auth'
import { hashPassword, verifyPassword } from '../security/password'
import { signJwt } from '../security/jwt'
import {
  generateRefreshTokenValue,
  hashRefreshToken,
  parseRefreshToken,
  serializeRefreshToken,
  verifyRefreshToken,
} from '../security/tokens'
import { loginRateLimiter } from '../middleware/auth/rate-limit'
import { requireAuth } from '../middleware/auth/require-auth'
import { requireRole } from '../middleware/auth/require-role'
import { recordAuditLog } from '../utils/audit'
import { logger } from '../utils/logger'
import { setRequestActor } from '../context'
import type { UserRoleName } from '../../shared/auth'

const loginEmailSchema = z
  .string()
  .trim()
  .min(3)
  .refine((value) => /^[^@\s]+@[^@\s]+$/.test(value), {
    message: 'E-mail inválido',
  })

const loginSchema = z.object({
  email: loginEmailSchema,
  password: z.string().min(1),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8).optional(),
})

function generateTemporaryPassword() {
  return generateRefreshTokenValue().slice(0, 12)
}

function mapUserRoles(user: { roles: { role: { name: string } }[] }): UserRoleName[] {
  return user.roles.map((item) => item.role.name as UserRoleName)
}

function buildUserPayload(user: { id: string; email: string; name: string; roles: { role: { name: string } }[] }) {
  const roles = mapUserRoles(user)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles,
  }
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string, refreshExpires: Date) {
  const accessMaxAge = authConfig.accessTokenExpiresInSeconds * 1000
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: accessMaxAge,
    path: '/',
  })
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: Math.max(1, Math.floor(refreshExpires.getTime() - Date.now())),
    path: '/',
  })
}

function clearAuthCookies(res: Response) {
  res.clearCookie('access_token')
  res.clearCookie('refresh_token')
}

export const authRouter = Router()

authRouter.post('/login', loginRateLimiter, async (req, res) => {
  logger.info('auth.login.request', {
    ip: req.ip ?? null,
    email: typeof req.body?.email === 'string' ? req.body.email : undefined,
  })

  const parseResult = loginSchema.safeParse(req.body)
  if (!parseResult.success) {
    logger.warn('auth.login.validation_failed', {
      ip: req.ip ?? null,
      issues: parseResult.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
    })
    res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors })
    return
  }

  const { email, password } = parseResult.data

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  })

  if (!user || user.status !== 'ACTIVE') {
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: { increment: 1 } },
      })
    }
    logger.warn('auth.login.invalid_credentials', {
      ip: req.ip ?? null,
      email,
      userId: user?.id ?? null,
      reason: user ? 'INACTIVE' : 'NOT_FOUND',
    })
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash)
  if (!passwordMatches) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: { increment: 1 } },
    })
    logger.warn('auth.login.invalid_credentials', {
      ip: req.ip ?? null,
      email,
      userId: user.id,
      reason: 'INVALID_PASSWORD',
    })
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  const payload = buildUserPayload(user)
  const jwt = signJwt({
    secret: authConfig.jwtSecret,
    expiresInSeconds: authConfig.accessTokenExpiresInSeconds,
    subject: user.id,
    payload: {
      email: user.email,
      name: user.name,
      roles: payload.roles,
    },
  })

  const refreshValue = generateRefreshTokenValue()
  const refreshHash = hashRefreshToken(refreshValue)
  const refreshExpires = new Date(Date.now() + authConfig.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000)

  const [refreshRecord] = await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: refreshExpires,
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lastLoginAt: new Date(),
        lastLoginIp: req.ip ?? null,
      },
    }),
  ])

  setRequestActor(user.id)
  const refreshToken = serializeRefreshToken(refreshRecord.id, refreshValue)
  setAuthCookies(res, jwt.token, refreshToken, refreshExpires)

  logger.info('auth.login.success', {
    ip: req.ip ?? null,
    userId: user.id,
    email: user.email,
  })

  await recordAuditLog({ action: 'LOGIN', entity: 'User', entityId: user.id })

  res.json({ user: payload, accessToken: jwt.token })
})

authRouter.post('/refresh', async (req, res) => {
  const parsedRefresh = parseRefreshToken(
    typeof req.body?.refreshToken === 'string' && req.body.refreshToken.length > 0
      ? req.body.refreshToken
      : req.auth?.refreshToken,
  )
  if (!parsedRefresh) {
    res.status(401).json({ error: 'Refresh token ausente' })
    return
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { id: parsedRefresh.id },
    include: { user: { include: { roles: { include: { role: true } } } } },
  })

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    res.status(401).json({ error: 'Refresh token inválido' })
    return
  }

  if (!verifyRefreshToken(parsedRefresh.token, storedToken.tokenHash)) {
    res.status(401).json({ error: 'Refresh token inválido' })
    return
  }

  const user = storedToken.user
  if (user.status !== 'ACTIVE') {
    res.status(403).json({ error: 'Usuário inativo' })
    return
  }

  const payload = buildUserPayload(user)
  const jwt = signJwt({
    secret: authConfig.jwtSecret,
    expiresInSeconds: authConfig.accessTokenExpiresInSeconds,
    subject: user.id,
    payload: {
      email: user.email,
      name: user.name,
      roles: payload.roles,
    },
  })

  const newRefreshValue = generateRefreshTokenValue()
  const newRefreshHash = hashRefreshToken(newRefreshValue)
  const refreshExpires = new Date(Date.now() + authConfig.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000)

  const [, newRefreshRecord] = await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshHash,
        expiresAt: refreshExpires,
        userAgent: req.headers['user-agent'] ?? null,
        ip: req.ip ?? null,
      },
    }),
  ])

  setRequestActor(user.id)
  const newRefreshToken = serializeRefreshToken(newRefreshRecord.id, newRefreshValue)
  setAuthCookies(res, jwt.token, newRefreshToken, refreshExpires)

  await recordAuditLog({ action: 'REFRESH', entity: 'RefreshToken', entityId: storedToken.id })

  res.json({ user: payload, accessToken: jwt.token })
})

authRouter.post('/logout', async (req, res) => {
  const parsedRefresh = parseRefreshToken(
    typeof req.body?.refreshToken === 'string' && req.body.refreshToken.length > 0
      ? req.body.refreshToken
      : req.auth?.refreshToken,
  )

  if (parsedRefresh) {
    const existing = await prisma.refreshToken.findUnique({ where: { id: parsedRefresh.id } })
    if (existing && !existing.revokedAt && verifyRefreshToken(parsedRefresh.token, existing.tokenHash)) {
      await prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      })
    }
  }
  clearAuthCookies(res)
  if (req.user) {
    await recordAuditLog({ action: 'LOGOUT', entity: 'User', entityId: req.user.id })
  }
  res.status(204).send()
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { roles: { include: { role: true } } },
  })
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' })
    return
  }
  const payload = buildUserPayload(user)
  res.json({ user: payload })
})

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const parseResult = changePasswordSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors })
    return
  }

  const { currentPassword, newPassword } = parseResult.data

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' })
    return
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) {
    res.status(400).json({ error: 'Senha atual incorreta' })
    return
  }

  const newHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, failedLogins: 0 },
  })

  await recordAuditLog({ action: 'CHANGE_PASSWORD', entity: 'User', entityId: user.id })

  res.status(204).send()
})

authRouter.post('/reset-password', requireRole('ADMIN'), async (req, res) => {
  const parseResult = resetPasswordSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors })
    return
  }

  const { userId, newPassword } = parseResult.data

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } })
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' })
    return
  }

  const temporaryPassword = newPassword || generateTemporaryPassword()
  const newHash = await hashPassword(temporaryPassword)

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, failedLogins: 0 },
  })

  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  await recordAuditLog({ action: 'RESET_PASSWORD', entity: 'User', entityId: user.id })

  res.json({ temporaryPassword })
})
