import { useEffect, useMemo, useState } from 'react'

export type PendingPartnerApiPayload = {
  id: number
  name: string
  document: string
  email: string | null
  reportVoucherStats: {
    total: number
    valid: number
    redeemed: number
    lastIssuedAt: string | null
  }
}

export type PendingPartnersPagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type PendingPartnersState =
  | { status: 'idle'; data: []; pagination: null }
  | {
      status: 'loading'
      data: PendingPartnerApiPayload[]
      pagination: PendingPartnersPagination | null
    }
  | { status: 'success'; data: PendingPartnerApiPayload[]; pagination: PendingPartnersPagination }
  | { status: 'error'; data: []; pagination: null }

type UsePendingPartnersOptions = {
  reportId?: number
  search?: string
  page?: number
  pageSize?: number
}

const defaultPagination: PendingPartnersPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
}

export function usePendingPartners(options: UsePendingPartnersOptions): PendingPartnersState {
  const { reportId, page = 1, pageSize = 10 } = options
  const normalizedSearch = useMemo(() => options.search?.trim() ?? '', [options.search])
  const [state, setState] = useState<PendingPartnersState>({
    status: 'idle',
    data: [],
    pagination: null
  })

  useEffect(() => {
    if (typeof reportId !== 'number') {
      setState({ status: 'idle', data: [], pagination: null })
      return
    }

    let canceled = false
    const controller = new AbortController()

    setState((previous) => ({
      status: 'loading',
      data: previous.status === 'success' ? previous.data : [],
      pagination: previous.pagination
    }))

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    if (normalizedSearch.length > 0) {
      params.set('search', normalizedSearch)
    }

    const url = `http://localhost:5174/api/reports/${reportId}/pending-partners?${params.toString()}`

    fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (canceled) {
          return
        }

        const data = Array.isArray(payload?.data)
          ? (payload.data as PendingPartnerApiPayload[])
          : []
        const pagination =
          typeof payload?.pagination === 'object' && payload.pagination
            ? (payload.pagination as PendingPartnersPagination)
            : defaultPagination

        setState({ status: 'success', data, pagination })
      })
      .catch((error) => {
        if (canceled || controller.signal.aborted) {
          return
        }

        if (
          typeof error === 'object' &&
          error &&
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
  }, [normalizedSearch, page, pageSize, reportId])

  return state
}
