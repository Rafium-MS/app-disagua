import path from 'node:path'

import { PrismaClient } from '@prisma/client'
import xlsx from 'xlsx'

import { brlToCents, parseBrazilAddress } from '../src/shared/store-utils'
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

  for (const row of rows) {
    const marca = String(row['MARCA'] ?? '').trim()
    const loja = String(row['LOJA'] ?? '').trim()
    const codigo = String(row['COD da Disagua'] ?? '').trim()
    const endereco = String(row['LOCAL DA ENTREGA'] ?? '').trim()
    const municipio = String(row['MUNICIPIO'] ?? '').trim()
    const uf = String(row['UF'] ?? '').trim().slice(0, 2).toUpperCase()
    const valorUn = row['VALOR UN.']
    const p20 = row['VALOR 20L'] ?? row['20L'] ?? null
    const p10 = row['VALOR 10L'] ?? row['10L'] ?? null
    const p15 = row['VALOR 1500ML'] ?? row['1,5L'] ?? row['1.5L'] ?? null
    const pCopo = row['VALOR COPO'] ?? row['CAIXA DE COPO'] ?? null
    const pVasilhame = row['VALOR VASILHAME'] ?? null

    if (!loja || !endereco || !municipio || !uf) {
      console.warn(`Pulando linha inválida: ${JSON.stringify({ marca, loja, endereco, municipio, uf })}`)
      continue
    }

    const partner = marca ? await prisma.partner.findFirst({ where: { name: marca } }) : null
    const parsed = parseBrazilAddress(endereco)
    const externalCode = codigo || `${marca}:${loja}`

    const store = await prisma.store.upsert({
      where: { externalCode },
      update: {
        name: loja,
        partnerId: partner?.id ?? null,
        addressRaw: endereco,
        street: parsed.street ?? null,
        number: parsed.number ?? null,
        complement: parsed.complement ?? null,
        district: parsed.district ?? null,
        city: municipio,
        state: uf,
        postalCode: parsed.postalCode ?? null,
        status: 'ACTIVE',
      },
      create: {
        externalCode,
        name: loja,
        partnerId: partner?.id ?? null,
        addressRaw: endereco,
        street: parsed.street ?? null,
        number: parsed.number ?? null,
        complement: parsed.complement ?? null,
        district: parsed.district ?? null,
        city: municipio,
        state: uf,
        postalCode: parsed.postalCode ?? null,
        status: 'ACTIVE',
      },
    })

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

    await prisma.storePrice.deleteMany({ where: { storeId: store.id } })

    if (pricePairs.length > 0) {
      await prisma.storePrice.createMany({
        data: pricePairs.map((pair) => ({ storeId: store.id, ...pair })),
      })
    }

    console.log(`Loja sincronizada: ${loja} (${externalCode})`)
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
