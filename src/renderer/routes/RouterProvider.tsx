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
import { NotFoundPage } from '@/pages/NotFoundPage'

export type RouterMatch = {
  route: RouteDefinition
  params: Record<string, string>
}

type RouterContextValue = {
  path: string
  query: URLSearchParams
  navigate: (to: string, options?: { replace?: boolean }) => void
  activeRoute: RouteDefinition | null
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
      return { path: '/partners', query: new URLSearchParams() }
    }
    const parsed = parseLocation(window.location.hash || '#/partners')
    if (!window.location.hash) {
      window.location.hash = '#/partners'
    }
    return parsed
  })

  useEffect(() => {
    const handler = () => {
      setLocation(parseLocation(window.location.hash || '#/partners'))
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

  const value = useMemo<RouterContextValue>(
    () => ({ path, query, navigate, activeRoute }),
    [path, query, navigate, activeRoute],
  )

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

  return (
    <RouterContext.Provider value={value}>
      <AppLayout>{content}</AppLayout>
    </RouterContext.Provider>
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
  const { activeRoute, path, query } = useRouterContext()
  return { activeRoute, path, query }
}
