import { z } from 'zod'

import { storeProductTypes } from '@shared/store-utils'

export const productEnum = z.enum(storeProductTypes)

export const storePriceSchema = z.object({
  product: productEnum,
  unitValueBRL: z.string().optional().nullable(),
})

export const storeSchema = z.object({
  partnerId: z.string().optional().nullable(),
  name: z.string().min(2),
  externalCode: z.string().optional().nullable(),
  addressRaw: z.string().min(3),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  city: z.string().min(2),
  state: z.string().length(2),
  postalCode: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  prices: z.array(storePriceSchema).default([]),
})
