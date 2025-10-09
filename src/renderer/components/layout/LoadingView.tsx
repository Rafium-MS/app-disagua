export type LoadingViewProps = {
  message?: string
}

export function LoadingView({ message = 'Carregando' }: LoadingViewProps) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-400">
      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
        <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
        {message}
      </div>
    </div>
  )
}
