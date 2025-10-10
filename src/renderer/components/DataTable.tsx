import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

export type ColumnConfig<T> = {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  accessor?: (row: T) => string | number | null | undefined
  align?: 'left' | 'center' | 'right'
  width?: string
}

export type DataTableProps<T> = {
  data: T[]
  columns: ColumnConfig<T>[]
  selectable?: boolean
  getRowId?: (row: T) => string
  pageSize?: number
  onSelectionChange?: (ids: string[]) => void
  emptyMessage?: string
  footer?: React.ReactNode
}

type SortState = {
  key: string
  direction: 'asc' | 'desc'
}

function defaultAccessor(row: unknown, key: string): string | number | null | undefined {
  if (row && typeof row === 'object' && key in row) {
    return (row as Record<string, unknown>)[key] as string | number | null | undefined
  }
  return undefined
}

export function DataTable<T>({
  data,
  columns,
  selectable = false,
  getRowId,
  pageSize = 8,
  onSelectionChange,
  emptyMessage = 'Nenhum registro encontrado',
  footer,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortState | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const resolvedGetRowId = useMemo<NonNullable<typeof getRowId>>(
    () =>
      getRowId ??
      ((row: T, index: number) => {
        const fallback = `${index}`
        if (row && typeof row === 'object' && 'id' in row) {
          const maybeId = (row as { id?: unknown }).id
          if (typeof maybeId === 'string' || typeof maybeId === 'number') {
            return String(maybeId)
          }
        }
        return fallback
      }),
    [getRowId],
  )

  const sortedData = useMemo(() => {
    if (!sort) {
      return data
    }

    const column = columns.find((item) => item.key === sort.key)
    if (!column) {
      return data
    }

    const accessor = column.accessor ?? ((row: T) => defaultAccessor(row, column.key))

    return [...data].sort((a, b) => {
      const aValue = accessor(a)
      const bValue = accessor(b)

      if (aValue === bValue) {
        return 0
      }

      if (aValue === undefined || aValue === null) {
        return sort.direction === 'asc' ? -1 : 1
      }
      if (bValue === undefined || bValue === null) {
        return sort.direction === 'asc' ? 1 : -1
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      return sort.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })
  }, [columns, data, sort])

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)

  const pageData = useMemo(
    () => sortedData.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [sortedData, currentPage, pageSize],
  )

  const toggleRow = (rowId: string) => {
    const next = new Set(selected)
    if (next.has(rowId)) {
      next.delete(rowId)
    } else {
      next.add(rowId)
    }
    setSelected(next)
    onSelectionChange?.([...next])
  }

  const toggleAll = () => {
    if (pageData.every((row, index) => selected.has(resolvedGetRowId(row, currentPage * pageSize + index)))) {
      const next = new Set(selected)
      pageData.forEach((row, index) => next.delete(resolvedGetRowId(row, currentPage * pageSize + index)))
      setSelected(next)
      onSelectionChange?.([...next])
      return
    }

    const next = new Set(selected)
    pageData.forEach((row, index) => next.add(resolvedGetRowId(row, currentPage * pageSize + index)))
    setSelected(next)
    onSelectionChange?.([...next])
  }

  const handleHeaderClick = (column: ColumnConfig<T>) => {
    if (!column.sortable) {
      return
    }

    setSort((previous) => {
      if (!previous || previous.key !== column.key) {
        return { key: column.key, direction: 'asc' }
      }

      if (previous.direction === 'asc') {
        return { key: column.key, direction: 'desc' }
      }

      return null
    })
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-xs sm:text-sm">
          <thead className="bg-slate-900/80 text-left text-[0.65rem] uppercase tracking-wide text-slate-500 sm:text-xs">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={toggleAll}
                    checked={
                      pageData.length > 0 &&
                      pageData.every((row, index) =>
                        selected.has(resolvedGetRowId(row, currentPage * pageSize + index)),
                      )
                    }
                  />
                </th>
              )}
              {columns.map((column) => {
                const isSorted = sort?.key === column.key
                return (
                  <th
                    key={column.key}
                    style={{ width: column.width }}
                    className={clsx('px-4 py-3 font-semibold text-slate-300', column.align === 'right' && 'text-right')}
                  >
                    <button
                      type="button"
                      className={clsx(
                        'flex items-center gap-1 text-xs uppercase tracking-wide',
                        column.sortable ? 'cursor-pointer select-none text-slate-300' : 'text-slate-400',
                      )}
                      onClick={() => handleHeaderClick(column)}
                    >
                      {column.header}
                      {column.sortable && isSorted && (sort?.direction === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-xs text-slate-200 sm:text-sm">
            {pageData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {pageData.map((row, index) => {
              const rowId = resolvedGetRowId(row, currentPage * pageSize + index)
              const isSelected = selected.has(rowId)
              return (
                <tr key={rowId} className={clsx(isSelected && 'bg-emerald-500/5')}>
                  {selectable && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(rowId)} />
                    </td>
                  )}
                  {columns.map((column) => {
                    const align = column.align ?? 'left'
                    const accessor = column.accessor ?? ((item: T) => defaultAccessor(item, column.key))
                    const content = column.render ? column.render(row) : accessor(row)
                    return (
                      <td
                        key={column.key}
                        className={clsx('px-4 py-3', align === 'right' && 'text-right', align === 'center' && 'text-center')}
                      >
                        {content}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Página {currentPage + 1} de {totalPages}
        </span>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            className="rounded border border-slate-700 p-1 text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200 disabled:opacity-40"
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
            className="rounded border border-slate-700 p-1 text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200 disabled:opacity-40"
            disabled={currentPage === totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      {footer && (
        <div className="border-t border-slate-800 bg-slate-950/30 p-4 text-xs text-slate-400">
          {footer}
        </div>
      )}
    </div>
  )
}
