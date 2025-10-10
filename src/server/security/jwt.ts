import { createHmac, timingSafeEqual } from 'node:crypto'

type JwtHeader = {
  alg: 'HS256'
  typ: 'JWT'
}

export type JwtPayload = Record<string, unknown> & {
  exp: number
  iat: number
  sub: string
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = 4 - (normalized.length % 4)
  const padded = normalized + (pad < 4 ? '='.repeat(pad) : '')
  return Buffer.from(padded, 'base64')
}

export type SignJwtOptions = {
  secret: string
  expiresInSeconds: number
  subject: string
  payload: Record<string, unknown>
}

export function signJwt({ secret, expiresInSeconds, subject, payload }: SignJwtOptions) {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' }
  const issuedAt = Math.floor(Date.now() / 1000)
  const exp = issuedAt + expiresInSeconds
  const fullPayload: JwtPayload = { ...payload, iat: issuedAt, exp, sub: subject }

  const headerSegment = base64UrlEncode(Buffer.from(JSON.stringify(header)))
  const payloadSegment = base64UrlEncode(Buffer.from(JSON.stringify(fullPayload)))
  const signingInput = `${headerSegment}.${payloadSegment}`
  const signature = createHmac('sha256', secret).update(signingInput).digest()
  const signatureSegment = base64UrlEncode(signature)

  return {
    token: `${signingInput}.${signatureSegment}`,
    expiresAt: exp,
  }
}

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  const segments = token.split('.')
  if (segments.length !== 3) {
    return null
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments
  const signingInput = `${headerSegment}.${payloadSegment}`
  const expectedSignature = createHmac('sha256', secret).update(signingInput).digest()
  const providedSignature = base64UrlDecode(signatureSegment)

  if (expectedSignature.length !== providedSignature.length) {
    return null
  }

  if (!timingSafeEqual(expectedSignature, providedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadSegment).toString()) as JwtPayload
    if (typeof payload.exp !== 'number' || typeof payload.sub !== 'string') {
      return null
    }
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return null
    }
    return payload
  } catch (error) {
    console.error('Failed to parse JWT payload', error)
    return null
  }
}
