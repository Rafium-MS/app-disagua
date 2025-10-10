import { useMemo } from 'react'
import { clsx } from 'clsx'
import { routeDefinitions } from '@/routes/appRoutes'
import { useNavigate, useRouteInfo } from '@/routes/RouterProvider'
import { useAuth } from '@/hooks/useAuth'

type AppSidebarProps = {
  onNavigate?: () => void
  className?: string
}

export function AppSidebar({ onNavigate, className }: AppSidebarProps) {
  const { path } = useRouteInfo()
  const navigate = useNavigate()
  const { hasRole } = useAuth()

  const items = useMemo(
    () =>
      routeDefinitions.filter((route) => {
        if (!route.sidebar) {
          return false
        }
        if (!route.requiredRoles) {
          return true
        }
        return hasRole(...route.requiredRoles)
      }),
    [hasRole],
  )

  return (
    <div className={clsx('flex h-full min-h-0 flex-col gap-8 overflow-y-auto p-6', className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
          <span className="text-xl font-bold">DG</span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fg/70">Diságua</p>
          <p className="text-sm text-fg/60">Gestor de comprovantes</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = path.startsWith(item.path)
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => {
                navigate(item.path)
                onNavigate?.()
              }}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-fg/70 hover:bg-muted hover:text-fg',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-border bg-card p-4 text-sm text-fg/70">
        <p className="font-semibold text-fg">Status da sincronização</p>
        <p className="mt-1">Última atualização há 5 minutos.</p>
      </div>
    </div>
  )
}
