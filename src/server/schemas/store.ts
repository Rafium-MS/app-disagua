import { z, type AnyZodObject } from 'zod'

import { storeProductTypes } from '@shared/store-utils'

export const productEnum = z.enum(storeProductTypes)

const brandCodeSchema = z
  .string()
  .trim()
  .max(32)
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) {
      return undefined
    }
    if (value === null) {
      return null
    }
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  })

const brandIdSchema = z
  .string()
  .trim()
  .min(1, 'Identificador de marca inválido')
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) {
      return undefined
    }
    if (value === null) {
      return null
    }
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  })

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

const applyBrandSelectionValidation = <Schema extends AnyZodObject>(schema: Schema) =>
  schema.superRefine((value, ctx) => {
    if (value.brandId && value.createBrand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['createBrand'],
        message: 'Escolha uma marca existente ou cadastre uma nova, não ambos.',
      })
    }
  })

const deliveredProductsSchema = z
  .array(productEnum)
  .optional()
  .transform((value) => {
    if (!value) {
      return []
    }
    const unique = new Set<z.infer<typeof productEnum>>()
    for (const product of value) {
      unique.add(product)
    }
    return Array.from(unique)
  })

const storeBaseObject = z
  .object({
    partnerId: z.coerce.number().int().positive(),
    brandId: brandIdSchema,
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
    deliveredProducts: deliveredProductsSchema,
  })

export const storeBaseSchema = applyBrandSelectionValidation(storeBaseObject)

export const storeCreateSchema = storeBaseSchema

export const storeUpdateSchema = applyBrandSelectionValidation(
  storeBaseObject.partial({ partnerId: true })
)

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
