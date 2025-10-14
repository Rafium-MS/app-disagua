import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import type { Request, Response } from 'express'
import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { z } from 'zod'

import { requireRole } from '../middleware/auth/require-role'
import { prisma } from '../prisma'
import {
  storeSchema,
  storeUpdateSchema,
  storeImportSchema,
  storeImportMappingSchema,
  productEnum,
  storePriceSchema,
} from '../schemas/store'

import { normalizeName, parseBrazilAddress, brlToCents } from '@shared/store-utils'

const upload = multer({ storage: multer.memoryStorage() })

const listSchema = z
  .object({
    partnerId: z.string().trim().optional(),
    brandId: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    mall: z.string().trim().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    q: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

const storeInclude = {
  prices: true,
  brand: { select: { id: true, name: true } },
  partner: { select: { id: true, name: true } },
} satisfies Prisma.StoreInclude

const P2002 = 'P2002'
const UNIQUE_CONTEXT_KEY = 'Store_brandId_normalizedName_city_mall_key'

function parsePartnerId(partnerId: string): number {
  const parsed = Number(partnerId)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Identificador de parceiro inválido')
  }
  return parsed
}

function getNormalizedName(name: string): string {
  return normalizeName(name)
}

type StorePriceInput = z.infer<typeof storePriceSchema>

type StorePayload = z.infer<typeof storeSchema>

type StoreUpdatePayload = z.infer<typeof storeUpdateSchema>

async function replacePrices(prisma: PrismaClient, storeId: string, prices: StorePriceInput[] | undefined) {
  await prisma.storePrice.deleteMany({ where: { storeId } })

  if (!prices?.length) {
    return
  }

  const data = prices
    .map(({ product, unitValueBRL }) => {
      const cents = brlToCents(unitValueBRL)
      if (cents == null || Number.isNaN(cents)) {
        return null
      }
      return { product, unitCents: cents }
    })
    .filter((value): value is { product: z.infer<typeof productEnum>; unitCents: number } => value !== null)

  if (!data.length) {
    return
  }

  await prisma.storePrice.createMany({
    data: data.map((entry) => ({ ...entry, storeId })),
    skipDuplicates: true,
  })
}

function applyAddressParsing(payload: StorePayload | StoreUpdatePayload) {
  if (!payload.addressRaw) {
    return payload
  }

  const parsed = parseBrazilAddress(payload.addressRaw)
  return {
    ...payload,
    street: payload.street ?? parsed.street ?? null,
    number: payload.number ?? parsed.number ?? null,
    complement: payload.complement ?? parsed.complement ?? null,
    district: payload.district ?? parsed.district ?? null,
    city: payload.city ?? parsed.city ?? null,
    state: payload.state ?? parsed.state ?? null,
    postalCode: payload.postalCode ?? parsed.postalCode ?? null,
  }
}

function buildStoreData(payload: StorePayload | StoreUpdatePayload) {
  const withAddress = applyAddressParsing(payload)
  return {
    partnerId: withAddress.partnerId ? parsePartnerId(withAddress.partnerId) : undefined,
    brandId: withAddress.brandId,
    name: withAddress.name,
    normalizedName: withAddress.name ? getNormalizedName(withAddress.name) : undefined,
    deliveryPlace: withAddress.deliveryPlace,
    addressRaw: withAddress.addressRaw?.trim() ?? null,
    street: withAddress.street?.trim() ?? null,
    number: withAddress.number?.trim() ?? null,
    complement: withAddress.complement?.trim() ?? null,
    district: withAddress.district?.trim() ?? null,
    city: withAddress.city?.trim() ?? null,
    state: withAddress.state ? withAddress.state.toUpperCase() : null,
    postalCode: withAddress.postalCode?.trim() ?? null,
    mall: withAddress.mall?.trim() ?? null,
    cnpj: withAddress.cnpj?.trim() ?? null,
    phone: withAddress.phone?.trim() ?? null,
    email: withAddress.email?.trim() ?? null,
    status: withAddress.status,
  }
}

function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === P2002
}

function mapUniqueError(error: Prisma.PrismaClientKnownRequestError) {
  if (!error.meta?.target) {
    return 'Já existe loja com estes dados'
  }
  const target = error.meta.target
  if (typeof target === 'string' && target.includes(UNIQUE_CONTEXT_KEY)) {
    return 'Já existe loja com este nome nesta marca/cidade/mall'
  }
  if (Array.isArray(target) && target.join('_').includes('cnpj')) {
    return 'Já existe loja com este CNPJ'
  }
  return 'Registro duplicado'
}

const createStoresRouter = ({ prisma }: { prisma: PrismaClient }) => {
  const router = Router()

  router.use(requireRole('OPERADOR', 'SUPERVISOR', 'ADMIN'))

  router.get('/', async (req, res) => {
    try {
      const { partnerId, brandId, city, state, mall, status, q, page, size } = listSchema.parse(req.query)

      const where: Prisma.StoreWhereInput = {
        ...(partnerId ? { partnerId: parsePartnerId(partnerId) } : {}),
        ...(brandId ? { brandId } : {}),
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        ...(state ? { state: { equals: state.toUpperCase() } } : {}),
        ...(mall ? { mall: { contains: mall, mode: 'insensitive' } } : {}),
        ...(status ? { status } : {}),
      }

      if (q) {
        const normalized = getNormalizedName(q)
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { normalizedName: { contains: normalized } },
          { city: { contains: q, mode: 'insensitive' } },
          { mall: { contains: q, mode: 'insensitive' } },
        ]
      }

      const skip = (page - 1) * size

      const [items, total] = await prisma.$transaction([
        prisma.store.findMany({
          where,
          include: storeInclude,
          orderBy: { name: 'asc' },
          skip,
          take: size,
        }),
        prisma.store.count({ where }),
      ])

      res.json({
        data: items,
        pagination: {
          page,
          size,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / size),
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Parâmetros inválidos', details: error.flatten().fieldErrors })
        return
      }
      if (error instanceof Error && error.message.includes('parceiro')) {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Erro ao listar lojas', error)
      res.status(500).json({ error: 'Não foi possível listar as lojas' })
    }
  })

  router.post('/', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const payload = storeSchema.parse(req.body)
      const data = buildStoreData(payload)

      if (!data.partnerId) {
        throw new Error('Parceiro obrigatório')
      }

      const created = await prisma.store.create({
        data: {
          partnerId: data.partnerId,
          brandId: data.brandId,
          name: payload.name,
          normalizedName: getNormalizedName(payload.name),
          deliveryPlace: payload.deliveryPlace,
          addressRaw: data.addressRaw,
          street: data.street,
          number: data.number,
          complement: data.complement,
          district: data.district,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          mall: data.mall,
          cnpj: data.cnpj,
          phone: data.phone,
          email: data.email,
          status: data.status ?? 'ACTIVE',
        },
        include: storeInclude,
      })

      await replacePrices(prisma, created.id, payload.prices)

      const reloaded = await prisma.store.findUnique({
        where: { id: created.id },
        include: storeInclude,
      })

      res.status(201).json(reloaded)
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Dados inválidos', details: error.flatten().fieldErrors })
        return
      }
      if (error instanceof Error && error.message.includes('Parceiro obrigatório')) {
        res.status(400).json({ error: error.message })
        return
      }
      if (error instanceof Error && error.message.includes('parceiro')) {
        res.status(400).json({ error: error.message })
        return
      }
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: mapUniqueError(error) })
        return
      }
      console.error('Erro ao criar loja', error)
      res.status(500).json({ error: 'Não foi possível criar a loja' })
    }
  })

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params
      const store = await prisma.store.findUnique({ where: { id }, include: storeInclude })
      if (!store) {
        res.status(404).json({ error: 'Loja não encontrada' })
        return
      }
      res.json(store)
    } catch (error) {
      console.error('Erro ao carregar loja', error)
      res.status(500).json({ error: 'Não foi possível carregar a loja' })
    }
  })

  router.patch('/:id', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const payload = storeUpdateSchema.parse(req.body)
      const { id } = req.params

      const data = buildStoreData(payload)

      const updateData: Prisma.StoreUpdateInput = {
        ...(payload.partnerId ? { partnerId: data.partnerId } : {}),
        ...(payload.brandId ? { brandId: payload.brandId } : {}),
        ...(payload.name
          ? {
              name: payload.name,
              normalizedName: getNormalizedName(payload.name),
            }
          : {}),
        ...(payload.deliveryPlace ? { deliveryPlace: payload.deliveryPlace } : {}),
        addressRaw: data.addressRaw,
        street: data.street,
        number: data.number,
        complement: data.complement,
        district: data.district,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        mall: data.mall,
        cnpj: data.cnpj,
        phone: data.phone,
        email: data.email,
        ...(payload.status ? { status: payload.status } : {}),
      }

      const updated = await prisma.store.update({
        where: { id },
        data: updateData,
        include: storeInclude,
      })

      await replacePrices(prisma, id, payload.prices)

      const reloaded = await prisma.store.findUnique({ where: { id }, include: storeInclude })

      res.json(reloaded ?? updated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Dados inválidos', details: error.flatten().fieldErrors })
        return
      }
      if (error instanceof Error && error.message.includes('parceiro')) {
        res.status(400).json({ error: error.message })
        return
      }
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: mapUniqueError(error) })
        return
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ error: 'Loja não encontrada' })
        return
      }
      console.error('Erro ao atualizar loja', error)
      res.status(500).json({ error: 'Não foi possível atualizar a loja' })
    }
  })

  router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
    try {
      const { id } = req.params
      await prisma.store.delete({ where: { id } })
      res.status(204).end()
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ error: 'Loja não encontrada' })
        return
      }
      console.error('Erro ao remover loja', error)
      res.status(500).json({ error: 'Não foi possível remover a loja' })
    }
  })

  router.post('/import', requireRole('SUPERVISOR', 'ADMIN'), upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Arquivo XLSX obrigatório' })
        return
      }

      const mappingInput = parseMapping(req)
      const { mapping, allowCreateBrand } = storeImportSchema.parse(mappingInput)

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null })

      let created = 0
      let updated = 0
      let skipped = 0
      const conflicts: Array<{ row: number; reason: string }> = []

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]
        try {
          const processed = await processImportRow({
            row,
            mapping,
            allowCreateBrand,
            prisma,
          })

          if (processed === 'created') {
            created += 1
          } else if (processed === 'updated') {
            updated += 1
          } else if (processed === 'skipped') {
            skipped += 1
          }
        } catch (error) {
          conflicts.push({ row: index + 2, reason: error instanceof Error ? error.message : 'Erro desconhecido' })
        }
      }

      res.json({ created, updated, skipped, conflicts })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Mapeamento inválido', details: error.flatten().fieldErrors })
        return
      }
      console.error('Erro ao importar lojas', error)
      res.status(500).json({ error: 'Não foi possível processar a importação' })
    }
  })

  return router
}

type ImportContext = {
  row: Record<string, unknown>
  mapping: z.infer<typeof storeImportMappingSchema>
  allowCreateBrand?: boolean
  prisma: PrismaClient
}

async function processImportRow({ row, mapping, allowCreateBrand, prisma }: ImportContext) {
  const partnerIdValue = getCell(row, mapping.colPartner)
  const brandValue = getCell(row, mapping.colBrand)
  const storeName = getCell(row, mapping.colStoreName)
  const deliveryPlace = getCell(row, mapping.colDeliveryPlace)

  if (!partnerIdValue || !brandValue || !storeName || !deliveryPlace) {
    return 'skipped' as const
  }

  const partnerId = parsePartnerId(String(partnerIdValue))
  const brandName = String(brandValue).trim()
  const name = String(storeName).trim()
  const normalizedName = getNormalizedName(name)

  const brand = await ensureBrand(prisma, partnerId, brandName, allowCreateBrand)
  if (!brand) {
    throw new Error('Marca não encontrada para o parceiro informado')
  }

  const deliveryText = String(deliveryPlace).trim()
  if (!deliveryText) {
    throw new Error('Local de entrega obrigatório')
  }

  const city = optionalCell(row, mapping.colCity)
  const state = optionalCell(row, mapping.colState)?.toUpperCase()
  const mall = optionalCell(row, mapping.colMall)
  const cnpj = optionalCell(row, mapping.colCNPJ)
  const phone = optionalCell(row, mapping.colPhone)
  const email = optionalCell(row, mapping.colEmail)

  const addressRaw = optionalCell(row, mapping.colAddressRaw)
  const parsedAddress = addressRaw ? parseBrazilAddress(addressRaw) : {}

  const existing = await prisma.store.findFirst({
    where: {
      brandId: brand.id,
      normalizedName,
      city: city ?? null,
      mall: mall ?? null,
    },
    include: storeInclude,
  })

  const prices = buildPricePayload(row, mapping)

  if (existing) {
    await prisma.store.update({
      where: { id: existing.id },
      data: {
        deliveryPlace: deliveryText,
        addressRaw: addressRaw ?? null,
        street: parsedAddress.street ?? existing.street,
        number: parsedAddress.number ?? existing.number,
        complement: parsedAddress.complement ?? existing.complement,
        district: parsedAddress.district ?? existing.district,
        city: city ?? parsedAddress.city ?? existing.city,
        state: state ?? parsedAddress.state ?? existing.state,
        postalCode: parsedAddress.postalCode ?? existing.postalCode,
        mall: mall ?? existing.mall,
        cnpj: cnpj ?? existing.cnpj,
        phone: phone ?? existing.phone,
        email: email ?? existing.email,
      },
    })

    await replacePrices(prisma, existing.id, prices)
    return 'updated' as const
  }

  const created = await prisma.store.create({
    data: {
      partnerId,
      brandId: brand.id,
      name,
      normalizedName,
      deliveryPlace: deliveryText,
      addressRaw: addressRaw ?? null,
      street: parsedAddress.street ?? null,
      number: parsedAddress.number ?? null,
      complement: parsedAddress.complement ?? null,
      district: parsedAddress.district ?? null,
      city: city ?? parsedAddress.city ?? null,
      state: state ?? parsedAddress.state ?? null,
      postalCode: parsedAddress.postalCode ?? null,
      mall: mall ?? null,
      cnpj: cnpj ?? null,
      phone: phone ?? null,
      email: email ?? null,
      status: 'ACTIVE',
    },
  })

  await replacePrices(prisma, created.id, prices)
  return 'created' as const
}

async function ensureBrand(
  prisma: PrismaClient,
  partnerId: number,
  brandName: string,
  allowCreateBrand?: boolean,
) {
  const existing = await prisma.brand.findFirst({
    where: {
      partnerId,
      name: brandName,
    },
  })

  if (existing) {
    return existing
  }

  if (!allowCreateBrand) {
    return null
  }

  return prisma.brand.create({
    data: {
      partnerId,
      name: brandName,
    },
  })
}

function parseMapping(req: Request) {
  const rawMapping = req.body.mapping ?? req.body
  if (typeof rawMapping === 'string') {
    return JSON.parse(rawMapping)
  }
  return rawMapping
}

function getCell(row: Record<string, unknown>, column?: string | null | undefined) {
  if (!column) {
    return undefined
  }
  return row[column]
}

function optionalCell(row: Record<string, unknown>, column?: string | null | undefined) {
  const cell = getCell(row, column)
  if (cell == null) {
    return undefined
  }
  const value = String(cell).trim()
  return value.length ? value : undefined
}

function buildPricePayload(row: Record<string, unknown>, mapping: z.infer<typeof storeImportMappingSchema>) {
  const priceEntries: { product: z.infer<typeof productEnum>; unitValueBRL?: string }[] = []

  const productColumns: Array<[z.infer<typeof productEnum>, string | undefined | null]> = [
    ['GALAO_20L', mapping.colPrice20L],
    ['GALAO_10L', mapping.colPrice10L],
    ['PET_1500ML', mapping.colPrice1500],
    ['CAIXA_COPO', mapping.colPriceCopo],
    ['VASILHAME', mapping.colPriceVasilhame],
  ]

  for (const [product, column] of productColumns) {
    const value = optionalCell(row, column ?? undefined)
    if (value) {
      priceEntries.push({ product, unitValueBRL: value })
    }
  }

  if (!priceEntries.length) {
    const fallback = optionalCell(row, mapping.colPrice20L)
    if (fallback) {
      priceEntries.push({ product: 'GALAO_20L', unitValueBRL: fallback })
    }
  }

  return priceEntries
}

const storesRouter = createStoresRouter({ prisma })

export { createStoresRouter, storesRouter }
