import { Router } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma'
import { productEnum, storeSchema } from '../schemas/store'
import { brlToCents } from '../utils/money'

const storesRouter = Router()

const productValues = productEnum.options

const productSet = new Set(productValues)

type ProductValue = z.infer<typeof productEnum>

type PricePayload = { product: ProductValue; unitCents: number }

function mapPrices(prices: Array<{ product?: ProductValue | null; unitValueBRL?: string | null }>): PricePayload[] {
  return prices
    .filter((price) => price?.product && productSet.has(price.product))
    .map((price) => {
      if (!price?.product) {
        return null
      }
      const cents = brlToCents(price.unitValueBRL)
      if (cents == null) return null
      return { product: price.product, unitCents: cents }
    })
    .filter((value): value is PricePayload => value !== null)
}

function normalizePartnerId(partnerId?: string | null) {
  if (partnerId == null || partnerId === '') {
    return null
  }
  const trimmed = partnerId.trim()
  if (trimmed.length === 0) {
    return null
  }
  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeString(value?: string | null) {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

storesRouter.post('/', async (req, res, next) => {
  try {
    const data = storeSchema.parse(req.body)
    const pricesData = mapPrices(data.prices ?? [])

    const created = await prisma.store.create({
      data: {
        partnerId: normalizePartnerId(data.partnerId),
        name: data.name.trim(),
        externalCode: normalizeString(data.externalCode),
        addressRaw: data.addressRaw.trim(),
        street: normalizeString(data.street),
        number: normalizeString(data.number),
        complement: normalizeString(data.complement),
        district: normalizeString(data.district),
        city: data.city.trim(),
        state: data.state.trim().toUpperCase(),
        postalCode: normalizeString(data.postalCode),
        status: data.status,
        prices: pricesData.length ? { create: pricesData } : undefined,
      },
      include: { prices: true },
    })

    res.json(created)
  } catch (error) {
    next(error)
  }
})

storesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    const data = storeSchema.parse(req.body)
    const pricesData = mapPrices(data.prices ?? [])

    await prisma.$transaction([
      prisma.store.update({
        where: { id },
        data: {
          partnerId: normalizePartnerId(data.partnerId),
          name: data.name.trim(),
          externalCode: normalizeString(data.externalCode),
          addressRaw: data.addressRaw.trim(),
          street: normalizeString(data.street),
          number: normalizeString(data.number),
          complement: normalizeString(data.complement),
          district: normalizeString(data.district),
          city: data.city.trim(),
          state: data.state.trim().toUpperCase(),
          postalCode: normalizeString(data.postalCode),
          status: data.status,
        },
      }),
      prisma.storePrice.deleteMany({ where: { storeId: id } }),
      ...(pricesData.length
        ? [
            prisma.storePrice.createMany({
              data: pricesData.map((price) => ({ storeId: id, ...price })),
            }),
          ]
        : []),
    ])

    const result = await prisma.store.findUnique({ where: { id }, include: { prices: true } })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

export { storesRouter }
