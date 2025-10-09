import type { Prisma } from '@prisma/client'

export const insensitiveContains = <ModelName extends keyof Prisma.TypeMap['model']>(
  value: string
): Prisma.StringFilter<ModelName> =>
  ({
    contains: value,
    mode: 'insensitive'
  } as unknown as Prisma.StringFilter<ModelName>)
