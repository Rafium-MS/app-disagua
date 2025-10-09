import type { Prisma, PrismaClient } from '@prisma/client'
import archiver from 'archiver'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import type { Request } from 'express'
import { Router } from 'express'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { z } from 'zod'

import { prisma } from '../prisma'
import { getRequestContext } from '../context'
import { insensitiveContains } from '../utils/prisma-filters'

const reportsQuerySchema = z
  .object({
    partnerId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10)
  })
  .strict()

const reportIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive()
  })
  .strict()

const reportExportQuerySchema = z
  .object({
    format: z.enum(['pdf', 'zip']).optional().default('pdf')
  })
  .strict()

type VoucherWithFile = {
  id: number
  code: string
  issuedAt: Date
  redeemedAt: Date | null
  filePath: string | null
}

const exportsDirectory = path.resolve(process.cwd(), 'data', 'exports')
const supportedPdfExtensions = new Set(['.pdf'])
const supportedImageExtensions = new Set(['.jpg', '.jpeg', '.png'])

type VoucherSummaryEntry = {
  voucher: VoucherWithFile
  status: 'included' | 'missing' | 'unsupported'
  pageStart?: number
}

type ReportExportData = {
  id: number
  title: string
  issuedAt: Date
  summary: string | null
  partner: { name: string }
  vouchers: VoucherWithFile[]
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

const formatDate = (date: Date) => date.toISOString().split('T')[0]

const ensureExportsDirectory = async () => {
  await fsPromises.mkdir(exportsDirectory, { recursive: true })
}

const resolveFilePath = (relativePath: string) => path.resolve(process.cwd(), relativePath)

const buildExportFileName = (
  partnerName: string,
  reportTitle: string,
  extension: 'pdf' | 'zip'
) => {
  const baseSlug = [partnerName, reportTitle]
    .map((value) => slugify(value))
    .filter(Boolean)
    .join('-')

  const safeBase = baseSlug.length > 0 ? baseSlug : 'relatorio'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  return `${safeBase}-${timestamp}.${extension}`
}

const drawSummaryPages = (
  pdfDoc: PDFDocument,
  startIndex: number,
  entries: VoucherSummaryEntry[],
  regularFont: PDFFont,
  boldFont: PDFFont
) => {
  if (entries.length === 0) {
    pdfDoc.removePage(startIndex)
    return
  }

  let currentIndex = startIndex
  let currentPage = pdfDoc.getPage(currentIndex)
  let { width, height } = currentPage.getSize()
  let y = height - 80

  currentPage.drawText('Sumário de comprovantes', {
    x: 50,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0, 0.2, 0.5)
  })
  y -= 40

  entries.forEach((entry, index) => {
    const issuedAt = formatDate(entry.voucher.issuedAt)
    const redeemedAt = entry.voucher.redeemedAt ? formatDate(entry.voucher.redeemedAt) : '—'
    const statusText =
      entry.status === 'included'
        ? `Incluído (página ${entry.pageStart})`
        : entry.status === 'unsupported'
          ? 'Formato não suportado'
          : 'Arquivo ausente'

    const text = `${index + 1}. Voucher ${entry.voucher.code} — Emitido em ${issuedAt} — Resgatado: ${redeemedAt} — ${statusText}`

    if (y < 80) {
      currentIndex += 1
      currentPage = pdfDoc.insertPage(currentIndex)
      ;({ width, height } = currentPage.getSize())
      y = height - 60

      currentPage.drawText('Sumário de comprovantes (cont.)', {
        x: 50,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0, 0.2, 0.5)
      })

      y -= 30
    }

    currentPage.drawText(text, {
      x: 50,
      y,
      size: 11,
      font: regularFont,
      maxWidth: width - 100,
      lineHeight: 14
    })

    y -= 28
  })
}

const drawCoverPage = (
  page: PDFPage,
  report: {
    title: string
    issuedAt: Date
    summary: string | null
    partner: { name: string }
  },
  totalVouchers: number,
  includedVouchers: number,
  regularFont: PDFFont,
  boldFont: PDFFont
) => {
  const { width, height } = page.getSize()

  page.drawText('Relatório de comprovantes', {
    x: 50,
    y: height - 100,
    size: 28,
    font: boldFont,
    color: rgb(0, 0.2, 0.5)
  })

  const details = [
    `Parceiro: ${report.partner.name}`,
    `Relatório: ${report.title}`,
    `Emitido em: ${formatDate(report.issuedAt)}`,
    `Total de vouchers: ${totalVouchers}`,
    `Comprovantes incluídos: ${includedVouchers}`
  ]

  let y = height - 160
  details.forEach((detail) => {
    page.drawText(detail, {
      x: 50,
      y,
      size: 14,
      font: regularFont
    })
    y -= 24
  })

  if (report.summary) {
    y -= 10
    page.drawText('Resumo:', {
      x: 50,
      y,
      size: 14,
      font: boldFont
    })
    y -= 24

    page.drawText(report.summary, {
      x: 50,
      y,
      size: 12,
      font: regularFont,
      maxWidth: width - 100,
      lineHeight: 16
    })
  }
}

const addVoucherToPdf = async (
  pdfDoc: PDFDocument,
  voucher: VoucherWithFile,
  absoluteFilePath: string
) => {
  const extension = path.extname(voucher.filePath ?? '').toLowerCase()

  if (supportedPdfExtensions.has(extension)) {
    const voucherPdfBytes = await fsPromises.readFile(absoluteFilePath)
    const voucherPdf = await PDFDocument.load(voucherPdfBytes)
    const copiedPages = await pdfDoc.copyPages(voucherPdf, voucherPdf.getPageIndices())
    copiedPages.forEach((page) => {
      pdfDoc.addPage(page)
    })
    return true
  }

  if (supportedImageExtensions.has(extension)) {
    const imageBytes = await fsPromises.readFile(absoluteFilePath)
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()

    if (extension === '.png') {
      const image = await pdfDoc.embedPng(imageBytes)
      const scale = Math.min((width - 80) / image.width, (height - 120) / image.height)
      const imageWidth = image.width * scale
      const imageHeight = image.height * scale

      page.drawImage(image, {
        x: (width - imageWidth) / 2,
        y: (height - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight
      })
      return true
    }

    const image = await pdfDoc.embedJpg(imageBytes)
    const scale = Math.min((width - 80) / image.width, (height - 120) / image.height)
    const imageWidth = image.width * scale
    const imageHeight = image.height * scale

    page.drawImage(image, {
      x: (width - imageWidth) / 2,
      y: (height - imageHeight) / 2,
      width: imageWidth,
      height: imageHeight
    })
    return true
  }

  return false
}

const generatePdfExport = async (
  report: ReportExportData,
  attachments: {
    voucher: VoucherWithFile
    status: 'available' | 'missing'
    absolutePath?: string
  }[]
) => {
  const pdfDoc = await PDFDocument.create()
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const summaries: VoucherSummaryEntry[] = []
  let includedCount = 0

  for (const attachment of attachments) {
    if (attachment.status === 'missing' || !attachment.absolutePath) {
      summaries.push({ voucher: attachment.voucher, status: 'missing' })
      continue
    }

    const startPage = pdfDoc.getPageCount() + 1
    const added = await addVoucherToPdf(pdfDoc, attachment.voucher, attachment.absolutePath)

    if (added) {
      summaries.push({ voucher: attachment.voucher, status: 'included', pageStart: startPage })
      includedCount += 1
    } else {
      summaries.push({ voucher: attachment.voucher, status: 'unsupported' })
    }
  }

  if (includedCount === 0) {
    return { bytes: null, includedCount: 0, summaries }
  }

  const coverPage = pdfDoc.insertPage(0)
  const summaryPageIndex = 1
  pdfDoc.insertPage(summaryPageIndex)

  const adjustedSummaries = summaries.map((entry) =>
    entry.pageStart ? { ...entry, pageStart: entry.pageStart + 2 } : entry
  )

  drawCoverPage(coverPage, report, report.vouchers.length, includedCount, regularFont, boldFont)
  drawSummaryPages(pdfDoc, summaryPageIndex, adjustedSummaries, regularFont, boldFont)

  const pdfBytes = await pdfDoc.save()

  return { bytes: pdfBytes, includedCount, summaries: adjustedSummaries }
}

const generateZipExport = async (
  report: ReportExportData,
  attachments: {
    voucher: VoucherWithFile
    status: 'available' | 'missing'
    absolutePath?: string
  }[],
  outputPath: string
): Promise<VoucherSummaryEntry[]> => {
  const archive = archiver('zip', { zlib: { level: 9 } })
  const output = fs.createWriteStream(outputPath)

  const manifest = report.vouchers.map((voucher) => {
    const attachment = attachments.find((item) => item.voucher.id === voucher.id)

    return {
      id: voucher.id,
      code: voucher.code,
      issuedAt: voucher.issuedAt.toISOString(),
      redeemedAt: voucher.redeemedAt ? voucher.redeemedAt.toISOString() : null,
      filePath: voucher.filePath,
      status: attachment?.status ?? 'missing'
    }
  })

  const finalizePromise = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve())
    archive.on('error', (error) => reject(error))
  })

  archive.pipe(output)

  for (const attachment of attachments) {
    if (attachment.status === 'available' && attachment.absolutePath) {
      const fileName = path.basename(attachment.absolutePath)
      archive.file(attachment.absolutePath, { name: fileName })
    }
  }

  archive.append(
    JSON.stringify(
      {
        report: {
          id: report.id,
          title: report.title,
          issuedAt: report.issuedAt.toISOString(),
          partner: report.partner.name
        },
        vouchers: manifest
      },
      null,
      2
    ),
    { name: 'manifest.json' }
  )

  await archive.finalize()
  await finalizePromise

  return attachments.map((attachment) =>
    attachment.status === 'available' && attachment.absolutePath
      ? { voucher: attachment.voucher, status: 'included' as const }
      : { voucher: attachment.voucher, status: 'missing' as const }
  )
}

const pendingPartnersQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .transform((value) => (value.length > 0 ? value : undefined))
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10)
  })
  .strict()

const createReportsRouter = ({ prisma: prismaClient }: { prisma: PrismaClient }) => {
  const reportsRouter = Router()

  const registerExportAuditLog = async (
    req: Request,
    report: { id: number; title: string },
    payload: {
      format: 'pdf' | 'zip'
      filePath: string
      counts: {
        totalVouchers: number
        available: number
        included: number
        missing: number
        unsupported: number
      }
      summary: Array<{
        voucherId: number
        status: 'included' | 'missing' | 'unsupported'
        pageStart: number | null
      }>
    }
  ) => {
    const context = getRequestContext()

    try {
      await prismaClient.auditLog.create({
        data: {
          action: 'export',
          entity: 'Report',
          entityId: String(report.id),
          actor: context?.actor ?? null,
          requestId: context?.requestId ?? null,
          requestMethod: context?.method ?? req.method,
          requestUrl: context?.url ?? req.originalUrl,
          ipAddress: context?.ip ?? null,
          changes: JSON.stringify({
            reportTitle: report.title,
            format: payload.format,
            filePath: payload.filePath,
            counts: payload.counts,
            summary: payload.summary.map((entry) => ({
              voucherId: entry.voucherId,
              status: entry.status,
              pageStart: entry.pageStart
            }))
          })
        }
      })
    } catch (error) {
      console.error('Erro ao registrar log de exportação de relatório', error)
    }
  }

  reportsRouter.get('/', async (req, res) => {
    try {
      const { partnerId, page, pageSize } = reportsQuerySchema.parse(req.query)

      const where = typeof partnerId === 'number' ? { partnerId } : undefined
      const skip = (page - 1) * pageSize

      const [reports, total] = await prismaClient.$transaction([
        prismaClient.report.findMany({
          where,
          orderBy: { issuedAt: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            title: true,
            summary: true,
            issuedAt: true,
            partner: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prismaClient.report.count({ where })
      ])

      res.json({
        data: reports,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Parâmetros inválidos',
          details: error.flatten().fieldErrors
        })
        return
      }

      console.error('Erro ao listar relatórios', error)
      res.status(500).json({ error: 'Não foi possível listar os relatórios' })
    }
  })

  reportsRouter.get('/:id/pending-partners', async (req, res) => {
    try {
      const { id: reportId } = reportIdParamSchema.parse(req.params)
      const { search, page, pageSize } = pendingPartnersQuerySchema.parse(req.query)

      const existingReport = await prismaClient.report.findUnique({
        where: { id: reportId },
        select: { id: true }
      })

      if (!existingReport) {
        res.status(404).json({ error: 'Relatório não encontrado' })
        return
      }

      const where: Prisma.PartnerWhereInput = {
        vouchers: {
          none: {
            reportId,
            redeemedAt: null
          }
        },
        ...(search
          ? {
              OR: [
                { name: insensitiveContains<'Partner'>(search) },
                { document: { contains: search } },
                { email: insensitiveContains<'Partner'>(search) }
              ]
            }
          : {})
      }

      const skip = (page - 1) * pageSize

      const [partners, total] = await prismaClient.$transaction([
        prismaClient.partner.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            name: true,
            document: true,
            email: true,
            vouchers: {
              where: { reportId },
              orderBy: { issuedAt: 'desc' },
              select: {
                id: true,
                issuedAt: true,
                redeemedAt: true
              }
            }
          }
        }),
        prismaClient.partner.count({ where })
      ])

      const data = partners.map((partner) => {
        const reportVouchers = partner.vouchers
        const totalVouchers = reportVouchers.length
        const validVouchers = reportVouchers.filter((voucher) => voucher.redeemedAt === null).length
        const redeemedVouchers = totalVouchers - validVouchers
        const lastVoucherIssuedAt = reportVouchers[0]?.issuedAt ?? null

        return {
          id: partner.id,
          name: partner.name,
          document: partner.document,
          email: partner.email,
          reportVoucherStats: {
            total: totalVouchers,
            valid: validVouchers,
            redeemed: redeemedVouchers,
            lastIssuedAt: lastVoucherIssuedAt ? lastVoucherIssuedAt.toISOString() : null
          }
        }
      })

      res.json({
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Parâmetros inválidos',
          details: error.flatten().fieldErrors
        })
        return
      }

      console.error('Erro ao listar parceiros pendentes do relatório', error)
      res.status(500).json({ error: 'Não foi possível listar os parceiros pendentes' })
    }
  })

  reportsRouter.post('/:id/export', async (req, res) => {
    try {
      const { id: reportId } = reportIdParamSchema.parse(req.params)
      const { format } = reportExportQuerySchema.parse(req.query)

      const report = (await prismaClient.report.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          title: true,
          issuedAt: true,
          summary: true,
          partner: { select: { name: true } },
          vouchers: {
            orderBy: { issuedAt: 'asc' },
            select: {
              id: true,
              code: true,
              issuedAt: true,
              redeemedAt: true,
              filePath: true
            }
          }
        }
      })) as ReportExportData | null

      if (!report) {
        res.status(404).json({ error: 'Relatório não encontrado' })
        return
      }

      const attachments = await Promise.all(
        report.vouchers.map(async (voucher) => {
          if (!voucher.filePath) {
            return { voucher, status: 'missing' as const }
          }

          const absolutePath = resolveFilePath(voucher.filePath)

          try {
            await fsPromises.access(absolutePath, fs.constants.R_OK)
            return { voucher, status: 'available' as const, absolutePath }
          } catch {
            return { voucher, status: 'missing' as const }
          }
        })
      )

      const availableAttachments = attachments.filter(
        (attachment) => attachment.status === 'available'
      )

      if (availableAttachments.length === 0) {
        res.status(400).json({ error: 'Nenhum comprovante disponível para exportação' })
        return
      }

      await ensureExportsDirectory()

      if (format === 'zip') {
        const fileName = buildExportFileName(report.partner.name, report.title, 'zip')
        const relativePath = path.posix.join('data', 'exports', fileName)
        const absolutePath = path.join(exportsDirectory, fileName)

        const summaryEntries = await generateZipExport(report, attachments, absolutePath)

        const includedCount = summaryEntries.filter((entry) => entry.status === 'included').length
        const missingCount = summaryEntries.filter((entry) => entry.status === 'missing').length

        await registerExportAuditLog(req, report, {
          format: 'zip',
          filePath: relativePath,
          counts: {
            totalVouchers: report.vouchers.length,
            available: report.vouchers.length - missingCount,
            included: includedCount,
            missing: missingCount,
            unsupported: 0
          },
          summary: summaryEntries.map((entry) => ({
            voucherId: entry.voucher.id,
            status: entry.status,
            pageStart: entry.pageStart ?? null
          }))
        })

        res.json({
          message: 'Exportação gerada com sucesso',
          data: {
            report: {
              id: report.id,
              title: report.title
            },
            file: {
              path: relativePath,
              format: 'zip'
            },
            counts: {
              totalVouchers: report.vouchers.length,
              available: report.vouchers.length - missingCount,
              included: includedCount,
              missing: missingCount,
              unsupported: 0
            },
            summary: summaryEntries.map((entry) => ({
              voucherId: entry.voucher.id,
              code: entry.voucher.code,
              issuedAt: entry.voucher.issuedAt.toISOString(),
              redeemedAt: entry.voucher.redeemedAt ? entry.voucher.redeemedAt.toISOString() : null,
              status: entry.status,
              pageStart: entry.pageStart ?? null
            }))
          }
        })
        return
      }

      const pdfResult = await generatePdfExport(report, attachments)

      if (!pdfResult.bytes) {
        res.status(400).json({
          error:
            'Não foi possível gerar o PDF porque nenhum arquivo possui um formato compatível. Solicite a exportação em formato ZIP.'
        })
        return
      }

      const fileName = buildExportFileName(report.partner.name, report.title, 'pdf')
      const relativePath = path.posix.join('data', 'exports', fileName)
      const absolutePath = path.join(exportsDirectory, fileName)

      await fsPromises.writeFile(absolutePath, pdfResult.bytes)

      const includedCount = pdfResult.summaries.filter(
        (entry) => entry.status === 'included'
      ).length
      const missingCount = pdfResult.summaries.filter((entry) => entry.status === 'missing').length
      const unsupportedCount = pdfResult.summaries.filter(
        (entry) => entry.status === 'unsupported'
      ).length

      await registerExportAuditLog(req, report, {
        format: 'pdf',
        filePath: relativePath,
        counts: {
          totalVouchers: report.vouchers.length,
          available: report.vouchers.length - missingCount,
          included: includedCount,
          missing: missingCount,
          unsupported: unsupportedCount
        },
        summary: pdfResult.summaries.map((entry) => ({
          voucherId: entry.voucher.id,
          status: entry.status,
          pageStart: entry.pageStart ?? null
        }))
      })

      res.json({
        message: 'Exportação gerada com sucesso',
        data: {
          report: {
            id: report.id,
            title: report.title
          },
          file: {
            path: relativePath,
            format: 'pdf'
          },
          counts: {
            totalVouchers: report.vouchers.length,
            available: report.vouchers.length - missingCount,
            included: includedCount,
            missing: missingCount,
            unsupported: unsupportedCount
          },
          summary: pdfResult.summaries.map((entry) => ({
            voucherId: entry.voucher.id,
            code: entry.voucher.code,
            issuedAt: entry.voucher.issuedAt.toISOString(),
            redeemedAt: entry.voucher.redeemedAt ? entry.voucher.redeemedAt.toISOString() : null,
            status: entry.status,
            pageStart: entry.pageStart ?? null
          }))
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Parâmetros inválidos',
          details: error.flatten().fieldErrors
        })
        return
      }

      console.error('Erro ao exportar comprovantes do relatório', error)
      res.status(500).json({ error: 'Não foi possível exportar os comprovantes do relatório' })
    }
  })

  return reportsRouter
}

const reportsRouter = createReportsRouter({ prisma })

export { createReportsRouter, reportsRouter }
