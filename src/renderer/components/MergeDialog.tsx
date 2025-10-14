import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export type DuplicateStore = {
  id: string
  name: string
  city: string
  state: string
  mall?: string | null
  cnpj?: string | null
  status: 'ACTIVE' | 'INACTIVE'
  updatedAt: string
  brand?: { id: string; name: string | null } | null
  partner?: { id: number; name: string | null } | null
}

export type DuplicateGroup = {
  id: string
  reason: 'NAME_CITY' | 'CNPJ'
  score: number
  stores: DuplicateStore[]
}

type MergeDialogProps = {
  open: boolean
  group: DuplicateGroup | null
  loading?: boolean
  onClose: () => void
  onMerge: (options: {
    targetId: string
    sourceIds: string[]
    strategy: 'target' | 'source' | 'mostRecent'
  }) => Promise<void>
}

export function MergeDialog({ open, group, loading = false, onClose, onMerge }: MergeDialogProps) {
  const [targetId, setTargetId] = useState<string | null>(null)
  const [sources, setSources] = useState<string[]>([])
  const [strategy, setStrategy] = useState<'target' | 'source' | 'mostRecent'>('mostRecent')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !group) {
      setTargetId(null)
      setSources([])
      setStrategy('mostRecent')
      setSubmitting(false)
      return
    }
    const sorted = [...group.stores].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    const defaultTarget = sorted[0]?.id ?? null
    setTargetId(defaultTarget)
    setSources(sorted.filter((store) => store.id !== defaultTarget).map((store) => store.id))
    setStrategy('mostRecent')
  }, [group, open])

  const selectableSources = useMemo(() => {
    if (!group) return []
    return group.stores.filter((store) => store.id !== targetId)
  }, [group, targetId])

  const handleToggleSource = (id: string) => {
    setSources((previous) =>
      previous.includes(id) ? previous.filter((sourceId) => sourceId !== id) : [...previous, id],
    )
  }

  const handleConfirm = async () => {
    if (!group || !targetId || sources.length === 0) {
      return
    }
    setSubmitting(true)
    try {
      await onMerge({ targetId, sourceIds: sources, strategy })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) {
          onClose()
        }
      }}
      title="Mesclar lojas duplicadas"
      description="Selecione a loja principal, quais registros serão mesclados e qual estratégia de preenchimento utilizar."
      size="lg"
    >
      {group ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card/40 p-4">
            <p className="text-sm text-fg/80">
              Motivo: <span className="font-semibold">{group.reason === 'CNPJ' ? 'CNPJ duplicado' : 'Nome/Cidade'}</span>
            </p>
            <p className="text-xs text-fg/60">Confiança {Math.round(group.score * 100)}%</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">Loja alvo</h3>
            <div className="space-y-3">
              {group.stores.map((store) => {
                const targetInputId = `merge-target-${store.id}`
                return (
                  <label
                    key={store.id}
                    htmlFor={targetInputId}
                    aria-label={`Selecionar ${store.name ?? 'loja'}`}
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2 text-sm transition ${
                      targetId === store.id ? 'border-emerald-400 bg-emerald-500/10' : 'border-border bg-card'
                    }`}
                  >
                  <div className="flex items-center gap-3">
                    <input
                      id={targetInputId}
                      type="radio"
                      name="target"
                      value={store.id}
                      checked={targetId === store.id}
                      onChange={() => setTargetId(store.id)}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="font-medium text-fg">{store.name}</p>
                      <p className="text-xs text-fg/60">
                        {store.city}/{store.state}
                        {store.mall ? ` • ${store.mall}` : ''}
                        {store.cnpj ? ` • ${store.cnpj}` : ''}
                      </p>
                    </div>
                  </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">Registros a mesclar</h3>
            <div className="space-y-2">
              {selectableSources.map((store) => {
                const sourceInputId = `merge-source-${store.id}`
                return (
                  <label
                    key={store.id}
                    htmlFor={sourceInputId}
                    aria-label={`Incluir ${store.name ?? 'loja'} na mesclagem`}
                    className="flex items-center gap-2 text-sm text-fg"
                  >
                  <input
                    id={sourceInputId}
                    type="checkbox"
                    checked={sources.includes(store.id)}
                    onChange={() => handleToggleSource(store.id)}
                    className="h-4 w-4"
                  />
                  <span>
                    {store.name} — {store.city}/{store.state}
                  </span>
                  </label>
                )
              })}
              {selectableSources.length === 0 && (
                <p className="text-xs text-fg/50">Selecione outra loja como alvo para mesclar os registros restantes.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">Estratégia de preenchimento</h3>
            <select
              value={strategy}
              onChange={(event) => setStrategy(event.target.value as 'target' | 'source' | 'mostRecent')}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="mostRecent">Usar dados mais recentes</option>
              <option value="target">Manter dados da loja alvo</option>
              <option value="source">Preferir dados dos registros mesclados</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || sources.length === 0 || !targetId || loading}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar mescla
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}
