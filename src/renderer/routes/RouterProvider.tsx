import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  Suspense,
} from 'react'

import { routeDefinitions, type RouteDefinition } from './appRoutes'
import type { RouteComponentProps } from '../types/router'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingView } from '@/components/layout/LoadingView'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useAuth } from '@/hooks/useAuth'
import { ProfileMenu } from '@/components/ProfileMenu'

export type RouterMatch = {
  route: RouteDefinition
  params: Record<string, string>
}

type RouterContextValue = {
  path: string
  query: URLSearchParams
  navigate: (to: string, options?: { replace?: boolean }) => void
  activeRoute: RouteDefinition | null
  params: Record<string, string>
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined)

function normalizePath(path: string): string {
  if (!path.startsWith('/')) {
    return `/${path}`
  }
  return path
}

function parseLocation(hash: string) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const [pathPart, queryPart] = raw.split('?')
  return {
    path: normalizePath(pathPart || '/'),
    query: new URLSearchParams(queryPart || ''),
  }
}

function matchPath(pattern: string, pathname: string) {
  const patternSegments = pattern.split('/').filter(Boolean)
  const pathSegments = pathname.split('/').filter(Boolean)

  if (patternSegments.length !== pathSegments.length) {
    return null
  }

  const params: Record<string, string> = {}

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index]
    const pathSegment = pathSegments[index]

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment)
      continue
    }

    if (patternSegment !== pathSegment) {
      return null
    }
  }

  return params
}

function findRoute(pathname: string): RouterMatch | null {
  for (const route of routeDefinitions) {
    const params = matchPath(route.path, pathname)
    if (params) {
      return { route, params }
    }
  }
  return null
}

type RouterProviderProps = {
  children?: ReactNode
}

export function RouterProvider({ children }: RouterProviderProps) {
  const [{ path, query }, setLocation] = useState(() => {
    if (typeof window === 'undefined') {
      return { path: '/login', query: new URLSearchParams() }
    }
    const parsed = parseLocation(window.location.hash || '#/login')
    if (!window.location.hash) {
      window.location.hash = '#/login'
    }
    return parsed
  })

  useEffect(() => {
    const handler = () => {
      setLocation(parseLocation(window.location.hash || '#/login'))
    }

    window.addEventListener('hashchange', handler)
    return () => {
      window.removeEventListener('hashchange', handler)
    }
  }, [])

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const normalized = to.startsWith('#') ? to : `#${normalizePath(to)}`
    if (options?.replace) {
      window.location.replace(normalized)
      return
    }
    window.location.hash = normalized
  }, [])

  const match = useMemo(() => findRoute(path), [path])
  const activeRoute = match?.route ?? null

  const params = match?.params ?? {}

  const value = useMemo<RouterContextValue>(
    () => ({ path, query, navigate, activeRoute, params }),
    [path, query, navigate, activeRoute, params],
  )

  const { user, loading, hasRole } = useAuth()

  useEffect(() => {
    if (!match) {
      return
    }
    if (loading) {
      return
    }
    const route = match.route
    if (route.requiresAuth === false) {
      if (route.path === '/login' && user) {
        navigate('/partners', { replace: true })
      }
      return
    }
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (route.requiredRoles && !hasRole(...route.requiredRoles)) {
      navigate('/partners', { replace: true })
    }
  }, [match, user, loading, hasRole, navigate])

  let content: ReactNode = children
  if (!content && match) {
    const RouteComponent = match.route.component
    const routeProps: RouteComponentProps = {
      path,
      params: match.params,
      query,
      navigate,
    }
    content = (
      <Suspense fallback={<LoadingView message="Carregando página" />}>
        <RouteComponent {...routeProps} />
      </Suspense>
    )
  }

  if (!match) {
    content = <NotFoundPage navigate={navigate} />
  }

  const requiresAuth = match?.route.requiresAuth !== false
  const requiredRoles = match?.route.requiredRoles

  if (requiresAuth) {
    if (loading) {
      content = <LoadingView message="Validando sessão" />
    } else if (!user) {
      content = null
    } else if (requiredRoles && !hasRole(...requiredRoles)) {
      content = (
        <div className="p-6">
          <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold text-fg">Acesso restrito</h2>
            <p className="mt-2 text-sm text-fg/70">
              Você não possui permissões suficientes para visualizar esta página.
            </p>
          </div>
        </div>
      )
    }
  }

  return (
    <ThemeProvider>
      <RouterContext.Provider value={value}>
        {requiresAuth ? (
          <AppLayout
            topRight={
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <ProfileMenu />
              </div>
            }
          >
            {content}
          </AppLayout>
        ) : (
          content
        )}
      </RouterContext.Provider>
    </ThemeProvider>
  )
}

export function useRouterContext() {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useRouterContext must be used within RouterProvider')
  }
  return context
}

export function useNavigate() {
  return useRouterContext().navigate
}

export function useRouteInfo() {
  const { activeRoute, path, query, params } = useRouterContext()
  return { activeRoute, path, query, params }
}
