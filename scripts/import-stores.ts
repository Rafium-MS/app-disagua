import path from 'node:path'

import { PrismaClient } from '@prisma/client'
import xlsx from 'xlsx'

import { brlToCents, parseBrazilAddress, normalizeName } from '../src/shared/store-utils'
import type { StoreProductType } from '../src/shared/store-utils'

const prisma = new PrismaClient()

async function main() {
  const workbookPath = path.resolve('data/LISTA DE LOJAS.xlsx')
  const workbook = xlsx.readFile(workbookPath)
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: Record<string, unknown>[] = xlsx.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  })

  const partnerId = Number(process.env.PARTNER_ID ?? 1)
  if (!Number.isInteger(partnerId)) {
    throw new Error('Informe PARTNER_ID como inteiro para importar as lojas')
  }

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } })
  if (!partner) {
    throw new Error(`Parceiro ${partnerId} não encontrado`)
  }

  for (const row of rows) {
    const brandName = String(row['MARCA'] ?? '').trim()
    const loja = String(row['LOJA'] ?? '').trim()
    const endereco = String(row['LOCAL DA ENTREGA'] ?? '').trim()
    const municipio = String(row['MUNICIPIO'] ?? '').trim() || undefined
    const uf = String(row['UF'] ?? '').trim().slice(0, 2).toUpperCase() || undefined
    const valorUn = row['VALOR UN.']
    const p20 = row['VALOR 20L'] ?? row['20L'] ?? null
    const p10 = row['VALOR 10L'] ?? row['10L'] ?? null
    const p15 = row['VALOR 1500ML'] ?? row['1,5L'] ?? row['1.5L'] ?? null
    const pCopo = row['VALOR COPO'] ?? row['CAIXA DE COPO'] ?? null
    const pVasilhame = row['VALOR VASILHAME'] ?? null

    if (!loja || !endereco || !brandName) {
      console.warn(`Pulando linha inválida: ${JSON.stringify({ brandName, loja, endereco })}`)
      continue
    }

    const brand = await prisma.brand.upsert({
      where: {
        partnerId_name: {
          partnerId,
          name: brandName,
        },
      },
      update: {},
      create: {
        partnerId,
        name: brandName,
      },
    })

    const parsed = parseBrazilAddress(endereco)
    const normalizedName = normalizeName(loja)

    const store = await prisma.store.findFirst({
      where: {
        brandId: brand.id,
        normalizedName,
        city: municipio ?? null,
        mall: null,
      },
    })

    const baseData = {
      partnerId,
      brandId: brand.id,
      name: loja,
      normalizedName,
      deliveryPlace: endereco,
      addressRaw: endereco,
      street: parsed.street ?? null,
      number: parsed.number ?? null,
      complement: parsed.complement ?? null,
      district: parsed.district ?? null,
      city: municipio ?? parsed.city ?? null,
      state: uf ?? parsed.state ?? null,
      postalCode: parsed.postalCode ?? null,
      status: 'ACTIVE' as const,
    }

    const persisted = store
      ? await prisma.store.update({
          where: { id: store.id },
          data: baseData,
        })
      : await prisma.store.create({ data: baseData })

    const pricePairs: Array<{ product: StoreProductType; unitCents: number }> = []

    function pushPrice(product: StoreProductType, raw: unknown) {
      const cents = brlToCents(String(raw ?? '').trim())
      if (cents != null) {
        pricePairs.push({ product, unitCents: cents })
      }
    }

    if (p20 || p10 || p15 || pCopo || pVasilhame) {
      pushPrice('GALAO_20L', p20)
      pushPrice('GALAO_10L', p10)
      pushPrice('PET_1500ML', p15)
      pushPrice('CAIXA_COPO', pCopo)
      pushPrice('VASILHAME', pVasilhame)
    } else if (valorUn) {
      pushPrice('GALAO_20L', valorUn)
    }

    await prisma.storePrice.deleteMany({ where: { storeId: persisted.id } })

    if (pricePairs.length > 0) {
      await prisma.storePrice.createMany({
        data: pricePairs.map((pair) => ({ storeId: persisted.id, ...pair })),
      })
    }

    console.log(`Loja sincronizada: ${loja}`)
  }
}

main()
  .catch((error) => {
    console.error('Erro ao importar lojas', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
