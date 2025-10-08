import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const partnersData = [
    { name: 'Aquatech Solutions', document: '12345678901', email: 'contato@aquatech.com' },
    { name: 'EcoFlux Engenharia', document: '98765432100', email: 'parcerias@ecoflux.com' },
    { name: 'BlueDrop Consultoria', document: '45678912300', email: 'info@bluedrop.com' },
    { name: 'Fonte Viva Saneamento', document: '74185296300', email: 'comercial@fonteviva.com' },
    { name: 'HidroMais Serviços', document: '36925814700', email: 'suporte@hidromais.com' }
  ]

  const partnerMap = new Map<string, number>()

  for (const data of partnersData) {
    const partner = await prisma.partner.upsert({
      where: { document: data.document },
      update: {
        name: data.name,
        email: data.email
      },
      create: data
    })
    partnerMap.set(data.document, partner.id)
  }

  const reportsData = [
    {
      partnerDocument: '12345678901',
      title: 'Relatório de Qualidade - Janeiro/2024',
      summary: 'Indicadores de qualidade da água dentro dos padrões estabelecidos.'
    },
    {
      partnerDocument: '98765432100',
      title: 'Relatório Operacional - Fevereiro/2024',
      summary: 'Manutenções preventivas concluídas e redução de perdas em 8%.'
    }
  ]

  for (const report of reportsData) {
    const partnerId = partnerMap.get(report.partnerDocument)
    if (!partnerId) {
      continue
    }

    await prisma.report.upsert({
      where: {
        partnerId_title: {
          partnerId,
          title: report.title
        }
      },
      update: {
        summary: report.summary
      },
      create: {
        partnerId,
        title: report.title,
        summary: report.summary
      }
    })
  }

  const vouchersData = [
    {
      code: 'VCHR-2024-0001',
      partnerDocument: '12345678901',
      reportTitle: 'Relatório de Qualidade - Janeiro/2024',
      redeemed: false
    },
    {
      code: 'VCHR-2024-0002',
      partnerDocument: '98765432100',
      reportTitle: 'Relatório Operacional - Fevereiro/2024',
      redeemed: true
    },
    {
      code: 'VCHR-2024-0003',
      partnerDocument: '45678912300',
      reportTitle: null,
      redeemed: false
    }
  ] as const

  for (const voucher of vouchersData) {
    const partnerId = partnerMap.get(voucher.partnerDocument)
    if (!partnerId) {
      continue
    }

    const relatedReport = voucher.reportTitle
      ? await prisma.report.findFirst({
          where: { title: voucher.reportTitle }
        })
      : null

    await prisma.voucher.upsert({
      where: { code: voucher.code },
      update: {
        partnerId,
        reportId: relatedReport?.id ?? null,
        redeemedAt: voucher.redeemed ? new Date() : null
      },
      create: {
        code: voucher.code,
        partnerId,
        reportId: relatedReport?.id ?? null,
        redeemedAt: voucher.redeemed ? new Date() : null
      }
    })
  }

  console.log('Seed concluído com parceiros, relatórios e vouchers de exemplo')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
