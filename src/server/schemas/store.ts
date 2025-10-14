import { z } from 'zod'

import { storeProductTypes } from '@shared/store-utils'

export const productEnum = z.enum(storeProductTypes)

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (value == null) {
      return undefined
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  })

const nullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined
    }
    if (value === null) {
      return null
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

export const brandSchema = z
  .object({
    partnerId: z.string().trim().min(1, 'Parceiro obrigatório'),
    name: z.string().trim().min(2, 'Nome da marca obrigatório'),
    code: optionalString,
  })
  .strict()

export const storePriceSchema = z
  .object({
    product: productEnum,
    unitValueBRL: optionalString,
  })
  .strict()

export const storeSchema = z
  .object({
    partnerId: z.string().trim().min(1, 'Parceiro obrigatório'),
    brandId: z.string().trim().min(1, 'Marca obrigatória'),
    name: z.string().trim().min(2, 'Nome da loja obrigatório'),
    deliveryPlace: z
      .string()
      .trim()
      .min(2, 'Informe o local de entrega'),
    addressRaw: nullableString,
    street: nullableString,
    number: nullableString,
    complement: nullableString,
    district: nullableString,
    city: nullableString,
    state: nullableString.refine(
      (value) => value == null || /^[A-Za-z]{2}$/.test(value),
      'UF deve ter 2 letras',
    ),
    postalCode: nullableString,
    mall: nullableString,
    cnpj: nullableString,
    phone: nullableString,
    email: nullableString,
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    prices: z.array(storePriceSchema).max(5).optional(),
  })
  .strict()

export const storeUpdateSchema = storeSchema.partial({
  partnerId: true,
  brandId: true,
})

export const storeImportMappingSchema = z
  .object({
    colPartner: optionalString,
    colBrand: optionalString,
    colStoreName: optionalString,
    colDeliveryPlace: optionalString,
    colAddressRaw: optionalString,
    colCity: optionalString,
    colState: optionalString,
    colMall: optionalString,
    colCNPJ: optionalString,
    colPhone: optionalString,
    colEmail: optionalString,
    colPrice20L: optionalString,
    colPrice10L: optionalString,
    colPrice1500: optionalString,
    colPriceCopo: optionalString,
    colPriceVasilhame: optionalString,
  })
  .superRefine((value, ctx) => {
    if (!value.colPartner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colPartner'],
        message: 'Selecione a coluna do parceiro',
      })
    }
    if (!value.colBrand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colBrand'],
        message: 'Selecione a coluna da marca',
      })
    }
    if (!value.colStoreName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colStoreName'],
        message: 'Selecione a coluna do nome da loja',
      })
    }
    if (!value.colDeliveryPlace) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colDeliveryPlace'],
        message: 'Selecione a coluna do local de entrega',
      })
    }
  })

export const storeImportSchema = z
  .object({
    allowCreateBrand: z.boolean().optional().default(false),
    mapping: storeImportMappingSchema,
  })
  .strict()
