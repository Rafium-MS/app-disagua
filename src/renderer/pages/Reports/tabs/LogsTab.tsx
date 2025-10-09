import { DataTable, type ColumnConfig } from '@/components/DataTable'
import type { ReportDetail } from '@/hooks/useReportsData'

export type LogsTabProps = {
  report: ReportDetail
}

export function LogsTab({ report }: LogsTabProps) {
  const columns: ColumnConfig<ReportDetail['logs'][number]>[] = [
    {
      key: 'date',
      header: 'Data',
      render: (log) => new Date(log.date).toLocaleString('pt-BR'),
    },
    { key: 'user', header: 'Usuário' },
    { key: 'action', header: 'Ação' },
    {
      key: 'payload',
      header: 'Payload',
      render: (log) => <code className="break-words text-xs text-slate-400">{log.payload}</code>,
    },
  ]

  return (
    <DataTable
      data={report.logs}
      columns={columns}
      getRowId={(log) => log.id}
      emptyMessage="Sem registros de auditoria"
    />
  )
}
