import { z } from 'zod'

import { storeProductTypes } from '@shared/store-utils'

export const productEnum = z.enum(storeProductTypes)

const cuidRegex = /^c[a-z0-9]{24}$/i

const brandCodeSchema = z
  .string()
  .trim()
  .max(32)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))

export const brandSchema = z
  .object({
    partnerId: z.coerce.number().int().positive(),
    name: z.string().trim().min(2),
    code: brandCodeSchema,
  })
  .strict()

export const brandUpdateSchema = brandSchema.partial({ partnerId: true }).strict()

const createBrandSchema = z
  .object({
    name: z.string().trim().min(2),
    code: brandCodeSchema,
  })
  .strict()

export const storePriceSchema = z
  .object({
    product: productEnum,
    unitValueBRL: z
      .string()
      .trim()
      .optional()
      .nullable(),
  })
  .strict()

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))

const optionalString = z
  .string()
  .trim()
  .max(191)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))

const cnpjRegex = /^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})$/

export const storeBaseSchema = z
  .object({
    partnerId: z.coerce.number().int().positive(),
    brandId: z
      .string()
      .trim()
      .regex(cuidRegex, 'Identificador de marca inválido')
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
    createBrand: createBrandSchema.optional(),
    name: z.string().trim().min(2),
    externalCode: optionalString,
    cnpj: z
      .string()
      .trim()
      .regex(cnpjRegex, 'CNPJ inválido')
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
    phone: optionalString,
    email: emailSchema,
    mall: optionalString,
    addressRaw: z.string().trim().min(3),
    street: optionalString,
    number: optionalString,
    complement: optionalString,
    district: optionalString,
    city: z.string().trim().min(2),
    state: z
      .string()
      .trim()
      .length(2, 'UF deve conter 2 letras')
      .regex(/[A-Za-z]{2}/, 'UF deve conter apenas letras'),
    postalCode: optionalString,
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    prices: z.array(storePriceSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.brandId && value.createBrand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['createBrand'],
        message: 'Escolha uma marca existente ou cadastre uma nova, não ambos.',
      })
    }
  })

export const storeCreateSchema = storeBaseSchema

export const storeUpdateSchema = storeBaseSchema.partial({ partnerId: true }).extend({
  partnerId: z.coerce.number().int().positive().optional(),
})

export const storeImportMappingSchema = z
  .object({
    colPartner: optionalString,
    colBrand: optionalString,
    colStoreName: optionalString,
    colMall: optionalString,
    colAddress: optionalString,
    colCity: optionalString,
    colState: optionalString,
    colCNPJ: optionalString,
    colPhone: optionalString,
    colEmail: optionalString,
    colExternalCode: optionalString,
    colValue20L: optionalString,
    colValue10L: optionalString,
    colValue1500: optionalString,
    colValueCopo: optionalString,
    colValueVasilhame: optionalString,
  })
  .superRefine((value, ctx) => {
    if (!value.colPartner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colPartner'],
        message: 'Selecione a coluna do parceiro',
      })
    }
    if (!value.colStoreName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colStoreName'],
        message: 'Selecione a coluna do nome da loja',
      })
    }
    if (!value.colCity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colCity'],
        message: 'Selecione a coluna da cidade',
      })
    }
    if (!value.colState) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colState'],
        message: 'Selecione a coluna da UF',
      })
    }
  })

export const storeImportSchema = z.object({
  mapping: storeImportMappingSchema,
  allowCreateBrand: z.boolean().optional().default(false),
})
