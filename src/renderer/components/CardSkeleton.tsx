import { Skeleton, SkeletonText } from './ui/skeleton'

export type CardSkeletonProps = {
  showHeader?: boolean
  rows?: number
}

export function CardSkeleton({ showHeader = true, rows = 3 }: CardSkeletonProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {showHeader && (
        <div className="mb-4 space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonText key={index} />
        ))}
      </div>
    </div>
  )
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  )
}
