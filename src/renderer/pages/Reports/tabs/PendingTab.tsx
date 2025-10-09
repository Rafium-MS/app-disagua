import { EmptyState } from '@/components/EmptyState'
import type { ReportDetail } from '@/hooks/useReportsData'

export type PendingTabProps = {
  report: ReportDetail
}

export function PendingTab({ report }: PendingTabProps) {
  const items = report.partners.filter((partner) => partner.pending > 0)

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sem pendências"
        description="Todos os parceiros entregaram os comprovantes válidos para este período."
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        {items.length} parceiro(s) com pendências de comprovantes válidos.
      </p>
      <ul className="space-y-3">
        {items.map((partner) => (
          <li
            key={partner.partnerId}
            className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-slate-100">{partner.partnerName}</p>
              <p className="text-xs text-slate-400">{partner.pending} loja(s) aguardando comprovantes válidos.</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">
                Abrir importação filtrada
              </button>
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">
                Cobrar por e-mail
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
