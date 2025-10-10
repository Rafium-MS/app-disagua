import { randomBytes, createHash } from 'node:crypto'

const REFRESH_TOKEN_BYTES = 48

export function generateRefreshTokenValue(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function verifyRefreshToken(token: string, hash: string): boolean {
  return hashRefreshToken(token) === hash
}

export function serializeRefreshToken(id: string, token: string): string {
  return `${id}.${token}`
}

export function parseRefreshToken(rawToken?: string | null): { id: string; token: string } | null {
  if (!rawToken) {
    return null
  }

  const [id, token] = rawToken.split('.', 2)
  if (!id || !token) {
    return null
  }

  return { id, token }
}
