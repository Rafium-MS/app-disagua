import { cn } from '@/lib/utils'

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      {...props}
    />
  )
}

export function SkeletonText({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn('h-4 w-full', className)} {...props} />
}

export function SkeletonCircle({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn('h-12 w-12 rounded-full', className)} {...props} />
}

export function SkeletonButton({ className, ...props }: SkeletonProps) {
  return <Skeleton className={cn('h-10 w-24', className)} {...props} />
}
