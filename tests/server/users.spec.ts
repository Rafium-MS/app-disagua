import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '../../src/server/app'
import { prisma } from '../../src/server/prisma'
import { signJwt } from '../../src/server/security/jwt'
import { authConfig } from '../../src/server/config/auth'

const app = createApp()

const adminToken = signJwt({
  secret: authConfig.jwtSecret,
  expiresInSeconds: authConfig.accessTokenExpiresInSeconds,
  subject: 'admin-1',
  payload: { email: 'admin@local', name: 'Admin', roles: ['ADMIN'] },
}).token

const supervisorToken = signJwt({
  secret: authConfig.jwtSecret,
  expiresInSeconds: authConfig.accessTokenExpiresInSeconds,
  subject: 'sup-1',
  payload: { email: 'sup@local', name: 'Supervisor', roles: ['SUPERVISOR'] },
}).token

describe('Users management routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('permite listar usuários para administradores', async () => {
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
      {
        id: 'user-1',
        name: 'User One',
        email: 'user1@example.com',
        status: 'ACTIVE',
        lastLoginAt: null,
        roles: [{ role: { name: 'OPERADOR' } }],
      },
    ] as any)
    vi.spyOn(prisma.user, 'count').mockResolvedValue(1)

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
  })

  it('bloqueia acesso para SUPERVISOR', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${supervisorToken}`)

    expect(response.status).toBe(403)
  })

  it('cria novo usuário', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null)
    vi.spyOn(prisma.user, 'create').mockResolvedValue({
      id: 'user-2',
      name: 'Novo',
      email: 'novo@example.com',
      status: 'ACTIVE',
      lastLoginAt: null,
      roles: [{ role: { name: 'OPERADOR' } }],
    } as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Novo', email: 'novo@example.com', password: 'senha1234' })

    expect(response.status).toBe(201)
    expect(response.body.user.email).toBe('novo@example.com')
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'CREATE_USER' }) }),
    )
  })

  it('edita usuário existente', async () => {
    vi.spyOn(prisma.user, 'update').mockResolvedValue({
      id: 'user-3',
      name: 'Atualizado',
      email: 'atual@example.com',
      status: 'ACTIVE',
      lastLoginAt: null,
      roles: [{ role: { name: 'OPERADOR' } }],
    } as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const response = await request(app)
      .patch('/api/users/user-3')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Atualizado', email: 'atual@example.com' })

    expect(response.status).toBe(200)
    expect(response.body.user.name).toBe('Atualizado')
  })

  it('desativa usuário via DELETE', async () => {
    vi.spyOn(prisma.userRole, 'count')
      .mockResolvedValueOnce(0) // usuário não é admin
      .mockResolvedValueOnce(0)
    vi.spyOn(prisma.user, 'update').mockResolvedValue({
      id: 'user-4',
      name: 'User',
      email: 'user@example.com',
      status: 'INACTIVE',
      lastLoginAt: null,
      roles: [{ role: { name: 'OPERADOR' } }],
    } as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const response = await request(app)
      .delete('/api/users/user-4')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    expect(response.body.user.status).toBe('INACTIVE')
  })

  it('atribui funções a um usuário', async () => {
    vi.spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce({
        id: 'user-5',
        name: 'User',
        email: 'user@example.com',
        status: 'ACTIVE',
        roles: [{ role: { name: 'OPERADOR' } }],
      } as any)
      .mockResolvedValueOnce({
        id: 'user-5',
        name: 'User',
        email: 'user@example.com',
        status: 'ACTIVE',
        roles: [{ role: { name: 'ADMIN' } }],
      } as any)
    vi.spyOn(prisma.userRole, 'count')
      .mockResolvedValueOnce(0) // ensureNotLastAdmin when checking removal (not admin)
      .mockResolvedValueOnce(0)
    vi.spyOn(prisma.userRole, 'deleteMany').mockResolvedValue({ count: 1 })
    vi.spyOn(prisma.userRole, 'create').mockResolvedValue({} as any)
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any)

    const response = await request(app)
      .patch('/api/users/user-5/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roles: ['ADMIN'] })

    expect(response.status).toBe(200)
    expect(response.body.user.roles).toContain('ADMIN')
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'GRANT_ROLE' }) }),
    )
  })
})
