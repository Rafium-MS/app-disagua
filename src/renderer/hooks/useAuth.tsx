import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type {
  AuthenticatedUser,
  LoginRequest,
  LoginResponse,
} from '@shared/auth'
import { createApiUrl } from '@/config/api'

const SESSION_STORAGE_KEY = 'app.auth.user'

type AuthContextValue = {
  user: AuthenticatedUser | null
  roles: string[]
  accessToken: string | null
  loading: boolean
  signIn: (credentials: LoginRequest) => Promise<boolean>
  signOut: () => Promise<void>
  refresh: () => Promise<boolean>
  hasRole: (...roles: string[]) => boolean
  authenticatedFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): AuthenticatedUser | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as AuthenticatedUser
  } catch (error) {
    console.warn('Failed to parse stored auth user', error)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(() => readStoredUser())
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null)
  const accessTokenRef = useRef<string | null>(null)

  const setSession = useCallback((nextUser: AuthenticatedUser | null, token: string | null) => {
    setUser(nextUser)
    setAccessToken(token)
    accessTokenRef.current = token
    if (typeof window !== 'undefined') {
      if (nextUser) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser))
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const promise = (async () => {
      try {
        const response = await fetch(createApiUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
        if (!response.ok) {
          setSession(null, null)
          return false
        }
        const data = (await response.json()) as LoginResponse
        setSession(data.user, data.accessToken)
        return true
      } catch (error) {
        console.error('Failed to refresh session', error)
        setSession(null, null)
        return false
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    refreshPromiseRef.current = promise
    return promise
  }, [setSession])

  useEffect(() => {
    let mounted = true
    const bootstrap = async () => {
      await refresh()
      if (mounted) {
        setLoading(false)
      }
    }
    bootstrap()
    return () => {
      mounted = false
    }
  }, [refresh])

  const signIn = useCallback(
    async (credentials: LoginRequest) => {
      try {
        const response = await fetch(createApiUrl('/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
          credentials: 'include',
        })
        if (!response.ok) {
          return false
        }
        const data = (await response.json()) as LoginResponse
        setSession(data.user, data.accessToken)
        return true
      } catch (error) {
        console.error('Failed to sign in', error)
        return false
      }
    },
    [setSession],
  )

  const signOut = useCallback(async () => {
    try {
      await fetch(createApiUrl('/auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
    } catch (error) {
      console.warn('Failed to logout cleanly', error)
    } finally {
      setSession(null, null)
    }
  }, [setSession])

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) {
        return false
      }
      const userRoles = new Set(user.roles)
      return roles.some((role) => userRoles.has(role))
    },
    [user],
  )

  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  const authenticatedFetch = useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      // Converte caminhos relativos em URLs absolutas usando createApiUrl
      const url = typeof input === 'string' ? createApiUrl(input) : input

      const headers = new Headers(init?.headers)
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
      }

      const response = await fetch(url, {
        ...init,
        headers,
        credentials: 'include',
      })

      if (response.status !== 401) {
        return response
      }

      const refreshed = await refresh()
      if (!refreshed) {
        await signOut()
        return response
      }

      const retryHeaders = new Headers(init?.headers)
      const latestToken = accessTokenRef.current
      if (latestToken) {
        retryHeaders.set('Authorization', `Bearer ${latestToken}`)
      }

      return fetch(url, {
        ...init,
        headers: retryHeaders,
        credentials: 'include',
      })
    },
    [accessToken, refresh, signOut],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roles: user?.roles ?? [],
      accessToken,
      loading,
      signIn,
      signOut,
      refresh,
      hasRole,
      authenticatedFetch,
    }),
    [user, accessToken, loading, signIn, signOut, refresh, hasRole, authenticatedFetch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
