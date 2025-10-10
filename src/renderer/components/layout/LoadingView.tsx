export type LoadingViewProps = {
  message?: string
}

export function LoadingView({ message = 'Carregando' }: LoadingViewProps) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-fg/60">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
        {message}
      </div>
    </div>
  )
}
