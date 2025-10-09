import type { CorsOptions } from 'cors'

type BuildCorsOptionsParams = {
  env?: NodeJS.ProcessEnv
}

const parseOrigins = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

export const buildCorsOptions = ({
  env = process.env
}: BuildCorsOptionsParams = {}): CorsOptions => {
  const configuredOrigins = parseOrigins(env.CORS_ALLOWED_ORIGINS)
  const fallbackOrigins =
    configuredOrigins.length > 0 || env.NODE_ENV === 'production' ? [] : ['http://localhost:5173']

  const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : fallbackOrigins
  const allowAllOrigins = allowedOrigins.includes('*')

  return {
    origin(origin, callback) {
      if (allowAllOrigins || !origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by CORS'))
    },
    credentials: true
  }
}
