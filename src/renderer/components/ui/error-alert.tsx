import { AlertCircle, RefreshCw, XCircle } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export type ErrorAlertProps = {
  title?: string
  message?: string
  error?: Error | unknown
  onRetry?: () => void
  variant?: 'default' | 'destructive' | 'warning'
  className?: string
}

export function ErrorAlert({
  title = 'Erro ao carregar dados',
  message,
  error,
  onRetry,
  variant = 'destructive',
  className,
}: ErrorAlertProps) {
  const errorMessage = message || (error instanceof Error ? error.message : 'Ocorreu um erro inesperado')

  const variantStyles = {
    default: 'border-border bg-card text-fg',
    destructive: 'border-red-400/60 bg-red-500/10 text-red-400',
    warning: 'border-amber-400/60 bg-amber-500/10 text-amber-400',
  }

  const Icon = variant === 'warning' ? AlertCircle : XCircle

  return (
    <div
      className={cn(
        'rounded-xl border p-4 shadow-sm',
        variantStyles[variant],
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm opacity-90">{errorMessage}</p>
          </div>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export type InlineErrorProps = {
  message?: string
  error?: Error | unknown
  className?: string
}

export function InlineError({ message, error, className }: InlineErrorProps) {
  const errorMessage = message || (error instanceof Error ? error.message : 'Erro')

  return (
    <div className={cn('flex items-center gap-2 text-sm text-red-400', className)}>
      <XCircle className="h-4 w-4 flex-shrink-0" />
      <span>{errorMessage}</span>
    </div>
  )
}
