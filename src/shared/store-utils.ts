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
  city?: string
  state?: string
  postalCode?: string
}

const CEP_REGEX = /\b\d{5}-?\d{3}\b/
const STATE_REGEX = /\b(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i

export function parseBrazilAddress(raw?: string | null): ParsedAddress {
  const input = raw?.trim() ?? ''
  const output: ParsedAddress = {}

  if (!input) {
    return output
  }

  const cepMatch = input.match(CEP_REGEX)
  if (cepMatch) {
    output.postalCode = cepMatch[0].replace('-', '')
  }

  const stateMatch = input.match(STATE_REGEX)
  if (stateMatch) {
    output.state = stateMatch[0].toUpperCase()
  }

  const numberMatch =
    input.match(/,\s*(\d{1,6})(?:\b|,)/) ?? input.match(/\s+N[ºo]?\s*(\d{1,6})/i)
  if (numberMatch) {
    output.number = numberMatch[1]
  }

  const complementMatch = input.match(
    /\b(?:ap|apt|apto|sala|loja|bloco|bl|cj|conj|cjs|sl|lt|quadra|qd)\.?\s*([\w\-\/]+)/i,
  )
  if (complementMatch) {
    output.complement = `${complementMatch[0]}`.replace(/\s+/g, ' ').trim()
  }

  const parts = input.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length > 0) {
    output.street = parts[0]
  }

  const dashSplit = input.split(' - ').map((part) => part.trim()).filter(Boolean)
  if (dashSplit.length > 1) {
    output.district = dashSplit[1]?.split(',')[0]?.trim() || output.district
  }

  if (!output.district && parts.length > 2) {
    output.district = parts.at(-2)
  }

  if (!output.city) {
    const cityStateMatch = input.match(/,\s*([A-Za-zÀ-ú\s]+)\s*-\s*[A-Za-z]{2}/)
    if (cityStateMatch) {
      output.city = cityStateMatch[1].trim()
    }
  }

  if (!output.city) {
    const tokens = input.split(/[,-]/).map((token) => token.trim())
    const probableCity = tokens.find((token) => token && token.length > 2 && !/\d/.test(token))
    if (probableCity) {
      output.city = probableCity
    }
  }

  if (!output.state && output.city) {
    const cityWithState = input.match(new RegExp(`${output.city}\s*-\s*([A-Z]{2})`, 'i'))
    if (cityWithState) {
      output.state = cityWithState[1].toUpperCase()
    }
  }

  return output
}

export function normalizeName(value: string): string {
  return value
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

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const hasComma = trimmed.includes(',')
  const normalized = hasComma
    ? trimmed.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
    : trimmed.replace(/[^\d.-]/g, '')

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
