const DEFAULT_ACCESS_EXPIRATION_SECONDS = 15 * 60
const DEFAULT_REFRESH_EXPIRATION_DAYS = 30

function parseExpiresIn(value: string | undefined) {
  if (!value) {
    return DEFAULT_ACCESS_EXPIRATION_SECONDS
  }

  const match = value.trim().match(/^(\d+)([smhd])$/i)
  if (!match) {
    const asNumber = Number.parseInt(value, 10)
    return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : DEFAULT_ACCESS_EXPIRATION_SECONDS
  }

  const amount = Number.parseInt(match[1], 10)
  const unit = match[2].toLowerCase()

  switch (unit) {
    case 's':
      return amount
    case 'm':
      return amount * 60
    case 'h':
      return amount * 60 * 60
    case 'd':
      return amount * 60 * 60 * 24
    default:
      return DEFAULT_ACCESS_EXPIRATION_SECONDS
  }
}

function parseRefreshDays(value: string | undefined) {
  if (!value) {
    return DEFAULT_REFRESH_EXPIRATION_DAYS
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFRESH_EXPIRATION_DAYS
}

export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  accessTokenExpiresInSeconds: parseExpiresIn(process.env.JWT_EXPIRES_IN),
  refreshTokenExpiresInDays: parseRefreshDays(process.env.REFRESH_EXPIRES_DAYS),
}
