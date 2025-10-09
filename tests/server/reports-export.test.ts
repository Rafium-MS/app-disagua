import type { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import express from 'express'
import request from 'supertest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('pdf-lib', () => {
  class MockPage {
    width = 595
    height = 842

    getSize() {
      return { width: this.width, height: this.height }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    drawText(_text: string, _options?: Record<string, unknown>) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    drawImage(_image: unknown, _options?: Record<string, unknown>) {}
  }

  class MockPDFDocument {
    pages: MockPage[] = []

    static async create() {
      return new MockPDFDocument()
    }

    static async load(_data: Uint8Array) {
      const doc = new MockPDFDocument()
      doc.pages.push(new MockPage())
      return Object.assign(doc, {
        getPageIndices: () => doc.pages.map((_, index) => index)
      })
    }

    addPage() {
      const page = new MockPage()
      this.pages.push(page)
      return page
    }

    insertPage(index: number) {
      const page = new MockPage()
      this.pages.splice(index, 0, page)
      return page
    }

    getPage(index: number) {
      return this.pages[index]
    }

    getPageCount() {
      return this.pages.length
    }

    async copyPages(_document: MockPDFDocument, indices: number[]) {
      return indices.map(() => new MockPage())
    }

    async embedFont(_name: string) {
      return {}
    }

    async embedPng(_data: Uint8Array) {
      return { width: 400, height: 300 }
    }

    async embedJpg(_data: Uint8Array) {
      return { width: 400, height: 300 }
    }

    async save() {
      return Buffer.from('%PDF-1.4\n%mock')
    }
  }

  const StandardFonts = {
    Helvetica: 'Helvetica',
    HelveticaBold: 'Helvetica-Bold'
  }

  const rgb = (r: number, g: number, b: number) => ({ r, g, b })

  return {
    __esModule: true,
    PDFDocument: MockPDFDocument,
    StandardFonts,
    rgb
  }
}, { virtual: true })

vi.mock('archiver', () => {
  const { EventEmitter } = require('node:events')
  const os = require('node:os')
  const { promisify } = require('node:util')
  const { execFile } = require('node:child_process')
  const execFileAsync = promisify(execFile)

  class MockArchiver extends EventEmitter {
    constructor() {
      super()
      this.entries = []
      this.output = null
    }

    entries: { type: 'file' | 'data'; name: string; value: string | Buffer }[]
    output: fs.WriteStream | null

    pipe(stream: fs.WriteStream) {
      this.output = stream
    }

    file(filePath: string, options: { name: string }) {
      const data = fs.readFileSync(filePath)
      this.entries.push({ type: 'file', name: options.name, value: data })
    }

    append(data: string | Buffer, options: { name: string }) {
      const buffer = typeof data === 'string' ? Buffer.from(data) : data
      this.entries.push({ type: 'data', name: options.name, value: buffer })
    }

    async finalize() {
      if (!this.output) {
        throw new Error('Output stream not configured')
      }

      const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'archiver-mock-'))

      try {
        for (const entry of this.entries) {
          const destination = path.join(tmpDir, entry.name)
          await fsPromises.mkdir(path.dirname(destination), { recursive: true })
          await fsPromises.writeFile(destination, entry.value)
        }

        const zipPath = path.join(tmpDir, 'archive.zip')
        await execFileAsync('zip', ['-r', zipPath, '.'], { cwd: tmpDir })

        const zipBuffer = await fsPromises.readFile(zipPath)

        await new Promise<void>((resolve, reject) => {
          this.output!.write(zipBuffer, error => {
            if (error) {
              this.emit('error', error)
              reject(error)
              return
            }

            this.output!.end(() => resolve())
          })
        })
      } catch (error) {
        this.emit('error', error)
        throw error
      } finally {
        await fsPromises.rm(tmpDir, { recursive: true, force: true })
      }
    }
  }

  const factory = () => new MockArchiver()

  return {
    __esModule: true,
    default: factory
  }
}, { virtual: true })

let createReportsRouter: typeof import('../../src/server/routes/reports').createReportsRouter

beforeAll(async () => {
  const module = await import('../../src/server/routes/reports')
  createReportsRouter = module.createReportsRouter
})

const createPrismaMock = () => ({
  report: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() }
})

type PrismaMock = ReturnType<typeof createPrismaMock>

const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads')
const exportsDir = path.resolve(process.cwd(), 'data', 'exports')

const ensureUploadsDir = async () => {
  await fsPromises.mkdir(uploadsDir, { recursive: true })
}

describe('POST /api/reports/:id/export', () => {
  let prismaMock: PrismaMock
  let app: express.Express
  let tempFiles: string[]

  beforeEach(async () => {
    prismaMock = createPrismaMock()
    tempFiles = []
    await ensureUploadsDir()
    app = express()
    app.use('/api/reports', createReportsRouter({ prisma: prismaMock as unknown as PrismaClient }))
  })

  afterEach(async () => {
    vi.clearAllMocks()
    if (fs.existsSync(exportsDir)) {
      fs.rmSync(exportsDir, { recursive: true, force: true })
    }

    for (const filePath of tempFiles) {
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath)
      }
    }
  })

  const createSampleVoucherFile = async () => {
    const fileName = `${randomUUID()}.png`
    const filePath = path.join(uploadsDir, fileName)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='
    await fsPromises.writeFile(filePath, Buffer.from(pngBase64, 'base64'))
    tempFiles.push(filePath)
    return path.posix.join('data', 'uploads', fileName)
  }

  it('gera um PDF consolidado com capa e sumário', async () => {
    const filePath = await createSampleVoucherFile()

    prismaMock.report.findUnique.mockResolvedValue({
      id: 1,
      title: 'Relatório Março',
      issuedAt: new Date('2024-03-01T00:00:00Z'),
      summary: 'Resumo das operações do mês.',
      partner: { name: 'Parceiro Exemplo' },
      vouchers: [
        {
          id: 10,
          code: 'ABC123',
          issuedAt: new Date('2024-02-10T12:00:00Z'),
          redeemedAt: null,
          filePath
        }
      ]
    })

    const response = await request(app).post('/api/reports/1/export')

    expect(response.status).toBe(200)
    expect(response.body.data.file.format).toBe('pdf')
    expect(response.body.data.summary).toEqual([
      expect.objectContaining({
        voucherId: 10,
        status: 'included',
        pageStart: expect.any(Number)
      })
    ])

    const generatedPath = path.resolve(process.cwd(), response.body.data.file.path)
    expect(fs.existsSync(generatedPath)).toBe(true)
    tempFiles.push(generatedPath)

    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1)
    const auditPayload = prismaMock.auditLog.create.mock.calls[0][0]
    expect(auditPayload).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'export',
          entity: 'Report',
          entityId: '1',
          requestMethod: 'POST',
          requestUrl: '/api/reports/1/export',
          actor: null,
          requestId: null,
          ipAddress: null,
          changes: expect.any(String)
        })
      })
    )

    const changes = JSON.parse(auditPayload.data.changes as string)
    expect(changes).toEqual(
      expect.objectContaining({
        reportTitle: 'Relatório Março',
        format: 'pdf',
        filePath: response.body.data.file.path,
        counts: expect.objectContaining({ included: 1, totalVouchers: 1 }),
        summary: [expect.objectContaining({ voucherId: 10, status: 'included' })]
      })
    )
  })

  it('gera um pacote ZIP com os comprovantes quando solicitado', async () => {
    const filePath = await createSampleVoucherFile()

    prismaMock.report.findUnique.mockResolvedValue({
      id: 2,
      title: 'Relatório Abril',
      issuedAt: new Date('2024-04-01T00:00:00Z'),
      summary: null,
      partner: { name: 'Outro Parceiro' },
      vouchers: [
        {
          id: 20,
          code: 'XYZ789',
          issuedAt: new Date('2024-03-05T08:00:00Z'),
          redeemedAt: new Date('2024-03-20T10:30:00Z'),
          filePath
        }
      ]
    })

    const response = await request(app).post('/api/reports/2/export').query({ format: 'zip' })

    expect(response.status).toBe(200)
    expect(response.body.data.file.format).toBe('zip')
    expect(response.body.data.summary).toEqual([
      expect.objectContaining({ voucherId: 20, status: 'included' })
    ])

    const generatedPath = path.resolve(process.cwd(), response.body.data.file.path)
    expect(fs.existsSync(generatedPath)).toBe(true)
    tempFiles.push(generatedPath)

    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1)
    const auditPayload = prismaMock.auditLog.create.mock.calls[0][0]
    expect(auditPayload).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'export',
          entity: 'Report',
          entityId: '2',
          requestMethod: 'POST',
          requestUrl: expect.stringContaining('/api/reports/2/export'),
          changes: expect.any(String)
        })
      })
    )

    const changes = JSON.parse(auditPayload.data.changes as string)
    expect(changes).toEqual(
      expect.objectContaining({
        format: 'zip',
        filePath: response.body.data.file.path,
        counts: expect.objectContaining({ included: 1, totalVouchers: 1 }),
        summary: [expect.objectContaining({ voucherId: 20, status: 'included' })]
      })
    )
  })

  it('retorna 404 quando o relatório não existe', async () => {
    prismaMock.report.findUnique.mockResolvedValue(null)

    const response = await request(app).post('/api/reports/999/export')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Relatório não encontrado' })
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled()
  })

  it('retorna 400 quando não há comprovantes disponíveis', async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      id: 3,
      title: 'Relatório Maio',
      issuedAt: new Date('2024-05-01T00:00:00Z'),
      summary: null,
      partner: { name: 'Parceiro Sem Arquivos' },
      vouchers: [
        {
          id: 30,
          code: 'SEMCOMPROVANTE',
          issuedAt: new Date('2024-05-10T09:00:00Z'),
          redeemedAt: null,
          filePath: null
        }
      ]
    })

    const response = await request(app).post('/api/reports/3/export')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Nenhum comprovante disponível para exportação' })
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled()
  })
})
