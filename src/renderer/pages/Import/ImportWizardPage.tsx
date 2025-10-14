import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { ProgressBar } from '@/components/ProgressBar'
import { UploadZone } from './UploadZone'
import {
  MappingTable,
  buildInitialRows,
  type MappingRow,
} from './MappingTable'
import type { UploadItem } from '@/components/Uploader'
import type { RouteComponentProps } from '@/types/router'

const steps = [
  { id: 1, title: 'Seleção', description: 'Escolha o relatório e contexto dos comprovantes.' },
  { id: 2, title: 'Upload', description: 'Envie os arquivos com arraste-e-solte.' },
  { id: 3, title: 'Mapeamento & Validação', description: 'Associe cada arquivo à loja e confirme checklist.' },
  { id: 4, title: 'Revisão & Confirmar', description: 'Revise os dados e finalize o envio.' },
]

const partnersOptions = [
  { id: 'p-001', name: 'Aquarius Group' },
  { id: 'p-002', name: 'Fonte Viva' },
  { id: 'p-003', name: 'Rio Claro Distribuidora' },
]

const storesOptions = [
  { id: 's-01', name: 'Loja Paulista' },
  { id: 's-02', name: 'Unidade Pampulha' },
  { id: 's-03', name: 'Filial Niterói' },
]

export function ImportWizardPage(_props: RouteComponentProps) {
  const [step, setStep] = useState(1)
  const [selection, setSelection] = useState({ reportId: 'r-001', partnerId: 'all', storeId: 'all' })
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([])
  const [submitted, setSubmitted] = useState(false)

  const progress = useMemo(() => (step / steps.length) * 100, [step])

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1)
    } else {
      setSubmitted(true)
    }
  }

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleUploadsChange = (items: UploadItem[]) => {
    setUploadItems(items)
    setMappingRows(buildInitialRows(items))
  }

  const { validCount, pendingCount } = useMemo(() => {
    const valid = mappingRows.filter(
      (row) => row.checklist.assinatura && row.checklist.data && row.checklist.legivel,
    ).length

    return {
      validCount: valid,
      pendingCount: mappingRows.length - valid,
    }
  }, [mappingRows])

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Importar comprovantes</h1>
            <p className="text-sm text-slate-400">
              Fluxo guiado para subir comprovantes em lote com validação.
            </p>
          </div>
          <div className="hidden items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-wide text-slate-400 lg:flex">
            <span>Passo {step}</span>
            <span className="text-slate-600">/</span>
            <span>{steps.length}</span>
          </div>
        </div>
        <ProgressBar value={progress} label={`${step} de ${steps.length} etapas`} />
      </header>

      <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <ol className="grid gap-4 md:grid-cols-4">
          {steps.map((wizardStep) => (
            <li
              key={wizardStep.id}
              className={`rounded-xl border p-4 text-sm transition ${
                wizardStep.id === step
                  ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                  : wizardStep.id < step
                  ? 'border-emerald-400/50 bg-emerald-500/5 text-emerald-200'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400'
              }`}
            >
              <p className="text-xs uppercase tracking-wide">Passo {wizardStep.id}</p>
              <h3 className="mt-2 text-base font-semibold">{wizardStep.title}</h3>
              <p className="text-xs text-slate-400">{wizardStep.description}</p>
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-wide text-slate-500">Relatório</span>
                <select
                  value={selection.reportId}
                  onChange={(event) => setSelection((previous) => ({ ...previous, reportId: event.target.value }))}
                  className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2"
                >
                  <option value="r-001">Abril/2024 - Região Sudeste</option>
                  <option value="r-002">Março/2024 - Rede Nacional</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-wide text-slate-500">Parceiro (opcional)</span>
                <select
                  value={selection.partnerId}
                  onChange={(event) => setSelection((previous) => ({ ...previous, partnerId: event.target.value }))}
                  className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2"
                >
                  <option value="all">Detectar automaticamente</option>
                  {partnersOptions.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-wide text-slate-500">Loja (opcional)</span>
                <select
                  value={selection.storeId}
                  onChange={(event) => setSelection((previous) => ({ ...previous, storeId: event.target.value }))}
                  className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2"
                >
                  <option value="all">Detectar automaticamente</option>
                  {storesOptions.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
              As seleções acima serão usadas como padrão durante o mapeamento, mas podem ser ajustadas arquivo a arquivo.
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <UploadZone onChange={handleUploadsChange} />
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
              <span>Fila com re-tentativas automáticas ativadas.</span>
              <button
                type="button"
                onClick={() => {
                  setUploadItems([])
                  setMappingRows([])
                }}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
              >
                Desfazer últimos uploads
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {mappingRows.length === 0 ? (
              <EmptyState
                title="Nenhum arquivo ainda"
                description="Faça o upload dos comprovantes para mapear lojas e validar o checklist."
              />
            ) : (
              <MappingTable
                rows={mappingRows}
                partners={partnersOptions}
                stores={storesOptions}
                onChange={setMappingRows}
              />
            )}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-lg font-semibold text-slate-100">Resumo</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Total enviados: {uploadItems.length}</li>
                <li>Checklist completo: {validCount}</li>
                <li>Pendentes de dados: {pendingCount}</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-lg font-semibold text-slate-100">Próximos passos</h3>
              <p className="mt-2 text-sm text-slate-400">
                Ao confirmar, os comprovantes serão salvos em <code>data/uploads/</code> e vinculados ao relatório selecionado.
              </p>
              {submitted && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" /> Importação concluída.{' '}
                  <a href="#/reports/${selection.reportId}" className="underline">
                    Ver relatório
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-emerald-400"
          >
            {step === steps.length ? 'Enviar comprovantes' : 'Continuar'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  )
}
