import { Prisma, PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import multer from 'multer'
import { Router } from 'express'
import type { Request } from 'express'
import { z } from 'zod'

import { prisma } from '../prisma'

const vouchersQuerySchema = z
  .object({
    partnerId: z.coerce.number().int().positive().optional(),
    reportId: z.coerce.number().int().positive().optional(),
    status: z.enum(['redeemed', 'pending']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10)
  })
  .strict()

class InvalidFileTypeError extends Error {
  constructor(message = 'Tipo de arquivo não suportado') {
    super(message)
    this.name = 'InvalidFileTypeError'
  }
}

const uploadDirectory = path.resolve(process.cwd(), 'data', 'uploads')
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png'])

fs.mkdirSync(uploadDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory)
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const uniqueName = `${randomUUID()}${extension}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new InvalidFileTypeError())
      return
    }

    cb(null, true)
  }
})

const voucherIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive()
  })
  .strict()

const createVouchersRouter = ({ prisma: prismaClient }: { prisma: PrismaClient }) => {
  const vouchersRouter = Router()

  vouchersRouter.get('/', async (req, res) => {
    try {
      const { partnerId, reportId, status, page, pageSize } = vouchersQuerySchema.parse(req.query)

      const where: Prisma.VoucherWhereInput = {
        ...(typeof partnerId === 'number' ? { partnerId } : {}),
        ...(typeof reportId === 'number' ? { reportId } : {}),
        ...(status === 'redeemed'
          ? { redeemedAt: { not: null } }
          : status === 'pending'
            ? { redeemedAt: null }
            : {})
      }

      const hasFilters = Object.keys(where).length > 0
      const skip = (page - 1) * pageSize

      const [vouchers, total] = await prismaClient.$transaction([
        prismaClient.voucher.findMany({
          where: hasFilters ? where : undefined,
          orderBy: { issuedAt: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            code: true,
            issuedAt: true,
            redeemedAt: true,
            filePath: true,
            partner: {
              select: {
                id: true,
                name: true
              }
            },
            report: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }),
        prismaClient.voucher.count({ where: hasFilters ? where : undefined })
      ])

      res.json({
        data: vouchers,
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

      console.error('Erro ao listar vouchers', error)
      res.status(500).json({ error: 'Não foi possível listar os vouchers' })
    }
  })

  vouchersRouter.post('/:id/upload', (req, res) => {
    const parsedParams = voucherIdParamSchema.safeParse(req.params)

    if (!parsedParams.success) {
      res.status(400).json({ error: 'Identificador do voucher inválido.' })
      return
    }

    const { id } = parsedParams.data

    upload.single('file')(req, res, async error => {
      const requestWithFile = req as Request & { file?: { filename: string } }

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res
            .status(400)
            .json({ error: 'Arquivo excede o tamanho máximo de 5MB. Envie um arquivo menor.' })
          return
        }

        res.status(400).json({ error: 'Não foi possível processar o arquivo enviado.' })
        return
      }

      if (error instanceof InvalidFileTypeError) {
        res.status(400).json({ error: 'Tipo de arquivo não suportado. Envie apenas PDF, JPG ou PNG.' })
        return
      }

      if (error) {
        console.error('Erro inesperado ao fazer upload do voucher', error)
        res.status(500).json({ error: 'Não foi possível fazer upload do arquivo do voucher.' })
        return
      }

      if (!requestWithFile.file) {
        res.status(400).json({ error: 'Nenhum arquivo foi enviado.' })
        return
      }

      try {
        const relativeFilePath = path.posix.join('data', 'uploads', requestWithFile.file.filename)

        const voucher = await prismaClient.voucher.update({
          where: { id },
          data: { filePath: relativeFilePath },
          select: {
            id: true,
            filePath: true
          }
        })

        res.json({
          message: 'Upload realizado com sucesso',
          voucher
        })
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
          res.status(404).json({ error: 'Voucher não encontrado.' })
          return
        }

        console.error('Erro ao atualizar o voucher após upload', err)
        res.status(500).json({ error: 'Não foi possível salvar o arquivo do voucher.' })
      }
    })
  })

  return vouchersRouter
}

const vouchersRouter = createVouchersRouter({ prisma })

export { createVouchersRouter, vouchersRouter }

