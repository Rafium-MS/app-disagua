import type { UserRoleName } from '../shared/auth'

declare module 'express-serve-static-core' {
  interface Request {
    auth?: {
      accessToken?: string
      refreshToken?: string
    }
    user?: {
      id: string
      email: string
      name: string
      roles: UserRoleName[]
    }
  }
}
