import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, ShieldAlert } from 'lucide-react'
import { DataTable, type ColumnConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { USER_ROLES, type UserRoleName } from '@shared/auth'

export function userCanAccessUsersPage(hasRole: (role: UserRoleName) => boolean) {
  return hasRole('ADMIN')
}

const PAGE_SIZE = 10

type UserListItem = {
  id: string
  name: string
  email: string
  status: 'ACTIVE' | 'INACTIVE'
  roles: UserRoleName[]
  lastLoginAt: string | null
}

type UsersResponse = {
  data: UserListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

type FormState = {
  open: boolean
  mode: 'create' | 'edit'
  user?: UserListItem
}

type RolesState = {
  open: boolean
  user?: UserListItem
}

type ResetState = {
  open: boolean
  user?: UserListItem
  temporaryPassword?: string
}

export function UsersPage() {
  const { authenticatedFetch, hasRole } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserListItem[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [formState, setFormState] = useState<FormState>({ open: false, mode: 'create' })
  const [rolesState, setRolesState] = useState<RolesState>({ open: false })
  const [resetState, setResetState] = useState<ResetState>({ open: false })

  const loadUsers = useCallback(
    async (page = pagination.page) => {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim().length > 0) {
        params.set('q', search.trim())
      }
      if (status !== 'ALL') {
        params.set('status', status)
      }
      params.set('page', String(page))
      params.set('pageSize', String(PAGE_SIZE))

      const response = await authenticatedFetch(`/api/users?${params.toString()}`)
      if (!response.ok) {
        toast({ title: 'Erro ao carregar usuários', variant: 'error' })
        setLoading(false)
        return
      }
      const data = (await response.json()) as UsersResponse
      setUsers(data.data)
      setPagination(data.pagination)
      setLoading(false)
    },
    [authenticatedFetch, pagination.page, search, status, toast],
  )

  useEffect(() => {
    if (!userCanAccessUsersPage(hasRole)) {
      setLoading(false)
      return
    }
    void loadUsers(1)
  }, [hasRole, loadUsers])

  const handleCreateUser = () => {
    setFormState({ open: true, mode: 'create' })
  }

  const handleToggleStatus = useCallback(
    async (user: UserListItem) => {
      const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      const response = await authenticatedFetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!response.ok) {
        toast({ title: 'Não foi possível atualizar o status', variant: 'error' })
        return
      }
      toast({ title: `Usuário ${nextStatus === 'ACTIVE' ? 'ativado' : 'desativado'}`, variant: 'success' })
      await loadUsers(pagination.page)
    },
    [authenticatedFetch, loadUsers, pagination.page, toast],
  )

  const handleResetPassword = useCallback(
    async (user: UserListItem) => {
      const response = await authenticatedFetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast({ title: data.error ?? 'Não foi possível resetar a senha', variant: 'error' })
      return
      }
      const data = (await response.json()) as { temporaryPassword: string }
      setResetState({ open: true, user, temporaryPassword: data.temporaryPassword })
      toast({ title: 'Senha temporária gerada', variant: 'success' })
    },
    [authenticatedFetch, setResetState, toast],
  )

  const handleRolesSubmit = useCallback(
    async (userId: string, roles: UserRoleName[]) => {
      const response = await authenticatedFetch(`/api/users/${userId}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles }),
      })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast({ title: data.error ?? 'Não foi possível atualizar as funções', variant: 'error' })
      return
      }
      toast({ title: 'Funções atualizadas', variant: 'success' })
      setRolesState({ open: false })
      await loadUsers(pagination.page)
    },
    [authenticatedFetch, loadUsers, pagination.page, setRolesState, toast],
  )

  const columns = useMemo<ColumnConfig<UserListItem>[]>(
    () => [
      { key: 'name', header: 'Nome', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (user) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
            }`}
          >
            {user.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
          </span>
        ),
      },
      {
        key: 'roles',
        header: 'Funções',
        render: (user) => (
          <div className="flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <span key={role} className="rounded-full bg-muted px-2 py-0.5 text-xs text-fg/70">
                {role}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: 'lastLoginAt',
        header: 'Último acesso',
        render: (user) =>
          user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : <span className="text-fg/50">Nunca</span>,
      },
      {
        key: 'actions',
        header: 'Ações',
        render: (user) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFormState({ open: true, mode: 'edit', user })}
            >
              Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRolesState({ open: true, user })}>
              Permissões
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleResetPassword(user)}>
              Resetar senha
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleToggleStatus(user)}
              className={user.status === 'ACTIVE' ? 'text-yellow-400' : 'text-emerald-400'}
            >
              {user.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
            </Button>
          </div>
        ),
      },
    ],
    [handleResetPassword, handleToggleStatus],
  )

  const handleDelete = async (user: UserListItem) => {
    const response = await authenticatedFetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast({ title: data.error ?? 'Não foi possível excluir usuário', variant: 'error' })
      return
    }
    toast({ title: 'Usuário desativado', variant: 'success' })
    await loadUsers(pagination.page)
  }

  if (!userCanAccessUsersPage(hasRole)) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold text-fg">Acesso restrito</h2>
        <p className="mt-2 text-sm text-fg/70">
          Somente administradores podem gerenciar usuários. Solicite acesso ao time responsável.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Gestão de usuários</h1>
          <p className="text-sm text-fg/70">Crie novos acessos, redefina senhas e controle permissões por função.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-fg/60">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <span>Somente administradores podem acessar esta página</span>
          </div>
          <Button onClick={handleCreateUser} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo usuário
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col">
              <label className="text-xs font-semibold uppercase tracking-wide text-fg/60" htmlFor="search">
                Buscar
              </label>
              <input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome ou email"
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex w-full flex-col sm:w-48">
              <label className="text-xs font-semibold uppercase tracking-wide text-fg/60" htmlFor="statusFilter">
                Status
              </label>
              <select
                id="statusFilter"
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => loadUsers(1)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>

        <div className="mt-6">
          <DataTable
            data={users}
            columns={columns}
            pageSize={users.length || 1}
            emptyMessage={loading ? 'Carregando usuários...' : 'Nenhum usuário encontrado'}
            footer={
              <div className="flex items-center justify-between px-4 py-3 text-xs text-fg/70">
                <span>
                  Exibindo {users.length} de {pagination.total} usuários
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => loadUsers(pagination.page - 1)}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {pagination.page} de {Math.max(pagination.totalPages, 1)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => loadUsers(pagination.page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            }
          />
        </div>
      </section>

      <UserFormDialog
        state={formState}
        onClose={() => setFormState((prev) => ({ ...prev, open: false }))}
        onSubmit={async (values) => {
          if (formState.mode === 'create') {
            const response = await authenticatedFetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            })
            if (!response.ok) {
              const data = await response.json().catch(() => ({}))
              toast({ title: data.error ?? 'Não foi possível criar usuário', variant: 'error' })
              return
            }
            toast({ title: 'Usuário criado com sucesso', variant: 'success' })
          } else if (formState.user) {
            const response = await authenticatedFetch(`/api/users/${formState.user.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            })
            if (!response.ok) {
              const data = await response.json().catch(() => ({}))
              toast({ title: data.error ?? 'Não foi possível atualizar usuário', variant: 'error' })
              return
            }
            toast({ title: 'Usuário atualizado', variant: 'success' })
          }
          setFormState({ open: false, mode: 'create' })
          await loadUsers()
        }}
        onDelete={formState.user ? () => handleDelete(formState.user!) : undefined}
      />

      <RolesDialog
        state={rolesState}
        onClose={() => setRolesState({ open: false })}
        onSubmit={handleRolesSubmit}
      />

      <ResetPasswordDialog state={resetState} onClose={() => setResetState({ open: false })} />
    </div>
  )
}

type UserFormValues = {
  name: string
  email: string
  password?: string
  status: 'ACTIVE' | 'INACTIVE'
}

type UserFormDialogProps = {
  state: FormState
  onClose: () => void
  onSubmit: (values: UserFormValues) => Promise<void>
  onDelete?: () => void
}

function UserFormDialog({ state, onClose, onSubmit, onDelete }: UserFormDialogProps) {
  const isEdit = state.mode === 'edit'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (state.open && state.user) {
      setName(state.user.name)
      setEmail(state.user.email)
      setStatus(state.user.status)
    } else if (state.open) {
      setName('')
      setEmail('')
      setPassword('')
      setStatus('ACTIVE')
    }
  }, [state])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    await onSubmit({ name, email, status, password: isEdit ? undefined : password })
    setSubmitting(false)
  }

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      title={isEdit ? 'Editar usuário' : 'Novo usuário'}
      description={isEdit ? 'Atualize as informações de acesso do colaborador.' : 'Crie um usuário com senha temporária.'}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {isEdit && onDelete && (
            <Button type="button" variant="ghost" className="text-red-500" onClick={onDelete}>
              Desativar usuário
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" form="user-form" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="user-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium text-fg" htmlFor="name">
            Nome completo
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-fg" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {!isEdit && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-fg" htmlFor="password">
              Senha temporária
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-fg/60">Informe uma senha inicial que o usuário deverá alterar após o primeiro login.</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-fg" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'ACTIVE' | 'INACTIVE')}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </div>
      </form>
    </Dialog>
  )
}

type RolesDialogProps = {
  state: RolesState
  onClose: () => void
  onSubmit: (userId: string, roles: UserRoleName[]) => Promise<void>
}

function RolesDialog({ state, onClose, onSubmit }: RolesDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<UserRoleName[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (state.open && state.user) {
      setSelectedRoles(state.user.roles)
    }
  }, [state])

  if (!state.user) {
    return null
  }

  const toggleRole = (role: UserRoleName) => {
    setSelectedRoles((previous) =>
      previous.includes(role) ? previous.filter((item) => item !== role) : [...previous, role],
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    await onSubmit(state.user!.id, selectedRoles)
    setSubmitting(false)
  }

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      title="Permissões de acesso"
      description={`Defina quais permissões ${state.user.name} poderá utilizar no sistema.`}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="roles-form" disabled={submitting || selectedRoles.length === 0}>
            {submitting ? 'Salvando...' : 'Salvar permissões'}
          </Button>
        </>
      }
    >
      <form id="roles-form" className="space-y-3" onSubmit={handleSubmit}>
        <fieldset className="space-y-3">
          {USER_ROLES.map((role) => {
            const checkboxId = `role-${role.toLowerCase()}`
            return (
              <label
                key={role}
                htmlFor={checkboxId}
                aria-label={`Alternar permissão ${role}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2"
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={() => toggleRole(role)}
                  className="h-4 w-4"
                />
                <div>
                  <span className="text-sm font-medium text-fg">{role}</span>
                  <p className="text-xs text-fg/60">
                    {role === 'OPERADOR'
                      ? 'Lançamento e validação de comprovantes.'
                      : role === 'SUPERVISOR'
                        ? 'Aprovação de relatórios e edição de preços.'
                        : 'Administração completa do sistema.'}
                  </p>
                </div>
              </label>
            )
          })}
        </fieldset>
      </form>
    </Dialog>
  )
}

type ResetPasswordDialogProps = {
  state: ResetState
  onClose: () => void
}

function ResetPasswordDialog({ state, onClose }: ResetPasswordDialogProps) {
  if (!state.user) {
    return null
  }

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      title="Senha temporária gerada"
      description={`Compartilhe a senha abaixo com ${state.user.name}.`}
      footer={<Button onClick={onClose}>Fechar</Button>}
    >
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-fg/50">Senha temporária</p>
        <p className="mt-2 text-2xl font-mono font-semibold text-primary">{state.temporaryPassword}</p>
        <p className="mt-4 text-xs text-fg/60">Solicite que o usuário altere a senha no primeiro acesso.</p>
      </div>
    </Dialog>
  )
}
