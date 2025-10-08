import type { MulterFile } from 'multer'
import 'express-serve-static-core'

declare module 'express-serve-static-core' {
  interface Request {
    file?: MulterFile
  }
}
