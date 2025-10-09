import { ProgressBar } from '@/components/ProgressBar'
import { StatusBadge } from '@/components/StatusBadge'
import type { ReportDetail } from '@/hooks/useReportsData'

export type SummaryTabProps = {
  report: ReportDetail
  partnerDistribution: ReportDetail['partners']
}

export function SummaryTab({ report, partnerDistribution }: SummaryTabProps) {
  const progress = (report.valid / Math.max(report.expected, 1)) * 100
  const pending = Math.max(report.expected - report.valid, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-4">
          <Kpi label="Esperados" value={report.expected} />
          <Kpi label="Recebidos" value={report.valid + pending} />
          <Kpi label="Válidos" value={report.valid} tone="emerald" />
          <Kpi label="Pendentes" value={pending} tone="amber" />
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Progresso</h3>
          <ProgressBar value={progress} />
          <p className="text-xs text-slate-500">{report.valid} de {report.expected} comprovantes validados.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Distribuição por parceiro</h3>
        <ul className="space-y-3 text-sm text-slate-200">
          {partnerDistribution.map((partner) => (
            <li key={partner.partnerId} className="flex items-center justify-between">
              <span>{partner.partnerName}</span>
              <StatusBadge
                status={`${partner.valid} válidos / ${partner.pending} pendentes`}
                tone={partner.pending > 0 ? 'amber' : 'emerald'}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

type KpiProps = {
  label: string
  value: number
  tone?: 'emerald' | 'amber' | 'slate'
}

function Kpi({ label, value, tone = 'slate' }: KpiProps) {
  const colors = {
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    slate: 'text-slate-100',
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${colors[tone]}`}>{value}</p>
    </div>
  )
}
