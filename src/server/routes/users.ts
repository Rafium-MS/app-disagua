import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireRole } from '../middleware/auth/require-role'
import { recordAuditLog } from '../utils/audit'
import { hashPassword } from '../security/password'
import { USER_ROLES, type UserRoleName } from '../../shared/auth'

const listUsersQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value : undefined))
      .optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict()

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

const updateRolesSchema = z.object({
  roles: z.array(z.enum(USER_ROLES)).min(1),
})

function mapUser(user: {
  id: string
  name: string
  email: string
  status: 'ACTIVE' | 'INACTIVE'
  lastLoginAt: Date | null
  roles: { role: { name: string } }[]
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    roles: user.roles.map((item) => item.role.name as UserRoleName),
  }
}

async function ensureNotLastAdmin(userId: string) {
  const isAdmin = await prisma.userRole.count({ where: { userId, role: { name: 'ADMIN' } } })
  if (isAdmin === 0) {
    return
  }
  const otherAdmins = await prisma.userRole.count({
    where: { role: { name: 'ADMIN' }, NOT: { userId }, user: { status: 'ACTIVE' } },
  })
  if (otherAdmins === 0) {
    throw new Error('Não é possível remover o último ADMIN')
  }
}

export const usersRouter = Router()

usersRouter.use(requireRole('ADMIN'))

usersRouter.get('/', async (req, res) => {
  const parseResult = listUsersQuerySchema.safeParse(req.query)
  if (!parseResult.success) {
    res.status(400).json({ error: 'Parâmetros inválidos', details: parseResult.error.flatten().fieldErrors })
    return
  }

  const { q, status, page, pageSize } = parseResult.data
  const where = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {},
      status ? { status } : {},
    ],
  }

  const skip = (page - 1) * pageSize

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
      include: { roles: { include: { role: true } } },
    }),
    prisma.user.count({ where }),
  ])

  res.json({
    data: users.map(mapUser),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  })
})

usersRouter.post('/', async (req, res) => {
  const parseResult = createUserSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors })
    return
  }

  const { email, name, password, status } = parseResult.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email já utilizado' })
    return
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      status: status ?? 'ACTIVE',
      roles: {
        create: [{ role: { connect: { name: 'OPERADOR' } } }],
      },
    },
    include: { roles: { include: { role: true } } },
  })

  await recordAuditLog({ action: 'CREATE_USER', entity: 'User', entityId: user.id })

  res.status(201).json({ user: mapUser(user) })
})

usersRouter.patch('/:id', async (req, res) => {
  const { id } = req.params
  const parseResult = updateUserSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors })
    return
  }

  const updates = parseResult.data
  if (updates.status === 'INACTIVE') {
    try {
      await ensureNotLastAdmin(id)
    } catch (error) {
      res.status(400).json({ error: (error as Error).message })
      return
    }
  }
  try {
    const user = await prisma.user.update({
      where: { id },
      data: updates,
      include: { roles: { include: { role: true } } },
    })
    await recordAuditLog({ action: 'UPDATE_USER', entity: 'User', entityId: id, changes: updates })
    res.json({ user: mapUser(user) })
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'P2002') {
      res.status(409).json({ error: 'Email já utilizado' })
      return
    }
    res.status(404).json({ error: 'Usuário não encontrado' })
  }
})

usersRouter.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    await ensureNotLastAdmin(id)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
    return
  }
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      include: { roles: { include: { role: true } } },
    })
    await recordAuditLog({ action: 'DELETE_USER', entity: 'User', entityId: id })
    res.json({ user: mapUser(user) })
  } catch (error) {
    res.status(404).json({ error: 'Usuário não encontrado' })
  }
})

usersRouter.get('/:id/roles', async (req, res) => {
  const { id } = req.params
  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  })
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' })
    return
  }
  res.json({ roles: mapUser(user).roles })
})

usersRouter.patch('/:id/roles', async (req, res) => {
  const { id } = req.params
  const parseResult = updateRolesSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors })
    return
  }

  const { roles } = parseResult.data
  const existing = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  })
  if (!existing) {
    res.status(404).json({ error: 'Usuário não encontrado' })
    return
  }

  if (!roles.includes('ADMIN')) {
    try {
      await ensureNotLastAdmin(id)
    } catch (error) {
      res.status(400).json({ error: (error as Error).message })
      return
    }
  }

  const existingRoles = new Set(existing.roles.map((item) => item.role.name as UserRoleName))
  const newRoles = new Set(roles)
  const addedRoles = Array.from(newRoles).filter((role) => !existingRoles.has(role))
  const removedRoles = Array.from(existingRoles).filter((role) => !newRoles.has(role))

  await prisma.userRole.deleteMany({
    where: { userId: id, role: { name: { notIn: Array.from(newRoles) } } },
  })

  const creationTasks = Array.from(newRoles)
    .filter((role) => !existingRoles.has(role))
    .map((role) =>
      prisma.userRole.create({
        data: {
          userId: id,
          role: { connect: { name: role } },
        },
      }),
    )

  if (creationTasks.length) {
    await Promise.all(creationTasks)
  }

  for (const role of addedRoles) {
    await recordAuditLog({ action: 'GRANT_ROLE', entity: 'User', entityId: id, changes: { role } })
  }
  for (const role of removedRoles) {
    await recordAuditLog({ action: 'REVOKE_ROLE', entity: 'User', entityId: id, changes: { role } })
  }

  const updated = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  })

  res.json({ user: mapUser(updated!) })
})
