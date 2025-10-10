declare module 'xlsx' {
  export type WorkBook = {
    SheetNames: string[]
    Sheets: Record<string, WorkSheet>
  }

  export type WorkSheet = Record<string, unknown>

  export const utils: {
    sheet_to_json<T = Record<string, unknown>>(sheet: WorkSheet, options?: { defval?: unknown; raw?: boolean }): T[]
  }

  export function readFile(path: string): WorkBook

  const xlsx: {
    readFile: typeof readFile
    utils: typeof utils
  }

  export default xlsx
}
