import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/server/app'
import { prisma } from '../../src/server/prisma'
import { hashPassword } from '../../src/server/security/password'
import { hashRefreshToken, serializeRefreshToken } from '../../src/server/security/tokens'
import { signJwt } from '../../src/server/security/jwt'
import { authConfig } from '../../src/server/config/auth'
import { resetLoginRateLimiter } from '../../src/server/middleware/auth/rate-limit'

const app = createApp()

function mockTransaction() {
  vi.spyOn(prisma, '$transaction').mockImplementation(async (operations: unknown[]) => {
    const tasks = operations as Promise<unknown>[]
    return Promise.all(tasks)
  })
}

describe('Auth routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetLoginRateLimiter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetLoginRateLimiter()
  })

  it('realiza login com credenciais válidas', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const passwordHash = await hashPassword('secret123')

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-1',
      email: 'admin@local',
      name: 'Admin',
      passwordHash,
      status: 'ACTIVE',
      roles: [{ role: { name: 'ADMIN' } }],
    } as any)
    vi.spyOn(prisma.refreshToken, 'create').mockResolvedValue({ id: 'refresh-1' } as any)
    vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)
    mockTransaction()

    const response = await request(app).post('/auth/login').send({ email: 'admin@local', password: 'secret123' })

    expect(response.status).toBe(200)
    expect(response.body.user.email).toBe('admin@local')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ failedLogins: 0 }),
      }),
    )
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOGIN' }) }),
    )
    expect(response.headers['set-cookie']?.some((cookie) => cookie.includes('refresh_token'))).toBe(true)
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"auth.login.request"'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"auth.login.success"'))
  })

  it('incrementa tentativas inválidas ao falhar login', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const passwordHash = await hashPassword('secret123')
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-1',
      email: 'admin@local',
      name: 'Admin',
      passwordHash,
      status: 'ACTIVE',
      roles: [{ role: { name: 'ADMIN' } }],
    } as any)
    vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any)

    const response = await request(app).post('/auth/login').send({ email: 'admin@local', password: 'wrong' })

    expect(response.status).toBe(401)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { failedLogins: { increment: 1 } },
      }),
    )
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"auth.login.invalid_credentials"'))
  })

  it('bloqueia login após exceder limite por IP', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app)
        .post('/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({ email: 'admin@local', password: 'wrong' })

      expect(response.status).toBe(401)
    }

    const blockedResponse = await request(app)
      .post('/auth/login')
      .set('X-Forwarded-For', '127.0.0.1')
      .send({ email: 'admin@local', password: 'wrong' })

    expect(blockedResponse.status).toBe(429)
    expect(blockedResponse.body.error).toBe('Muitas tentativas, tente novamente em instantes')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"auth.login.rate_limit.blocked"'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"auth.login.rate_limit.increment"'))
  })

  it('rotaciona refresh token ao atualizar sessão', async () => {
    const refreshToken = 'refresh-token-sample'
    const hash = hashRefreshToken(refreshToken)
    vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
      id: 'refresh-1',
      tokenHash: hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: {
        id: 'user-1',
        email: 'admin@local',
        name: 'Admin',
        status: 'ACTIVE',
        roles: [{ role: { name: 'ADMIN' } }],
      },
    } as any)
    vi.spyOn(prisma.refreshToken, 'update').mockResolvedValue({} as any)
    vi.spyOn(prisma.refreshToken, 'create').mockResolvedValue({ id: 'refresh-2' } as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)
    mockTransaction()

    const response = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${serializeRefreshToken('refresh-1', refreshToken)}`])

    expect(response.status).toBe(200)
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'refresh-1' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    )
    expect(prisma.refreshToken.create).toHaveBeenCalled()
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'REFRESH' }) }),
    )
  })

  it('revoga refresh token ao fazer logout', async () => {
    const rawRefresh = 'sample'
    vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
      id: 'refresh-1',
      tokenHash: hashRefreshToken(rawRefresh),
      revokedAt: null,
    } as any)
    vi.spyOn(prisma.refreshToken, 'update').mockResolvedValue({} as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const response = await request(app)
      .post('/auth/logout')
      .set('Cookie', [`refresh_token=${serializeRefreshToken('refresh-1', rawRefresh)}`])

    expect(response.status).toBe(204)
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'refresh-1' },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    )
  })

  it('permite alteração de senha para usuário autenticado', async () => {
    const passwordHash = await hashPassword('current123')
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-1',
      email: 'admin@local',
      name: 'Admin',
      passwordHash,
    } as any)
    vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const token = signJwt({
      secret: authConfig.jwtSecret,
      expiresInSeconds: authConfig.accessTokenExpiresInSeconds,
      subject: 'user-1',
      payload: { email: 'admin@local', name: 'Admin', roles: ['ADMIN'] },
    }).token

    const response = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'current123', newPassword: 'newpass456' })

    expect(response.status).toBe(204)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    )
  })

  it('permite reset de senha apenas para ADMIN', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-2',
      email: 'user@example.com',
      name: 'User',
      passwordHash: await hashPassword('oldpass123'),
      roles: [],
    } as any)
    vi.spyOn(prisma.user, 'update').mockResolvedValue({} as any)
    vi.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 0 })
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const token = signJwt({
      secret: authConfig.jwtSecret,
      expiresInSeconds: authConfig.accessTokenExpiresInSeconds,
      subject: 'admin-1',
      payload: { email: 'admin@local', name: 'Admin', roles: ['ADMIN'] },
    }).token

    const response = await request(app)
      .post('/auth/reset-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: 'user-2' })

    expect(response.status).toBe(200)
    expect(response.body.temporaryPassword).toBeDefined()
    expect(prisma.user.update).toHaveBeenCalled()
  })
})
