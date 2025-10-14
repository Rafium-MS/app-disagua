import { describe, expect, it } from 'vitest'

import { brlToCents, normalizeName, parseBrazilAddress } from '../../src/shared/store-utils'

describe('store utils', () => {
  it('normalizes names removing diacritics and punctuation', () => {
    expect(normalizeName(' Loja São João - Unidade #1 ')).toBe('loja sao joao unidade 1')
  })

  it('converts BRL string to cents', () => {
    expect(brlToCents('R$ 12,50')).toBe(1250)
    expect(brlToCents('12.50')).toBe(1250)
    expect(brlToCents('')).toBeNull()
  })

  it('parses Brazilian address extracting fields', () => {
    const parsed = parseBrazilAddress('Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-000')
    expect(parsed.street).toBe('Av. Paulista')
    expect(parsed.number).toBe('1000')
    expect(parsed.district).toBe('Bela Vista')
    expect(parsed.city).toMatch(/São Paulo/i)
    expect(parsed.state).toBe('SP')
    expect(parsed.postalCode).toBe('01310000')
  })
})
