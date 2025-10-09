import type { UploadItem } from '@/components/Uploader'

export type MappingRow = {
  id: string
  fileName: string
  partnerId: string
  storeId: string
  date: string
  value: string
  checklist: { assinatura: boolean; data: boolean; legivel: boolean }
}

export type MappingTableProps = {
  rows: MappingRow[]
  partners: Array<{ id: string; name: string }>
  stores: Array<{ id: string; name: string }>
  onChange: (rows: MappingRow[]) => void
}

export function buildInitialRows(items: UploadItem[]): MappingRow[] {
  return items.map((item, index) => ({
    id: `row-${index}`,
    fileName: item.file.name,
    partnerId: '',
    storeId: '',
    date: '',
    value: '',
    checklist: { assinatura: false, data: false, legivel: false },
  }))
}

export function MappingTable({ rows, partners, stores, onChange }: MappingTableProps) {
  const updateRow = (rowId: string, partial: Partial<MappingRow>) => {
    onChange(rows.map((row) => (row.id === rowId ? { ...row, ...partial } : row)))
  }

  const updateChecklist = (rowId: string, key: keyof MappingRow['checklist'], value: boolean) => {
    onChange(
      rows.map((row) =>
        row.id === rowId ? { ...row, checklist: { ...row.checklist, [key]: value } } : row,
      ),
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
        <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">Arquivo</th>
            <th className="px-4 py-3 text-left">Parceiro</th>
            <th className="px-4 py-3 text-left">Loja</th>
            <th className="px-4 py-3 text-left">Data</th>
            <th className="px-4 py-3 text-left">Valor</th>
            <th className="px-4 py-3 text-left">Checklist</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-100">{row.fileName}</p>
              </td>
              <td className="px-4 py-3">
                <select
                  value={row.partnerId}
                  onChange={(event) => updateRow(row.id, { partnerId: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Selecione</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <select
                  value={row.storeId}
                  onChange={(event) => updateRow(row.id, { storeId: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Selecione</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <input
                  type="date"
                  value={row.date}
                  onChange={(event) => updateRow(row.id, { date: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.value}
                  onChange={(event) => updateRow(row.id, { value: event.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.checklist.assinatura}
                      onChange={(event) => updateChecklist(row.id, 'assinatura', event.target.checked)}
                    />
                    Assinatura OK
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.checklist.data}
                      onChange={(event) => updateChecklist(row.id, 'data', event.target.checked)}
                    />
                    Data OK
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.checklist.legivel}
                      onChange={(event) => updateChecklist(row.id, 'legivel', event.target.checked)}
                    />
                    Legível OK
                  </label>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
