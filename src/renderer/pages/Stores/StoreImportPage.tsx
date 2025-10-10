import { useEffect, useMemo, useState } from 'react'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import * as XLSX from 'xlsx'

import { Button } from '@/components/ui/button'
import { ImportMapping } from '@/components/ImportMapping'
import { useNavigate } from '@/routes/RouterProvider'
import { useToast } from '@/components/ui/toast'

type ImportStep = 'upload' | 'mapping' | 'preview' | 'result'

type MappingState = Parameters<typeof ImportMapping>[0]['value']

type ImportSummary = {
  created: number
  updated: number
  skipped: number
  conflicts: Array<{ row: number; reason: string }>
}

type PreviewRow = Record<string, unknown>

export function StoreImportPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<MappingState>({})
  const [allowCreateBrand, setAllowCreateBrand] = useState(true)
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [processing, setProcessing] = useState(false)

  const hasRequiredMapping = useMemo(() => {
    return Boolean(mapping.colPartner && mapping.colStoreName && mapping.colCity && mapping.colState)
  }, [mapping])

  useEffect(() => {
    if (step === 'upload') {
      setMapping({})
      setPreviewRows([])
      setSummary(null)
    }
  }, [step])

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) {
      return
    }
    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
      if (rows.length === 0) {
        throw new Error('Planilha sem dados')
      }
      setFile(selectedFile)
      setColumns(Object.keys(rows[0]))
      setPreviewRows(rows.slice(0, 5))
      setStep('mapping')
    } catch (error) {
      console.error(error)
      toast({ title: 'Não foi possível ler a planilha', variant: 'error' })
    }
  }

  const handleSubmitImport = async () => {
    if (!file) {
      return
    }
    setProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mapping', JSON.stringify(mapping))
      formData.append('allowCreateBrand', String(allowCreateBrand))

      const response = await fetch('/api/stores/import', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Falha ao importar lojas')
      }
      const payload = (await response.json()) as ImportSummary
      setSummary({ ...payload, conflicts: payload.conflicts ?? [] })
      setStep('result')
      toast({ title: 'Importação concluída', variant: 'success' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao importar planilha',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-fg">Importar lojas via XLSX</h1>
        <p className="text-sm text-fg/60">
          Faça o upload da planilha, mapeie as colunas e confirme os dados antes de atualizar o cadastro de lojas.
        </p>
      </header>

      {step === 'upload' ? (
        <section className="rounded-xl border border-dashed border-emerald-400/60 bg-emerald-500/5 p-6 text-center">
          <input
            id="file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
            className="hidden"
          />
          <label htmlFor="file" className="flex cursor-pointer flex-col items-center gap-3 text-sm text-fg/80">
            <ArrowLeft className="h-10 w-10 -rotate-90 text-emerald-400" />
            <span>
              Arraste a planilha para cá ou <span className="font-semibold text-emerald-400">clique para selecionar</span>
            </span>
          </label>
        </section>
      ) : null}

      {step === 'mapping' ? (
        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-fg">Mapeamento de colunas</h2>
          <ImportMapping columns={columns} value={mapping} onChange={setMapping} />
          <div className="flex items-center gap-2">
            <input
              id="allowBrand"
              type="checkbox"
              checked={allowCreateBrand}
              onChange={(event) => setAllowCreateBrand(event.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="allowBrand" className="text-sm text-fg/70">
              Criar marcas automaticamente quando não encontradas para o parceiro
            </label>
          </div>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep('upload')}>
              Voltar
            </Button>
            <Button type="button" onClick={() => setStep('preview')} disabled={!hasRequiredMapping}>
              Próxima etapa
            </Button>
          </div>
        </section>
      ) : null}

      {step === 'preview' ? (
        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-fg">Pré-visualização</h2>
          <p className="text-xs text-fg/60">
            Confira os primeiros registros antes de confirmar a importação. Apenas colunas mapeadas serão consideradas.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead className="bg-card/60 text-xs uppercase tracking-wide text-fg/60">
                <tr>
                  {Object.keys(mapping)
                    .filter((key) => mapping[key as keyof MappingState])
                    .map((key) => (
                      <th key={key} className="px-4 py-2 text-left">
                        {(mapping[key as keyof MappingState] as string) ?? key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card/40">
                {previewRows.map((row, index) => (
                  <tr key={index}>
                    {Object.keys(mapping)
                      .filter((key) => mapping[key as keyof MappingState])
                      .map((key) => (
                        <td key={key} className="px-4 py-2 text-xs text-fg/80">
                          {String(row[mapping[key as keyof MappingState] as string] ?? '')}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep('mapping')}>
              Voltar
            </Button>
            <Button type="button" onClick={handleSubmitImport} disabled={processing}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar importação
            </Button>
          </div>
        </section>
      ) : null}

      {step === 'result' && summary ? (
        <section className="space-y-4 rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-sm font-semibold">Importação finalizada</h2>
          </div>
          <ul className="space-y-2 text-sm text-fg/80">
            <li>
              <strong>{summary.created}</strong> lojas criadas
            </li>
            <li>
              <strong>{summary.updated}</strong> lojas atualizadas
            </li>
            <li>
              <strong>{summary.skipped}</strong> linhas ignoradas
            </li>
          </ul>
          {summary.conflicts.length > 0 ? (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200">
              <p className="font-semibold">Ocorreram conflitos:</p>
              <ul className="mt-2 space-y-1">
                {summary.conflicts.slice(0, 5).map((conflict) => (
                  <li key={`${conflict.row}-${conflict.reason}`}>
                    Linha {conflict.row}: {conflict.reason}
                  </li>
                ))}
                {summary.conflicts.length > 5 ? (
                  <li>+ {summary.conflicts.length - 5} outras ocorrências</li>
                ) : null}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/stores/duplicates')}>
              Analisar duplicadas
            </Button>
            <Button type="button" onClick={() => navigate('/stores')}>
              Voltar para lista
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
