import { useMemo, useState } from 'react'

import { DataTable, type ColumnConfig } from '@/components/DataTable'
import { FilterBar, FilterSelect } from '@/components/FilterBar'
import { StatusBadge } from '@/components/StatusBadge'
import type { ReportDetail } from '@/hooks/useReportsData'

const statusTone: Record<string, 'emerald' | 'amber' | 'rose'> = {
  Válido: 'emerald',
  Pendente: 'amber',
  Rejeitado: 'rose',
}

export type VouchersTabProps = {
  report: ReportDetail
}

export function VouchersTab({ report }: VouchersTabProps) {
  const [filters, setFilters] = useState({ status: 'all', partner: 'all', store: 'all' })

  const vouchers = useMemo(() => {
    return report.vouchers.filter((voucher) => {
      if (filters.status !== 'all' && voucher.status !== filters.status) {
        return false
      }
      if (filters.partner !== 'all' && voucher.partner !== filters.partner) {
        return false
      }
      if (filters.store !== 'all' && voucher.store !== filters.store) {
        return false
      }
      return true
    })
  }, [report.vouchers, filters])

  const columns: ColumnConfig<(typeof vouchers)[number]>[] = [
    { key: 'file', header: 'Arquivo' },
    { key: 'partner', header: 'Parceiro' },
    { key: 'store', header: 'Loja' },
    {
      key: 'date',
      header: 'Data',
      render: (voucher) => new Date(voucher.date).toLocaleDateString('pt-BR'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (voucher) => <StatusBadge status={voucher.status} tone={statusTone[voucher.status]} />,
    },
    {
      key: 'checklist',
      header: 'Checklist',
      render: (voucher) => (
        <div className="text-xs text-slate-300">
          <p>Assinatura: {voucher.checklist.assinatura ? 'OK' : 'Pendente'}</p>
          <p>Data: {voucher.checklist.data ? 'OK' : 'Pendente'}</p>
          <p>Legível: {voucher.checklist.legivel ? 'OK' : 'Pendente'}</p>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <FilterBar>
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(value) => setFilters((previous) => ({ ...previous, status: value }))}
          options={[
            { label: 'Todos', value: 'all' },
            { label: 'Válidos', value: 'Válido' },
            { label: 'Pendentes', value: 'Pendente' },
            { label: 'Rejeitados', value: 'Rejeitado' },
          ]}
        />
        <FilterSelect
          label="Parceiro"
          value={filters.partner}
          onChange={(value) => setFilters((previous) => ({ ...previous, partner: value }))}
          options={[{ label: 'Todos', value: 'all' }].concat(
            Array.from(new Set(report.vouchers.map((voucher) => voucher.partner))).map((partner) => ({
              label: partner,
              value: partner,
            })),
          )}
        />
        <FilterSelect
          label="Loja"
          value={filters.store}
          onChange={(value) => setFilters((previous) => ({ ...previous, store: value }))}
          options={[{ label: 'Todas', value: 'all' }].concat(
            Array.from(new Set(report.vouchers.map((voucher) => voucher.store))).map((store) => ({
              label: store,
              value: store,
            })),
          )}
        />
      </FilterBar>

      <DataTable
        data={vouchers}
        columns={columns}
        getRowId={(voucher) => voucher.id}
        emptyMessage="Nenhum comprovante encontrado"
      />
    </div>
  )
}
