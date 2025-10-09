import type { RequestHandler } from 'express'

declare module 'multer' {
  interface MulterFile {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    size: number
    destination: string
    filename: string
    path: string
  }

  interface MulterOptions {
    storage?: unknown
    limits?: {
      fileSize?: number
      files?: number
      [key: string]: unknown
    }
    fileFilter?: (
      req: unknown,
      file: MulterFile,
      callback: (error: unknown, acceptFile?: boolean) => void
    ) => void
  }

  interface DiskStorageOptions {
    destination?: (
      req: unknown,
      file: MulterFile,
      callback: (error: Error | null, destination: string) => void
    ) => void
    filename?: (
      req: unknown,
      file: MulterFile,
      callback: (error: Error | null, filename: string) => void
    ) => void
  }

  interface MulterInstance {
    single(field: string): RequestHandler
  }

  class MulterError extends Error {
    constructor(code: string, field?: string)
    code: string
  }

  interface MulterExport {
    (options?: MulterOptions): MulterInstance
    diskStorage(options: DiskStorageOptions): unknown
    MulterError: typeof MulterError
  }

  const multer: MulterExport
  export default multer
  export { MulterError, MulterFile, MulterInstance, MulterOptions }
}
