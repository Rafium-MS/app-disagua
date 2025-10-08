declare module 'archiver' {
  import type { Writable } from 'node:stream'

  interface Archiver extends NodeJS.EventEmitter {
    pipe(stream: Writable): void
    file(filePath: string, options: { name: string }): void
    append(data: string | Buffer, options: { name: string }): void
    finalize(): Promise<void>
  }

  type ArchiverFactory = (format: 'zip', options?: unknown) => Archiver

  const archiver: ArchiverFactory
  export default archiver
}
