import { useEffect, useMemo, useState } from 'react'

export type AuditLog = {
  id: number
  createdAt: string
  action: string
  entity: string
  entityId: string | null
  actor: string | null
  requestId: string | null
  requestMethod: string | null
  requestUrl: string | null
  ipAddress: string | null
  changes: string | null
}

export type AuditLogPagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type AuditLogFilters = {
  entity?: string
  action?: string
  actor?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

type AuditLogsState =
  | { status: 'loading'; data: AuditLog[]; pagination: AuditLogPagination | null }
  | { status: 'success'; data: AuditLog[]; pagination: AuditLogPagination }
  | { status: 'error'; data: AuditLog[]; pagination: AuditLogPagination | null }

const serializeFilters = (filters: AuditLogFilters) => {
  const entries = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  )
  return Object.fromEntries(entries)
}

export function useAuditLogs(filters: AuditLogFilters): AuditLogsState {
  const serializedFilters = useMemo(() => serializeFilters(filters), [filters])
  const [state, setState] = useState<AuditLogsState>({
    status: 'loading',
    data: [],
    pagination: null
  })

  useEffect(() => {
    let canceled = false
    const controller = new AbortController()

    setState((previous) => ({
      status: 'loading',
      data: previous.data,
      pagination: previous.pagination
    }))

    const params = new URLSearchParams()
    Object.entries(serializedFilters).forEach(([key, value]) => {
      params.set(key, String(value))
    })

    const query = params.toString()
    const url = `http://localhost:5174/audit-logs${query ? `?${query}` : ''}`

    fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (canceled) {
          return
        }

        if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
          const pagination = payload.pagination as AuditLogPagination | undefined
          if (
            pagination &&
            typeof pagination.page === 'number' &&
            typeof pagination.pageSize === 'number' &&
            typeof pagination.total === 'number' &&
            typeof pagination.totalPages === 'number'
          ) {
            setState({ status: 'success', data: payload.data as AuditLog[], pagination })
            return
          }
        }

        setState({ status: 'error', data: [], pagination: null })
      })
      .catch((error) => {
        if (canceled || controller.signal.aborted) {
          return
        }

        if (
          error &&
          typeof error === 'object' &&
          'name' in error &&
          (error as { name?: string }).name === 'AbortError'
        ) {
          return
        }

        setState({ status: 'error', data: [], pagination: null })
      })

    return () => {
      canceled = true
      controller.abort()
    }
  }, [serializedFilters])

  return state
}
