import { type ReactNode, useState } from 'react'
import { AppSidebar } from './AppSidebar'
import { AppTopbar } from './AppTopbar'
import { ErrorBoundary } from '../ErrorBoundary'

type AppLayoutProps = {
  children: ReactNode
  topRight?: ReactNode
}

export function AppLayout({ children, topRight }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="relative grid min-h-screen bg-bg text-fg [grid-template-columns:16rem_1fr] lg:[grid-template-columns:18rem_1fr]">
      <aside className="hidden border-r border-border bg-card md:block">
        <AppSidebar className="h-full" />
      </aside>

      <main className="min-w-0">
        <AppTopbar onOpenSidebar={() => setSidebarOpen(true)} topRight={topRight} />
        <section className="p-3 sm:p-4 md:p-6">
          <div className="container mx-auto min-w-0 space-y-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </section>
      </main>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-bg/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-50 h-full w-72 max-w-[80%] border-r border-border bg-card shadow-xl">
            <AppSidebar className="h-full" onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  )
}
