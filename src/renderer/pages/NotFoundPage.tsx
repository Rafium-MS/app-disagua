import type { RouteComponentProps } from '@/types/router'

export function NotFoundPage({ navigate }: Pick<RouteComponentProps, 'navigate'>) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full border border-slate-800 bg-slate-900/70 px-6 py-3 text-sm font-semibold text-emerald-300">
        404
      </div>
      <h1 className="text-2xl font-semibold text-slate-100">Página não encontrada</h1>
      <p className="max-w-md text-sm text-slate-400">
        O conteúdo que você tentou acessar não existe ou foi movido. Escolha uma opção no menu lateral ou
        volte para a listagem de parceiros.
      </p>
      <button
        type="button"
        onClick={() => navigate('/partners')}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400"
      >
        Ir para parceiros
      </button>
    </div>
  )
}
