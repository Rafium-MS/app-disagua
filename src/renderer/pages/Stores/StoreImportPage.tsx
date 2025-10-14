import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ImportMapping, type ImportMappingValue } from '@/components/ImportMapping'
import { useToast } from '@/components/ui/toast'
import { useNavigate, useRouteInfo } from '@/routes/RouterProvider'

type ImportResult = {
  created: number
  updated: number
  skipped: number
  conflicts: Array<{ row: number; reason: string }>
}

type BrandDetails = {
  id: string
  name: string
  partner: { id: number; name: string }
}

export function StoreImportPage() {
  const { toast } = useToast()
  const { query } = useRouteInfo()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<ImportMappingValue>({})
  const [allowCreateBrand, setAllowCreateBrand] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [brand, setBrand] = useState<BrandDetails | null>(null)

  const brandId = query.get('brandId') ?? ''

  useEffect(() => {
    if (!brandId) {
      return
    }
    async function loadBrand() {
      try {
        const response = await fetch(`/api/brands/${brandId}`)
        if (!response.ok) throw new Error('Erro ao carregar marca')
        const payload = (await response.json()) as BrandDetails
        setBrand(payload)
      } catch (error) {
        console.error(error)
        toast({ title: 'Não foi possível carregar a marca informada', variant: 'error' })
      }
    }
    loadBrand()
  }, [brandId, toast])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    setResult(null)
    if (!selected) {
      setFile(null)
      setColumns([])
      return
    }

    try {
      const buffer = await selected.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const firstRow = rows[0]
      const detectedColumns = firstRow ? Object.keys(firstRow) : []
      setFile(selected)
      setColumns(detectedColumns)
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro ao ler planilha', variant: 'error' })
      setFile(null)
      setColumns([])
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      toast({ title: 'Selecione um arquivo XLSX', variant: 'error' })
      return
    }

    const requiredKeys = ['colPartner', 'colBrand', 'colStoreName', 'colDeliveryPlace'] as const
    for (const key of requiredKeys) {
      if (!mapping[key]) {
        toast({ title: 'Preencha os campos obrigatórios do mapeamento', variant: 'error' })
        return
      }
    }

    setSubmitting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mapping', JSON.stringify({ mapping, allowCreateBrand }))
      const response = await fetch('/api/stores/import', { method: 'POST', body: formData })
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.error || 'Importação não concluída')
      }
      const payload = (await response.json()) as ImportResult
      setResult(payload)
      toast({ title: 'Importação concluída', variant: 'success' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao importar lojas',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-fg">Importar lojas via XLSX</h1>
        <p className="text-sm text-fg/60">
          Faça o upload da planilha e informe como cada coluna deve ser interpretada. Campos obrigatórios incluem parceiro, marca,
          nome da loja e local de entrega.
        </p>
        {brand && (
          <p className="text-sm text-fg/70">
            Importando para a marca <strong>{brand.name}</strong> do parceiro <strong>{brand.partner.name}</strong>.
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/70">Arquivo XLSX</h2>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase text-fg/60">Selecione a planilha</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
            </label>
            {file && <p className="text-xs text-fg/60">Arquivo selecionado: {file.name}</p>}
          </div>
        </section>

        {columns.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/70">Mapeamento de colunas</h2>
                <p className="mt-1 text-xs text-fg/60">
                  Relacione as colunas da planilha com os campos do sistema. Campos com * são obrigatórios.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowCreateBrand}
                  onChange={(event) => setAllowCreateBrand(event.target.checked)}
                />
                Permitir criação de novas marcas
              </label>
            </div>
            <div className="mt-4">
              <ImportMapping columns={columns} value={mapping} onChange={setMapping} />
            </div>
          </section>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(brandId ? `/brands/${brandId}/stores` : '/brands')}>
            Cancelar
          </Button>
          <Button type="submit" className="flex items-center gap-2" disabled={submitting || !file}>
            {submitting && <Upload className="h-4 w-4 animate-spin" />} Importar lojas
          </Button>
        </div>
      </form>

      {result && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg/70">Resumo da importação</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Criadas" value={result.created} />
            <SummaryCard label="Atualizadas" value={result.updated} />
            <SummaryCard label="Ignoradas" value={result.skipped} />
            <SummaryCard label="Conflitos" value={result.conflicts.length} />
          </div>
          {result.conflicts.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-fg">Linhas com conflitos</h3>
              <ul className="mt-2 space-y-1 text-sm text-fg/70">
                {result.conflicts.map((conflict, index) => (
                  <li key={index}>
                    Linha {conflict.row}: {conflict.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

type SummaryCardProps = {
  label: string
  value: number
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
      <div className="text-xs uppercase text-fg/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-fg">{value}</div>
    </div>
  )
}
