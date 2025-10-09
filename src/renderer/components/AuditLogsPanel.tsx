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
    timeStyle: 'medium'
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
      pageSize
    }),
    [entityFilter, actionFilter, actorFilter, fromFilter, toFilter, page]
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

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Auditoria de mudanças</h2>
          <p className="text-sm text-muted-foreground">
            Consulte ações relevantes registradas automaticamente pelo sistema.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="grid gap-4 rounded-lg border bg-background p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="space-y-1">
          <span className="block text-sm font-medium text-foreground">Entidade</span>
          <input
            value={entityFilter}
            onChange={(event) => {
              setEntityFilter(event.target.value)
              resetPagination()
            }}
            placeholder="Partner, Report..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-foreground">Ação</span>
          <input
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value)
              resetPagination()
            }}
            placeholder="create, update..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-foreground">Autor</span>
          <input
            value={actorFilter}
            onChange={(event) => {
              setActorFilter(event.target.value)
              resetPagination()
            }}
            placeholder="Identificador do usuário"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-foreground">De</span>
          <input
            type="date"
            value={fromFilter}
            onChange={(event) => {
              setFromFilter(event.target.value)
              resetPagination()
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-medium text-foreground">Até</span>
          <input
            type="date"
            value={toFilter}
            onChange={(event) => {
              setToFilter(event.target.value)
              resetPagination()
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3">Requisição</th>
              <th className="px-4 py-3">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {logsState.status === 'loading' && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Carregando registros...
                </td>
              </tr>
            )}
            {logsState.status === 'error' && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  Não foi possível carregar os logs de auditoria.
                </td>
              </tr>
            )}
            {logsState.status === 'success' && logsState.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum registro encontrado para os filtros informados.
                </td>
              </tr>
            )}
            {logsState.status === 'success' &&
              logsState.data.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 align-top font-medium text-foreground">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-foreground">{log.entity}</div>
                    {log.entityId && (
                      <div className="text-xs text-muted-foreground">ID: {log.entityId}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-foreground">{log.action}</div>
                    {log.requestId && (
                      <div className="text-xs text-muted-foreground">Req: {log.requestId}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {log.actor ? log.actor : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div>{log.requestMethod ?? '—'}</div>
                    <div
                      className="truncate text-xs text-muted-foreground"
                      title={log.requestUrl ?? undefined}
                    >
                      {log.requestUrl ?? '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <pre className="max-h-32 overflow-auto rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
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
          <span className="text-muted-foreground">
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
