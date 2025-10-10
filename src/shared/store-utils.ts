export const storeProductTypes = [
  'GALAO_20L',
  'GALAO_10L',
  'PET_1500ML',
  'CAIXA_COPO',
  'VASILHAME',
] as const

export type StoreProductType = (typeof storeProductTypes)[number]

export const storeProductLabels: Record<StoreProductType, string> = {
  GALAO_20L: 'Galão 20L',
  GALAO_10L: 'Galão 10L',
  PET_1500ML: 'PET 1,5L',
  CAIXA_COPO: 'Caixa de copo',
  VASILHAME: 'Vasilhame',
}

export type ParsedAddress = {
  street?: string
  number?: string
  complement?: string
  district?: string
  postalCode?: string
}

export function parseBrazilAddress(raw: string): ParsedAddress {
  const input = raw?.trim() ?? ''
  const output: ParsedAddress = {}

  if (!input) {
    return output
  }

  const cepMatch = input.match(/\b\d{5}-?\d{3}\b/)
  if (cepMatch) {
    output.postalCode = cepMatch[0].replace('-', '')
  }

  const numberMatch =
    input.match(/,\s*(\d{1,6})(?:\b|,)/) ?? input.match(/\s+N[ºo]?\s*(\d{1,6})/i)
  if (numberMatch) {
    output.number = numberMatch[1]
  }

  const complementMatch = input.match(
    /\b(ap|apt|apto|sala|loja|bloco|bl|cj|conj)\.?\s*([\w\-\/]+)/i,
  )
  if (complementMatch) {
    output.complement = `${complementMatch[1]} ${complementMatch[2]}`
  }

  const districtPart = input.split(' - ').at(1)
  if (districtPart) {
    output.district = districtPart.split(',')[0]?.trim() || undefined
  }

  const streetPart = input.split(',')[0]
  if (streetPart) {
    output.street = streetPart.trim()
  }

  return output
}

export function normalizeName(value: string | null | undefined): string {
  const text = value ?? ''
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

export function brlToCents(value?: string | number | null): number | null {
  if (value == null) {
    return null
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return null
    }
    return Math.round(value * 100)
  }

  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')

  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : null
}

export function centsToBRL(value?: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return ''
  }

  return (value / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
