import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const spinnerVariants = cva('inline-block animate-spin rounded-full border-2 border-solid', {
  variants: {
    size: {
      sm: 'h-4 w-4 border-2',
      default: 'h-6 w-6 border-2',
      lg: 'h-8 w-8 border-2',
      xl: 'h-12 w-12 border-[3px]',
    },
    variant: {
      default: 'border-primary border-t-transparent',
      primary: 'border-primary border-t-transparent',
      secondary: 'border-muted border-t-transparent',
      success: 'border-emerald-500 border-t-transparent',
      error: 'border-red-500 border-t-transparent',
      warning: 'border-amber-500 border-t-transparent',
      light: 'border-white/30 border-t-white',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
})

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

export function Spinner({ className, size, variant, label, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label || 'Carregando'}
      className={cn(spinnerVariants({ size, variant }), className)}
      {...props}
    >
      <span className="sr-only">{label || 'Carregando...'}</span>
    </div>
  )
}

export interface SpinnerOverlayProps {
  show: boolean
  message?: string
  size?: VariantProps<typeof spinnerVariants>['size']
  variant?: VariantProps<typeof spinnerVariants>['variant']
  className?: string
}

export function SpinnerOverlay({
  show,
  message = 'Carregando...',
  size = 'lg',
  variant = 'primary',
  className,
}: SpinnerOverlayProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4 rounded-xl bg-card border border-border p-6 shadow-lg">
        <Spinner size={size} variant={variant} label={message} />
        {message && <p className="text-sm text-fg/70">{message}</p>}
      </div>
    </div>
  )
}

export interface SpinnerButtonProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  size?: VariantProps<typeof spinnerVariants>['size']
  className?: string
}

export function SpinnerButton({
  loading,
  children,
  loadingText,
  size = 'sm',
  className,
}: SpinnerButtonProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {loading && <Spinner size={size} variant="light" />}
      {loading && loadingText ? loadingText : children}
    </span>
  )
}
