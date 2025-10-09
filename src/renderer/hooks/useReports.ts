import { useEffect, useMemo, useState } from 'react'

type ReportApiPayload = {
  id: number
  title: string
  summary: string | null
  issuedAt: string
  partner: {
    id: number
    name: string
  }
}

export type ReportStatus = 'rascunho' | 'em revisão' | 'aprovado'

export type Report = ReportApiPayload & {
  status: ReportStatus
  referenceMonth: string
  referenceLabel: string
  expectedDeliveries: number
  receivedDeliveries: number
  period: {
    start: string
    end: string
  }
}

export type ReportsState =
  | { status: 'loading'; data: Report[] }
  | { status: 'success'; data: Report[] }
  | { status: 'error'; data: Report[] }

export type UseReportsOptions = {
  partnerId?: number | 'all'
}

const statusCycle: ReportStatus[] = ['aprovado', 'em revisão', 'rascunho']

const progressBaselines: Array<{ expected: number; received: number }> = [
  { expected: 320, received: 308 },
  { expected: 180, received: 142 },
  { expected: 120, received: 54 }
]

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

function buildReport(raw: ReportApiPayload, index: number): Report {
  const issuedDate = new Date(raw.issuedAt)
  const safeDate = Number.isNaN(issuedDate.getTime()) ? new Date() : issuedDate

  const periodStart = new Date(safeDate.getFullYear(), safeDate.getMonth(), 1)
  const periodEnd = new Date(safeDate.getFullYear(), safeDate.getMonth() + 1, 0, 23, 59, 59, 999)
  const referenceMonth = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`

  const status = statusCycle[index % statusCycle.length]
  const baseline = progressBaselines[index % progressBaselines.length]
  const growthFactor = Math.floor(index / progressBaselines.length) * 18
  const expected = Math.max(1, baseline.expected + growthFactor)
  const received = Math.min(expected, baseline.received + growthFactor - 6)

  const referenceLabel = monthFormatter.format(periodStart)

  return {
    ...raw,
    status,
    referenceMonth,
    referenceLabel: referenceLabel.charAt(0).toUpperCase() + referenceLabel.slice(1),
    expectedDeliveries: expected,
    receivedDeliveries: Math.max(0, received),
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString()
    }
  }
}

function normalizePartnerId(partnerId: UseReportsOptions['partnerId']) {
  return typeof partnerId === 'number' ? partnerId : undefined
}

export function useReports(options: UseReportsOptions = {}): ReportsState {
  const normalizedPartnerId = useMemo(
    () => normalizePartnerId(options.partnerId),
    [options.partnerId]
  )
  const [state, setState] = useState<ReportsState>({ status: 'loading', data: [] })

  useEffect(() => {
    let canceled = false
    const controller = new AbortController()

    setState((previous) => ({ status: 'loading', data: previous.data }))

    const params = new URLSearchParams()
    if (typeof normalizedPartnerId === 'number') {
      params.set('partnerId', String(normalizedPartnerId))
    }

    const url = `http://localhost:5174/reports${params.size > 0 ? `?${params.toString()}` : ''}`

    fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (canceled) {
          return
        }

        const rawData = Array.isArray(payload?.data) ? (payload.data as ReportApiPayload[]) : []
        const reports = rawData.map((report, index) => buildReport(report, index))
        setState({ status: 'success', data: reports })
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

        setState({ status: 'error', data: [] })
      })

    return () => {
      canceled = true
      controller.abort()
    }
  }, [normalizedPartnerId])

  return state
}
