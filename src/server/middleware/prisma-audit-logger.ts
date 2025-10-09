import type { Prisma, PrismaClient } from '@prisma/client'

import { getRequestContext } from '../context'

const auditedActions = new Set<Prisma.MiddlewareParams['action']>([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany'
])

const toSerializableValue = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializableValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (accumulator, [key, entryValue]) => {
        accumulator[key] = toSerializableValue(entryValue)
        return accumulator
      },
      {}
    )
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  return String(value)
}

const extractEntityId = (result: unknown, params: Prisma.MiddlewareParams) => {
  if (result && typeof result === 'object' && 'id' in result) {
    const idValue = (result as { id?: unknown }).id
    return idValue === undefined || idValue === null ? null : String(idValue)
  }

  if ('where' in (params.args ?? {}) && params.args.where) {
    try {
      return JSON.stringify(params.args.where)
    } catch (_error) {
      return null
    }
  }

  return null
}

const buildChangesSnapshot = (params: Prisma.MiddlewareParams, result: unknown) => {
  const snapshot = {
    action: params.action,
    data: params.args?.data ? toSerializableValue(params.args.data) : undefined,
    where: params.args?.where ? toSerializableValue(params.args.where) : undefined,
    result: result ? toSerializableValue(result) : undefined
  }

  return JSON.stringify(snapshot, null, 2)
}

export function registerPrismaAuditLogger(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    if (!params.model || params.model === 'AuditLog' || !auditedActions.has(params.action)) {
      return next(params)
    }

    const result = await next(params)

    const context = getRequestContext()

    const logEntry = {
      actor: context?.actor ?? 'sistema',
      action: params.action,
      entity: params.model,
      entityId: extractEntityId(result, params),
      requestId: context?.requestId,
      requestMethod: context?.method,
      requestUrl: context?.url,
      ipAddress: context?.ip,
      changes: buildChangesSnapshot(params, result)
    }

    try {
      await prisma.auditLog.create({
        data: logEntry
      })
    } catch (error) {
      console.error('Falha ao registrar log de auditoria', error)
    }

    return result
  })
}
