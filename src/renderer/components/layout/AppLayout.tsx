import type { ReactNode } from 'react'
import { AppSidebar } from './AppSidebar'
import { AppTopbar } from './AppTopbar'

export type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col bg-slate-900">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto px-10 pb-12 pt-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
