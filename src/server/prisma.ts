import { PrismaClient } from '@prisma/client'

import { registerPrismaAuditLogger } from './middleware/prisma-audit-logger'

export const prisma = new PrismaClient()

registerPrismaAuditLogger(prisma)

