import type { Prisma, PrismaClient, Store, StorePrice } from '@prisma/client'
import type { Response } from 'express'
import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { z } from 'zod'

import { normalizeName, parseBrazilAddress, brlToCents } from '@shared/store-utils'

import { prisma } from '../prisma'
import {
  productEnum,
  storeCreateSchema,
  storeUpdateSchema,
  storeImportSchema,
  storeImportMappingSchema,
} from '../schemas/store'

const productValues = productEnum.options

type ProductValue = z.infer<typeof productEnum>

type PricePayload = { product: ProductValue; unitCents: number }

const upload = multer({ storage: multer.memoryStorage() })

const storeDefaultInclude = {
  prices: true,
  brand: { select: { id: true, name: true, code: true } },
  partner: { select: { id: true, name: true } },
} satisfies Prisma.StoreInclude

type StoreWithRelations = Prisma.StoreGetPayload<{ include: typeof storeDefaultInclude }>

const cuidRegex = /^c[a-z0-9]{24}$/i

const listSchema = z
  .object({
    partnerId: z.coerce.number().int().positive().optional(),
    brandId: z
      .string()
      .trim()
      .regex(cuidRegex, 'Identificador de marca inválido')
      .optional(),
    q: z
      .string()
      .trim()
      .transform((value) => (value.length ? value : undefined))
      .optional(),
    city: z
      .string()
      .trim()
      .transform((value) => (value.length ? value : undefined))
      .optional(),
    state: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .optional(),
    mall: z
      .string()
      .trim()
      .transform((value) => (value.length ? value : undefined))
      .optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

const detectSchema = z
  .object({
    partnerId: z.coerce.number().int().positive().optional(),
    includeInactive: z.boolean().optional().default(false),
  })
  .strict()

const mergeSchema = z
  .object({
    targetId: z.string().regex(cuidRegex, 'Loja alvo inválida'),
    sourceIds: z.array(z.string().regex(cuidRegex, 'Loja de origem inválida')).min(1),
    fieldsStrategy: z.enum(['target', 'source', 'mostRecent']).default('target'),
  })
  .strict()

const createStoresRouter = ({ prisma }: { prisma: PrismaClient }) => {
const router = Router()

  router.get('/', async (req, res) => {
    try {
      const { partnerId, brandId, q, city, state, mall, status, page, pageSize } = listSchema.parse(
        req.query,
      )

      const where: Prisma.StoreWhereInput = {
        ...(partnerId ? { partnerId } : {}),
        ...(brandId ? { brandId } : {}),
        ...(status ? { status } : {}),
        ...(city
          ? {
              city: { contains: city, mode: 'insensitive' },
            }
          : {}),
        ...(state ? { state } : {}),
        ...(mall
          ? {
              mall: { contains: mall, mode: 'insensitive' },
            }
          : {}),
      }

      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { normalizedName: { contains: q.toLowerCase() } },
          { city: { contains: q, mode: 'insensitive' } },
          { mall: { contains: q, mode: 'insensitive' } },
          { externalCode: { contains: q, mode: 'insensitive' } },
        ]
      }

      const skip = (page - 1) * pageSize
      const [items, total] = await prisma.$transaction([
        prisma.store.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take: pageSize,
          include: storeDefaultInclude,
        }),
        prisma.store.count({ where }),
      ])

      res.json({
        data: items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Parâmetros inválidos', details: error.flatten().fieldErrors })
        return
      }

      console.error('Erro ao listar lojas', error)
      res.status(500).json({ error: 'Não foi possível listar as lojas' })
    }
  })

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params
      const store = await prisma.store.findUnique({ where: { id }, include: storeDefaultInclude })
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

  router.post('/', async (req, res) => {
    try {
      const payload = storeCreateSchema.parse(req.body)

      const result = await createStore(prisma, payload)

      res.status(201).json(result)
    } catch (error) {
      handleStoreError(error, res)
    }
  })

  router.patch('/:id', async (req, res) => {
    try {
      const payload = storeUpdateSchema.parse(req.body)
      const { id } = req.params

      const result = await updateStore(prisma, id, payload)

      res.json(result)
    } catch (error) {
      handleStoreError(error, res)
    }
  })

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params

      await prisma.store.delete({ where: { id } })

      res.status(204).end()
    } catch (error) {
      if (isNotFound(error)) {
        res.status(404).json({ error: 'Loja não encontrada' })
        return
      }

      console.error('Erro ao remover loja', error)
      res.status(500).json({ error: 'Não foi possível remover a loja' })
    }
  })

  router.post('/import', upload.single('file'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Envie o arquivo XLSX no campo "file"' })
      return
    }

    try {
      const config = parseImportConfig(req.body)
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })

      const summary = await importStores(prisma, rows, config)

      res.json(summary)
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Configuração inválida', details: error.flatten().fieldErrors })
        return
      }

      console.error('Erro ao importar lojas', error)
      res.status(500).json({ error: 'Não foi possível importar as lojas' })
    }
  })

  router.post('/detect-duplicates', async (req, res) => {
    try {
      const { partnerId, includeInactive } = detectSchema.parse(req.body ?? {})

      const where: Prisma.StoreWhereInput = {
        ...(partnerId ? { partnerId } : {}),
        ...(includeInactive ? {} : { status: 'ACTIVE' }),
      }

      const stores = await prisma.store.findMany({
        where,
        include: storeDefaultInclude,
      })

      const duplicates = detectDuplicates(stores)

      res.json({ data: duplicates })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Parâmetros inválidos', details: error.flatten().fieldErrors })
        return
      }

      console.error('Erro ao detectar duplicidades', error)
      res.status(500).json({ error: 'Não foi possível analisar duplicidades' })
    }
  })

  router.post('/merge', async (req, res) => {
    try {
      const { targetId, sourceIds, fieldsStrategy } = mergeSchema.parse(req.body)

      const merged = await mergeStores(prisma, {
        targetId,
        sourceIds,
        strategy: fieldsStrategy,
      })

      res.json({ data: merged })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Dados inválidos', details: error.flatten().fieldErrors })
        return
      }

      if (error instanceof MergeConflictError) {
        res.status(409).json({ error: error.message })
        return
      }

      handleStoreError(error, res)
    }
  })

  return router
}

async function createStore(prisma: PrismaClient, payload: z.infer<typeof storeCreateSchema>) {
  const partnerId = payload.partnerId
  const brandId = await resolveBrand(prisma, partnerId, payload.brandId, payload.createBrand)
  const normalized = normalizeName(payload.name)
  const addressParts = parseBrazilAddress(payload.addressRaw)
  const prices = mapPrices(payload.prices ?? [])

  return prisma.store.create({
    data: {
      partnerId,
      brandId,
      name: payload.name.trim(),
      normalizedName: normalized,
      externalCode: sanitize(payload.externalCode),
      cnpj: sanitize(payload.cnpj),
      phone: sanitize(payload.phone),
      email: sanitize(payload.email),
      mall: sanitize(payload.mall),
      addressRaw: payload.addressRaw.trim(),
      street: coalesce(payload.street, addressParts.street),
      number: coalesce(payload.number, addressParts.number),
      complement: coalesce(payload.complement, addressParts.complement),
      district: coalesce(payload.district, addressParts.district),
      city: payload.city.trim(),
      state: payload.state.trim().toUpperCase(),
      postalCode: coalesce(payload.postalCode, addressParts.postalCode),
      status: payload.status,
      prices: prices.length ? { create: prices } : undefined,
    },
    include: storeDefaultInclude,
  })
}

async function updateStore(prisma: PrismaClient, id: string, payload: z.infer<typeof storeUpdateSchema>) {
  const current = await prisma.store.findUnique({ where: { id } })

  if (!current) {
    throw new StoreNotFoundError()
  }

  const partnerId = payload.partnerId ?? current.partnerId
  const brandId = await resolveBrand(prisma, partnerId, payload.brandId, payload.createBrand)
  const normalized = normalizeName(payload.name)
  const addressParts = parseBrazilAddress(payload.addressRaw)
  const prices = mapPrices(payload.prices ?? [])

  return prisma.$transaction(async (tx) => {
    await tx.store.update({
      where: { id },
      data: {
        partnerId,
        brandId,
        name: payload.name.trim(),
        normalizedName: normalized,
        externalCode: sanitize(payload.externalCode),
        cnpj: sanitize(payload.cnpj),
        phone: sanitize(payload.phone),
        email: sanitize(payload.email),
        mall: sanitize(payload.mall),
        addressRaw: payload.addressRaw.trim(),
        street: coalesce(payload.street, addressParts.street),
        number: coalesce(payload.number, addressParts.number),
        complement: coalesce(payload.complement, addressParts.complement),
        district: coalesce(payload.district, addressParts.district),
        city: payload.city.trim(),
        state: payload.state.trim().toUpperCase(),
        postalCode: coalesce(payload.postalCode, addressParts.postalCode),
        status: payload.status,
      },
    })

    await tx.storePrice.deleteMany({ where: { storeId: id } })

    if (prices.length) {
      await tx.storePrice.createMany({
        data: prices.map((price) => ({ storeId: id, ...price })),
      })
    }

    const updated = await tx.store.findUnique({ where: { id }, include: storeDefaultInclude })
    if (!updated) {
      throw new StoreNotFoundError()
    }
    return updated
  })
}

async function resolveBrand(
  prisma: PrismaClient,
  partnerId: number,
  brandId?: string | null,
  createBrand?: { name: string; code?: string | null },
) {
  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } })
    if (!brand) {
      throw new StoreValidationError('Marca informada não foi encontrada')
    }
    if (brand.partnerId !== partnerId) {
      throw new StoreValidationError('A marca selecionada pertence a outro parceiro')
    }
    return brand.id
  }

  if (!createBrand) {
    return null
  }

  const brand = await prisma.brand.upsert({
    where: {
      partnerId_name: {
        partnerId,
        name: createBrand.name.trim(),
      },
    },
    update: {
      code: sanitize(createBrand.code),
    },
    create: {
      partnerId,
      name: createBrand.name.trim(),
      code: sanitize(createBrand.code),
    },
  })

  return brand.id
}

function mapPrices(prices: Array<{ product?: ProductValue | null; unitValueBRL?: string | null }>): PricePayload[] {
  return prices
    .filter((price) => price?.product && productValues.includes(price.product))
    .map((price) => {
      const cents = brlToCents(price.unitValueBRL)
      if (cents == null) return null
      return { product: price.product as ProductValue, unitCents: cents }
    })
    .filter((value): value is PricePayload => value !== null)
}

function sanitize(value?: string | null): string | null {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function coalesce<T>(primary: T | null | undefined, fallback: T | null | undefined): T | null {
  if (primary != null && primary !== '') {
    return primary
  }
  return fallback ?? null
}

function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function isNotFound(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

function uniqueConstraintMessage(error: Prisma.PrismaClientKnownRequestError) {
  const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(',') : error.meta?.target
  if (typeof target === 'string' && target.includes('partnerId_brandId_normalizedName_city_mall')) {
    return 'Já existe uma loja com este nome, cidade e shopping para o parceiro/marca informados.'
  }
  if (typeof target === 'string' && target.includes('Store_externalCode_key')) {
    return 'O código externo informado já está vinculado a outra loja.'
  }
  if (typeof target === 'string' && target.includes('Store_cnpj_key')) {
    return 'O CNPJ informado já está vinculado a outra loja.'
  }
  return 'Não foi possível salvar a loja porque os dados informados já estão em uso.'
}

function handleStoreError(error: unknown, res: Response) {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Dados inválidos', details: error.flatten().fieldErrors })
    return
  }

  if (error instanceof StoreValidationError) {
    res.status(400).json({ error: error.message })
    return
  }

  if (error instanceof StoreNotFoundError) {
    res.status(404).json({ error: 'Loja não encontrada' })
    return
  }

  if (isNotFound(error)) {
    res.status(404).json({ error: 'Loja não encontrada' })
    return
  }

  if (isUniqueViolation(error)) {
    res.status(409).json({ error: uniqueConstraintMessage(error) })
    return
  }

  console.error('Erro de loja', error)
  res.status(500).json({ error: 'Erro inesperado ao processar a loja' })
}

function parseImportConfig(body: Record<string, unknown>) {
  if (body?.mapping) {
    const mappingValue = typeof body.mapping === 'string' ? JSON.parse(body.mapping) : body.mapping
    return storeImportSchema.parse({
      mapping: mappingValue,
      allowCreateBrand: parseBoolean(body.allowCreateBrand),
    })
  }

  const mappingInput: Record<string, unknown> = {}
  for (const key of Object.keys(storeImportMappingSchema.shape)) {
    if (key in body) {
      mappingInput[key] = body[key]
    }
  }

  return storeImportSchema.parse({
    mapping: mappingInput,
    allowCreateBrand: parseBoolean(body.allowCreateBrand),
  })
}

function parseBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }
  return false
}

type ImportConfig = z.infer<typeof storeImportSchema>

async function importStores(
  prisma: PrismaClient,
  rows: Record<string, unknown>[],
  config: ImportConfig,
) {
  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    conflicts: [] as Array<{ row: number; reason: string }>,
  }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2
    try {
      const partnerRaw = getCell(row, config.mapping.colPartner)
      const storeNameRaw = getCell(row, config.mapping.colStoreName)
      const cityRaw = getCell(row, config.mapping.colCity)
      const stateRaw = getCell(row, config.mapping.colState)

      if (!partnerRaw || !storeNameRaw || !cityRaw || !stateRaw) {
        summary.skipped += 1
        summary.conflicts.push({ row: rowNumber, reason: 'Linha incompleta (parceiro, nome, cidade ou UF ausentes)' })
        continue
      }

      const partner = await resolvePartner(prisma, partnerRaw)
      if (!partner) {
        summary.skipped += 1
        summary.conflicts.push({ row: rowNumber, reason: `Parceiro "${partnerRaw}" não encontrado` })
        continue
      }

      const brandName = getCell(row, config.mapping.colBrand)
      const brandId = await resolveBrandForImport(prisma, partner.id, brandName, config.allowCreateBrand)

      const payload = buildStorePayloadFromRow(row, {
        partnerId: partner.id,
        brandId,
        name: storeNameRaw,
        city: cityRaw,
        state: stateRaw,
        mapping: config.mapping,
      })

      const result = await upsertStore(prisma, payload)
      if (result === 'created') {
        summary.created += 1
      } else if (result === 'updated') {
        summary.updated += 1
      } else {
        summary.skipped += 1
      }
    } catch (error) {
      const reason =
        error instanceof Prisma.PrismaClientKnownRequestError && isUniqueViolation(error)
          ? uniqueConstraintMessage(error)
          : error instanceof Error
            ? error.message
            : 'Erro desconhecido'
      summary.skipped += 1
      summary.conflicts.push({ row: rowNumber, reason })
    }
  }

  return summary
}

async function resolvePartner(prisma: PrismaClient, value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return null

  const numeric = Number(text)
  if (Number.isInteger(numeric)) {
    const partner = await prisma.partner.findUnique({ where: { id: numeric } })
    if (partner) return partner
  }

  const digits = text.replace(/\D/g, '')
  if (digits.length >= 11) {
    const partner = await prisma.partner.findUnique({ where: { document: digits } })
    if (partner) return partner
  }

  return prisma.partner.findFirst({
    where: {
      name: { equals: text, mode: 'insensitive' },
    },
  })
}

async function resolveBrandForImport(
  prisma: PrismaClient,
  partnerId: number,
  brandName: unknown,
  allowCreateBrand: boolean,
) {
  const name = typeof brandName === 'string' ? brandName.trim() : ''
  if (!name) {
    return null
  }

  const existing = await prisma.brand.findFirst({
    where: {
      partnerId,
      name: { equals: name, mode: 'insensitive' },
    },
  })

  if (existing) {
    return existing.id
  }

  if (!allowCreateBrand) {
    throw new Error(`Marca "${name}" não encontrada para o parceiro`)
  }

  const created = await prisma.brand.create({
    data: {
      partnerId,
      name,
    },
  })

  return created.id
}

type ImportPayload = {
  partnerId: number
  brandId: string | null
  name: string
  city: string
  state: string
  mapping: z.infer<typeof storeImportMappingSchema>
}

function buildStorePayloadFromRow(row: Record<string, unknown>, context: ImportPayload) {
  const addressRaw = getCell(row, context.mapping.colAddress) ?? ''
  const mall = getCell(row, context.mapping.colMall)
  const cnpj = getCell(row, context.mapping.colCNPJ)
  const phone = getCell(row, context.mapping.colPhone)
  const email = getCell(row, context.mapping.colEmail)
  const externalCode = getCell(row, context.mapping.colExternalCode)

  const prices = [
    { product: 'GALAO_20L' as ProductValue, raw: getCell(row, context.mapping.colValue20L) },
    { product: 'GALAO_10L' as ProductValue, raw: getCell(row, context.mapping.colValue10L) },
    { product: 'PET_1500ML' as ProductValue, raw: getCell(row, context.mapping.colValue1500) },
    { product: 'CAIXA_COPO' as ProductValue, raw: getCell(row, context.mapping.colValueCopo) },
    { product: 'VASILHAME' as ProductValue, raw: getCell(row, context.mapping.colValueVasilhame) },
  ]

  return {
    partnerId: context.partnerId,
    brandId: context.brandId,
    name: String(context.name).trim(),
    city: String(context.city).trim(),
    state: String(context.state).trim().toUpperCase(),
    mall: mall ? String(mall).trim() : null,
    addressRaw: String(addressRaw ?? '').trim(),
    cnpj: cnpj ? String(cnpj).trim() : null,
    phone: phone ? String(phone).trim() : null,
    email: email ? String(email).trim() : null,
    externalCode: externalCode ? String(externalCode).trim() : null,
    prices: prices
      .map((entry) => ({ product: entry.product, unitValueBRL: entry.raw ? String(entry.raw) : null }))
      .filter((entry) => entry.unitValueBRL != null),
  }
}

async function upsertStore(
  prisma: PrismaClient,
  payload: ReturnType<typeof buildStorePayloadFromRow>,
): Promise<'created' | 'updated' | 'skipped'> {
  const normalized = normalizeName(payload.name)

  const where = {
    partnerId_brandId_normalizedName_city_mall: {
      partnerId: payload.partnerId,
      brandId: payload.brandId,
      normalizedName: normalized,
      city: payload.city,
      mall: payload.mall ?? null,
    },
  }

  const existing = await prisma.store.findUnique({ where, include: { prices: true } })
  const prices = mapPrices(payload.prices)
  const addressParts = parseBrazilAddress(payload.addressRaw)

  if (!existing) {
    await prisma.store.create({
      data: {
        partnerId: payload.partnerId,
        brandId: payload.brandId,
        name: payload.name,
        normalizedName: normalized,
        city: payload.city,
        state: payload.state,
        mall: payload.mall,
        addressRaw: payload.addressRaw,
        cnpj: payload.cnpj,
        phone: payload.phone,
        email: payload.email,
        externalCode: payload.externalCode,
        street: addressParts.street ?? null,
        number: addressParts.number ?? null,
        complement: addressParts.complement ?? null,
        district: addressParts.district ?? null,
        postalCode: addressParts.postalCode ?? null,
        prices: prices.length ? { create: prices } : undefined,
      },
    })

    return 'created'
  }

  await prisma.$transaction(async (tx) => {
    await tx.store.update({
      where: { id: existing.id },
      data: {
        partnerId: payload.partnerId,
        brandId: payload.brandId,
        name: payload.name,
        normalizedName: normalized,
        city: payload.city,
        state: payload.state,
        mall: payload.mall,
        addressRaw: payload.addressRaw,
        cnpj: payload.cnpj,
        phone: payload.phone,
        email: payload.email,
        externalCode: payload.externalCode,
        street: addressParts.street ?? existing.street,
        number: addressParts.number ?? existing.number,
        complement: addressParts.complement ?? existing.complement,
        district: addressParts.district ?? existing.district,
        postalCode: addressParts.postalCode ?? existing.postalCode,
      },
    })

    await tx.storePrice.deleteMany({ where: { storeId: existing.id } })

    if (prices.length) {
      await tx.storePrice.createMany({
        data: prices.map((price) => ({ storeId: existing.id, ...price })),
      })
    }
  })

  return 'updated'
}

function getCell(row: Record<string, unknown>, column?: string | null) {
  if (!column) return null
  const value = row[column]
  if (value == null) return null
  return typeof value === 'string' ? value.trim() : String(value)
}

type DuplicateGroup = {
  id: string
  reason: 'NAME_CITY' | 'CNPJ'
  score: number
  stores: StoreWithRelations[]
}

function detectDuplicates(stores: StoreWithRelations[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  const seen = new Set<string>()

  const byCnpj = new Map<string, StoreWithRelations[]>()
  const byNameCity = new Map<string, StoreWithRelations[]>()

  for (const store of stores) {
    if (store.cnpj) {
      const cleaned = store.cnpj.replace(/\D/g, '')
      if (!byCnpj.has(cleaned)) {
        byCnpj.set(cleaned, [])
      }
      byCnpj.get(cleaned)!.push(store)
    }

    const key = `${store.partnerId}:${store.normalizedName}:${store.city.toLowerCase()}`
    if (!byNameCity.has(key)) {
      byNameCity.set(key, [])
    }
    byNameCity.get(key)!.push(store)
  }

  for (const [cnpj, entries] of byCnpj.entries()) {
    if (entries.length < 2) continue
    const ids = entries.map((entry) => entry.id).sort().join(':')
    if (seen.has(ids)) continue
    seen.add(ids)
    groups.push({
      id: `cnpj-${cnpj}`,
      reason: 'CNPJ',
      score: 1,
      stores: sortStores(entries),
    })
  }

  for (const [key, entries] of byNameCity.entries()) {
    if (entries.length < 2) continue

    const filtered = groupByMall(entries)
    for (const candidate of filtered) {
      if (candidate.length < 2) continue
      const ids = candidate.map((entry) => entry.id).sort().join(':')
      if (seen.has(ids)) continue
      seen.add(ids)
      groups.push({
        id: `name-${key}-${ids}`,
        reason: 'NAME_CITY',
        score: 0.8,
        stores: sortStores(candidate),
      })
    }
  }

  return groups
}

function groupByMall(stores: StoreWithRelations[]) {
  const clusters: StoreWithRelations[][] = []
  const processed = new Set<string>()

  for (const store of stores) {
    if (processed.has(store.id)) continue
    const cluster = stores.filter((candidate) => {
      if (candidate.id === store.id) return true
      if (candidate.mall && store.mall) {
        return candidate.mall.toLowerCase() === store.mall.toLowerCase()
      }
      return !candidate.mall || !store.mall
    })
    for (const item of cluster) {
      processed.add(item.id)
    }
    clusters.push(cluster)
  }

  return clusters
}

function sortStores(stores: StoreWithRelations[]) {
  return [...stores].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

type MergeInput = {
  targetId: string
  sourceIds: string[]
  strategy: 'target' | 'source' | 'mostRecent'
}

class MergeConflictError extends Error {}

class StoreNotFoundError extends Error {}

class StoreValidationError extends Error {}

async function mergeStores(prisma: PrismaClient, input: MergeInput) {
  if (input.sourceIds.includes(input.targetId)) {
    throw new MergeConflictError('A loja alvo não pode fazer parte da lista de origem')
  }

  const allIds = [input.targetId, ...input.sourceIds]
  const stores = await prisma.store.findMany({
    where: { id: { in: allIds } },
    include: {
      prices: true,
      brand: true,
      partner: true,
      vouchers: { select: { id: true } },
    },
  })

  if (stores.length !== allIds.length) {
    throw new MergeConflictError('Não foi possível localizar todas as lojas informadas')
  }

  const target = stores.find((store) => store.id === input.targetId) as StoreWithMerge
  const sources = stores.filter((store) => input.sourceIds.includes(store.id)) as StoreWithMerge[]

  const order = resolveMergeOrder(target, sources, input.strategy)
  const merged = mergeStoreData(target, order)
  const mergedPrices = mergePrices(order)

  await prisma.$transaction(async (tx) => {
    await tx.store.update({
      where: { id: target.id },
      data: {
        name: merged.name,
        normalizedName: normalizeName(merged.name),
        partnerId: target.partnerId,
        brandId: merged.brandId,
        externalCode: merged.externalCode,
        cnpj: merged.cnpj,
        phone: merged.phone,
        email: merged.email,
        mall: merged.mall,
        addressRaw: merged.addressRaw,
        street: merged.street,
        number: merged.number,
        complement: merged.complement,
        district: merged.district,
        city: merged.city,
        state: merged.state,
        postalCode: merged.postalCode,
        status: merged.status,
      },
    })

    await tx.storePrice.deleteMany({ where: { storeId: target.id } })

    if (mergedPrices.length) {
      await tx.storePrice.createMany({
        data: mergedPrices.map((price) => ({ storeId: target.id, ...price })),
      })
    }

    if (sources.length) {
      await tx.voucher.updateMany({
        where: { storeId: { in: sources.map((store) => store.id) } },
        data: { storeId: target.id },
      })

      await tx.store.deleteMany({ where: { id: { in: sources.map((store) => store.id) } } })
    }
  })

  return prisma.store.findUnique({ where: { id: target.id }, include: storeDefaultInclude })
}

type StoreWithMerge = Store & {
  prices: StorePrice[]
  brandId: string | null
}

function resolveMergeOrder(target: StoreWithMerge, sources: StoreWithMerge[], strategy: MergeInput['strategy']) {
  switch (strategy) {
    case 'source':
      return [...sources, target]
    case 'mostRecent':
      return [...sources, target].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
    case 'target':
    default:
      return [target, ...sources]
  }
}

function mergeStoreData(target: StoreWithMerge, order: StoreWithMerge[]) {
  const fields: Array<keyof StoreWithMerge> = [
    'name',
    'brandId',
    'externalCode',
    'cnpj',
    'phone',
    'email',
    'mall',
    'addressRaw',
    'street',
    'number',
    'complement',
    'district',
    'city',
    'state',
    'postalCode',
    'status',
  ]

  const result: Partial<StoreWithMerge> = { ...target }

  for (const field of fields) {
    for (const store of order) {
      const value = store[field]
      if (value != null && value !== '') {
        result[field] = value
        break
      }
    }
  }

  result.name = result.name ?? target.name
  result.addressRaw = result.addressRaw ?? target.addressRaw
  result.city = result.city ?? target.city
  result.state = result.state ?? target.state
  result.status = result.status ?? target.status

  return result as StoreWithMerge
}

function mergePrices(order: StoreWithMerge[]): PricePayload[] {
  const map = new Map<ProductValue, number>()

  for (const store of order) {
    for (const price of store.prices) {
      if (!map.has(price.product as ProductValue)) {
        map.set(price.product as ProductValue, price.unitCents)
      }
    }
  }

  return Array.from(map.entries()).map(([product, unitCents]) => ({ product, unitCents }))
}

const storesRouter = createStoresRouter({ prisma })

export { createStoresRouter, storesRouter, MergeConflictError }
