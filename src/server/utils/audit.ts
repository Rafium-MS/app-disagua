import { prisma } from '../prisma'
import { getRequestContext } from '../context'

type AuditLogParams = {
  action: string
  entity: string
  entityId?: string | null
  changes?: unknown
}

export async function recordAuditLog({ action, entity, entityId, changes }: AuditLogParams) {
  const context = getRequestContext()
  await prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId: entityId ?? null,
      changes: changes ? JSON.stringify(changes) : null,
      actor: context?.actor ?? null,
      requestId: context?.requestId ?? null,
      requestMethod: context?.method ?? null,
      requestUrl: context?.url ?? null,
      ipAddress: context?.ip ?? null,
    },
  })
}
