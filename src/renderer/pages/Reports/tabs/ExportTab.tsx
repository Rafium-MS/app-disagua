import { useState } from 'react'
import { FolderOpen } from 'lucide-react'

import type { ReportDetail } from '@/hooks/useReportsData'

export type ExportTabProps = {
  report: ReportDetail
}

export function ExportTab({ report }: ExportTabProps) {
  const [options, setOptions] = useState({ format: 'pdf', validOnly: false, groupBy: 'partner' })
  const [lastExport, setLastExport] = useState<string | null>(null)

  const handleExport = () => {
    const path = `data/exports/${report.id}-${options.format}`
    setLastExport(path)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-wide text-slate-500">Formato</span>
          <select
            value={options.format}
            onChange={(event) => setOptions((previous) => ({ ...previous, format: event.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2"
          >
            <option value="pdf">PDF único</option>
            <option value="zip">ZIP</option>
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-wide text-slate-500">Conteúdo</span>
          <select
            value={options.validOnly ? 'valid' : 'all'}
            onChange={(event) =>
              setOptions((previous) => ({ ...previous, validOnly: event.target.value === 'valid' }))
            }
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2"
          >
            <option value="all">Todos os comprovantes</option>
            <option value="valid">Somente válidos</option>
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-wide text-slate-500">Agrupar por</span>
          <select
            value={options.groupBy}
            onChange={(event) => setOptions((previous) => ({ ...previous, groupBy: event.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2"
          >
            <option value="partner">Parceiro</option>
            <option value="store">Loja</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={handleExport}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
      >
        Gerar exportação
      </button>

      {lastExport && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
          <FolderOpen className="h-4 w-4" /> Arquivo gerado em <code>{lastExport}</code>{' '}
          <a href="#" className="underline">
            Abrir pasta
          </a>
        </div>
      )}
    </div>
  )
}
