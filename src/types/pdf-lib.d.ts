declare module 'pdf-lib' {
  export type PDFPage = {
    getSize(): { width: number; height: number }
    drawText(text: string, options?: Record<string, unknown>): void
    drawImage(image: unknown, options?: Record<string, unknown>): void
  }

  export type PDFFont = Record<string, unknown>

  export type PDFDocumentInstance = {
    addPage(): PDFPage
    insertPage(index: number): PDFPage
    getPage(index: number): PDFPage
    getPageCount(): number
    copyPages(document: PDFDocumentInstance, indices: number[]): Promise<PDFPage[]>
    embedFont(name: string): Promise<PDFFont>
    embedJpg(data: Uint8Array): Promise<{ width: number; height: number }>
    embedPng(data: Uint8Array): Promise<{ width: number; height: number }>
    save(): Promise<Uint8Array>
  }

  export const PDFDocument: {
    create(): Promise<PDFDocumentInstance>
    load(data: Uint8Array): Promise<PDFDocumentInstance & { getPageIndices(): number[] }>
  }

  export const StandardFonts: Record<string, string>

  export const rgb: (r: number, g: number, b: number) => { r: number; g: number; b: number }

  export type { PDFFont, PDFPage }
}
