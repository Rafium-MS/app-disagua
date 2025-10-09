import { describe, expect, it } from 'vitest'

import { buildCorsOptions } from '../../../src/server/config/cors'

const execOriginCheck = (
  originHandler: Required<ReturnType<typeof buildCorsOptions>>['origin'],
  origin?: string | null
) =>
  new Promise<boolean>((resolve, reject) => {
    originHandler(origin ?? undefined, (error, allowed) => {
      if (error) {
        reject(error)
        return
      }

      resolve(Boolean(allowed))
    })
  })

describe('buildCorsOptions', () => {
  it('honra origens configuradas explicitamente', async () => {
    const corsOptions = buildCorsOptions({
      env: {
        CORS_ALLOWED_ORIGINS: 'https://app.example.com, https://admin.example.com'
      } as NodeJS.ProcessEnv
    })

    await expect(execOriginCheck(corsOptions.origin!, 'https://app.example.com')).resolves.toBe(true)
    await expect(execOriginCheck(corsOptions.origin!, 'https://malicious.example')).rejects.toThrow(
      'Origin not allowed by CORS'
    )
  })

  it('permite fallback local em desenvolvimento', async () => {
    const corsOptions = buildCorsOptions({ env: {} as NodeJS.ProcessEnv })

    await expect(execOriginCheck(corsOptions.origin!, 'http://localhost:5173')).resolves.toBe(true)
    await expect(execOriginCheck(corsOptions.origin!, undefined)).resolves.toBe(true)
  })
})
