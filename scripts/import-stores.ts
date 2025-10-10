import path from 'node:path'

import { PrismaClient } from '@prisma/client'
import xlsx from 'xlsx'

import { brlToCents, parseBrazilAddress } from '../src/shared/store-utils'

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
    const valorUnitario = brlToCents(row['VALOR UN.'] as string | number | null)

    if (!loja || !endereco || !municipio || !uf) {
      console.warn(`Pulando linha inválida: ${JSON.stringify({ marca, loja, endereco, municipio, uf })}`)
      continue
    }

    const partner = marca ? await prisma.partner.findFirst({ where: { name: marca } }) : null
    const parsed = parseBrazilAddress(endereco)
    const externalCode = codigo || `${marca}:${loja}`

    await prisma.store.upsert({
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
        unitValueCents: valorUnitario,
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
        unitValueCents: valorUnitario,
        status: 'ACTIVE',
      },
    })

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
