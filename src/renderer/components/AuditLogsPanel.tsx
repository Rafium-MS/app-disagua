import { type FormEvent, useCallback, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'

import { useAuditLogs } from '@/hooks/useAuditLogs'

const pageSize = 10

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

export function AuditLogsPanel() {
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [fromFilter, setFromFilter] = useState('')
  const [toFilter, setToFilter] = useState('')
  const [page, setPage] = useState(1)

  const filters = useMemo(
    () => ({
      entity: entityFilter,
      action: actionFilter,
      actor: actorFilter,
      from: fromFilter,
      to: toFilter,
      page,
      pageSize,
    }),
    [entityFilter, actionFilter, actorFilter, fromFilter, toFilter, page],
  )

  const logsState = useAuditLogs(filters)

  const resetPagination = useCallback(() => {
    setPage(1)
  }, [])

  const handleFilterSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
  }, [])

  const handleClearFilters = useCallback(() => {
    setEntityFilter('')
    setActionFilter('')
    setActorFilter('')
    setFromFilter('')
    setToFilter('')
    setPage(1)
  }, [])

  const inputClasses =
    'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

  return (
    <section className="space-y-5 rounded-2xl border border-border/60 bg-card/90 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-fg">Auditoria de mudanças</h2>
          <p className="text-sm text-fg/70">
            Consulte ações relevantes registradas automaticamente pelo sistema.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="space-y-1">
          <span className="block text-sm font-medium text-fg">Entidade</span>
          <input
            value={entityFilter}
            onChange={(event) => {
              setEntityFilter(event.target.value)
              resetPagination()
            }}
            placeholder="Partner, Report..."
            className={inputClasses}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-fg">Ação</span>
          <input
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value)
              resetPagination()
            }}
            placeholder="create, update..."
            className={inputClasses}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-fg">Autor</span>
          <input
            value={actorFilter}
            onChange={(event) => {
              setActorFilter(event.target.value)
              resetPagination()
            }}
            placeholder="Identificador do usuário"
            className={inputClasses}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-fg">De</span>
          <input
            type="date"
            value={fromFilter}
            onChange={(event) => {
              setFromFilter(event.target.value)
              resetPagination()
            }}
            className={inputClasses}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-fg">Até</span>
          <input
            type="date"
            value={toFilter}
            onChange={(event) => {
              setToFilter(event.target.value)
              resetPagination()
            }}
            className={inputClasses}
          />
        </label>
        <div className="flex items-center gap-2">
          <Button type="submit" className="flex-1">
            Aplicar filtros
          </Button>
          <Button type="button" variant="outline" onClick={handleClearFilters}>
            Limpar
          </Button>
        </div>
      </form>

      <div className="overflow-auto rounded-xl border border-border">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-fg/60">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3">Requisição</th>
              <th className="px-4 py-3">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {logsState.status === 'loading' && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-fg/60">
                  Carregando registros...
                </td>
              </tr>
            )}
            {logsState.status === 'error' && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-500">
                  Não foi possível carregar os logs de auditoria.
                </td>
              </tr>
            )}
            {logsState.status === 'success' && logsState.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-fg/60">
                  Nenhum registro encontrado para os filtros informados.
                </td>
              </tr>
            )}
            {logsState.status === 'success' &&
              logsState.data.map((log) => (
                <tr key={log.id} className="odd:bg-card even:bg-muted/20">
                  <td className="px-4 py-3 align-top font-medium text-fg">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-fg">{log.entity}</div>
                    {log.entityId && <div className="text-xs text-fg/60">ID: {log.entityId}</div>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-fg">{log.action}</div>
                    {log.requestId && <div className="text-xs text-fg/60">Req: {log.requestId}</div>}
                  </td>
                  <td className="px-4 py-3 align-top text-fg/80">{log.actor ? log.actor : '—'}</td>
                  <td className="px-4 py-3 align-top">
                    <div>{log.requestMethod ?? '—'}</div>
                    <div className="truncate text-xs text-fg/60" title={log.requestUrl ?? undefined}>
                      {log.requestUrl ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <pre className="max-h-32 overflow-auto rounded-lg bg-muted px-2 py-1 text-xs text-fg/80">
                      {log.changes ? log.changes : '—'}
                    </pre>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {logsState.status === 'success' && logsState.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg/70">
            Página {logsState.pagination.page} de {logsState.pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={logsState.pagination.page <= 1}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={logsState.pagination.page >= logsState.pagination.totalPages}
              onClick={() => setPage((previous) => previous + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
