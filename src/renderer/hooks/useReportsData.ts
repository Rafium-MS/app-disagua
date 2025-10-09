import { useMemo } from 'react'

export type ReportSummary = {
  id: string
  name: string
  period: string
  expected: number
  valid: number
  status: 'Em Preenchimento' | 'Para Conferência' | 'Aprovado'
}

export type ReportDetail = ReportSummary & {
  partners: Array<{ partnerId: string; partnerName: string; pending: number; valid: number }>
  vouchers: Array<{
    id: string
    file: string
    partner: string
    store: string
    date: string
    status: 'Válido' | 'Pendente' | 'Rejeitado'
    checklist: { assinatura: boolean; data: boolean; legivel: boolean }
  }>
  logs: Array<{ id: string; date: string; user: string; action: string; payload: string }>
}

const reportsSeed: ReportDetail[] = [
  {
    id: 'r-001',
    name: 'Abril/2024 - Região Sudeste',
    period: '01/04/2024 - 30/04/2024',
    expected: 320,
    valid: 286,
    status: 'Para Conferência',
    partners: [
      { partnerId: 'p-001', partnerName: 'Aquarius Group', pending: 4, valid: 96 },
      { partnerId: 'p-002', partnerName: 'Fonte Viva', pending: 8, valid: 84 },
    ],
    vouchers: [
      {
        id: 'v-001',
        file: 'comprovante-001.pdf',
        partner: 'Aquarius Group',
        store: 'Loja Paulista',
        date: '2024-04-12',
        status: 'Válido',
        checklist: { assinatura: true, data: true, legivel: true },
      },
      {
        id: 'v-002',
        file: 'comprovante-002.jpg',
        partner: 'Fonte Viva',
        store: 'Unidade Pampulha',
        date: '2024-04-14',
        status: 'Pendente',
        checklist: { assinatura: false, data: true, legivel: true },
      },
    ],
    logs: [
      {
        id: 'l-001',
        date: '2024-05-02T15:20:00Z',
        user: 'Bruno Almeida',
        action: 'Status alterado para "Para Conferência"',
        payload: '{"de":"Em Preenchimento","para":"Para Conferência"}',
      },
    ],
  },
  {
    id: 'r-002',
    name: 'Março/2024 - Rede Nacional',
    period: '01/03/2024 - 31/03/2024',
    expected: 220,
    valid: 220,
    status: 'Aprovado',
    partners: [
      { partnerId: 'p-003', partnerName: 'Rio Claro Distribuidora', pending: 0, valid: 120 },
    ],
    vouchers: [],
    logs: [
      {
        id: 'l-002',
        date: '2024-04-01T08:15:00Z',
        user: 'Laura Gonçalves',
        action: 'Relatório aprovado',
        payload: '{}',
      },
    ],
  },
]

export function useReportsList(status: string, partnerId: string) {
  return useMemo(() => {
    return reportsSeed.filter((report) => {
      if (status !== 'all' && report.status !== status) {
        return false
      }
      if (partnerId !== 'all' && !report.partners.some((partner) => partner.partnerId === partnerId)) {
        return false
      }
      return true
    })
  }, [status, partnerId])
}

export function useReportDetail(reportId: string | undefined) {
  return useMemo(() => reportsSeed.find((report) => report.id === reportId), [reportId])
}
