import { useMemo, useState } from 'react'
import { BellRing, FileDown, Shuffle } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { useReportDetail } from '@/hooks/useReportsData'
import type { RouteComponentProps } from '@/types/router'
import { SummaryTab } from './tabs/SummaryTab'
import { VouchersTab } from './tabs/VouchersTab'
import { PendingTab } from './tabs/PendingTab'
import { ExportTab } from './tabs/ExportTab'
import { LogsTab } from './tabs/LogsTab'

const tabs = [
  { id: 'summary', label: 'Resumo' },
  { id: 'vouchers', label: 'Comprovantes' },
  { id: 'pending', label: 'Pendências' },
  { id: 'export', label: 'Exportar' },
  { id: 'logs', label: 'Logs' },
]

export function ReportDetailPage({ params, navigate }: RouteComponentProps) {
  const report = useReportDetail(params.id)
  const [activeTab, setActiveTab] = useState<string>('summary')

  const partnerDistribution = useMemo(() => report?.partners ?? [], [report])

  if (!report) {
    return (
      <EmptyState
        title="Relatório não encontrado"
        description="O relatório solicitado não existe. Volte para a lista e selecione outro período."
        action={
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Voltar para relatórios
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Relatórios · {report.period}</p>
            <h1 className="text-2xl font-semibold text-slate-100">{report.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">
              <Shuffle className="mr-2 inline h-4 w-4" /> Alterar status
            </button>
            <button className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">
              <FileDown className="mr-2 inline h-4 w-4" /> Exportar
            </button>
            <button className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200">
              <BellRing className="mr-2 inline h-4 w-4" /> Notificar pendências
            </button>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-900'
                  : 'border border-slate-700 text-slate-300 hover:border-emerald-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'summary' && <SummaryTab report={report} partnerDistribution={partnerDistribution} />}
      {activeTab === 'vouchers' && <VouchersTab report={report} />}
      {activeTab === 'pending' && <PendingTab report={report} />}
      {activeTab === 'export' && <ExportTab report={report} />}
      {activeTab === 'logs' && <LogsTab report={report} />}
    </div>
  )
}
