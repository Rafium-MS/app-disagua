import { useMemo } from 'react'
import { clsx } from 'clsx'
import { routeDefinitions } from '@/routes/appRoutes'
import { useNavigate, useRouteInfo } from '@/routes/RouterProvider'

export function AppSidebar() {
  const { path } = useRouteInfo()
  const navigate = useNavigate()

  const items = useMemo(
    () => routeDefinitions.filter((route) => route.sidebar),
    [],
  )

  return (
    <aside className="hidden min-h-screen w-64 flex-col border-r border-slate-800 bg-slate-950/80 p-6 lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-slate-950">
          <span className="text-xl font-bold">DG</span>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-300">
            Diságua
          </p>
          <p className="text-xs text-slate-500">Gestor de comprovantes</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = path.startsWith(item.path)
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-300">Status da sincronização</p>
        <p className="mt-1">Última atualização há 5 minutos.</p>
      </div>
    </aside>
  )
}
