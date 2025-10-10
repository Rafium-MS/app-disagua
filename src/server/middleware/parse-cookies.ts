import type { RequestHandler } from 'express'

function parseCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, chunk) => {
    const [rawName, ...rawValue] = chunk.split('=')
    if (!rawName) {
      return acc
    }
    const name = rawName.trim()
    const value = rawValue.join('=').trim()
    if (!name) {
      return acc
    }
    acc[name] = decodeURIComponent(value)
    return acc
  }, {})
}

export const parseCookiesMiddleware: RequestHandler = (req, _res, next) => {
  const cookies = parseCookieHeader(req.headers.cookie)
  if (Object.keys(cookies).length > 0) {
    req.auth = {
      ...req.auth,
      accessToken: req.auth?.accessToken ?? cookies['access_token'],
      refreshToken: req.auth?.refreshToken ?? cookies['refresh_token'],
    }
  }
  next()
}
