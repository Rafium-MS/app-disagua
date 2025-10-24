import { Skeleton } from './ui/skeleton'

export type TableSkeletonProps = {
  rows?: number
  columns?: number
  showHeader?: boolean
}

export function TableSkeleton({ rows = 5, columns = 5, showHeader = true }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`header-${index}`} className="h-4 w-full" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-5 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

export type TableLoadingRowProps = {
  columns: number
}

export function TableLoadingRow({ columns }: TableLoadingRowProps) {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-6">
        <TableSkeleton rows={3} columns={columns} showHeader={false} />
      </td>
    </tr>
  )
}
