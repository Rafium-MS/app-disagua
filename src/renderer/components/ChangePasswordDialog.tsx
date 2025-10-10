import { FormEvent, useMemo, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'

export type ChangePasswordDialogProps = {
  open: boolean
  onClose: () => void
}

type PasswordFields = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const initialState: PasswordFields = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

function validatePassword(password: string) {
  const requirements = [
    password.length >= 8,
    /[a-zA-Z]/.test(password),
    /\d/.test(password),
  ]
  return requirements.every(Boolean)
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const [fields, setFields] = useState<PasswordFields>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { authenticatedFetch } = useAuth()
  const { toast } = useToast()

  const strength = useMemo(() => {
    const { newPassword } = fields
    if (!newPassword) {
      return 0
    }
    let score = 0
    if (newPassword.length >= 8) score += 1
    if (/[A-Z]/.test(newPassword)) score += 1
    if (/[a-z]/.test(newPassword)) score += 1
    if (/\d/.test(newPassword)) score += 1
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1
    return score
  }, [fields])

  const handleClose = () => {
    if (submitting) {
      return
    }
    setFields(initialState)
    setError(null)
    onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validatePassword(fields.newPassword)) {
      setError('A nova senha deve ter no mínimo 8 caracteres, com letras e números.')
      return
    }
    if (fields.newPassword !== fields.confirmPassword) {
      setError('A confirmação de senha não confere.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await authenticatedFetch('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: fields.currentPassword,
          newPassword: fields.newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível alterar a senha.')
        return
      }

      toast({
        title: 'Senha alterada com sucesso',
        variant: 'success',
      })
      setFields(initialState)
      onClose()
    } catch (submitError) {
      console.error(submitError)
      setError('Erro inesperado ao alterar a senha.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Alterar senha"
      description="Defina uma nova senha segura para sua conta."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="change-password-form" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar' }
          </Button>
        </>
      }
    >
      <form id="change-password-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium text-fg" htmlFor="currentPassword">
            Senha atual
          </label>
          <input
            id="currentPassword"
            type="password"
            required
            value={fields.currentPassword}
            onChange={(event) => setFields((prev) => ({ ...prev, currentPassword: event.target.value }))}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-fg" htmlFor="newPassword">
            Nova senha
          </label>
          <input
            id="newPassword"
            type="password"
            required
            value={fields.newPassword}
            onChange={(event) => setFields((prev) => ({ ...prev, newPassword: event.target.value }))}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(strength / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs text-fg/60">Força</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-fg" htmlFor="confirmPassword">
            Confirmar senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={fields.confirmPassword}
            onChange={(event) => setFields((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <p className="text-xs text-fg/60">
          Utilize pelo menos 8 caracteres com letras maiúsculas, minúsculas e números para fortalecer sua senha.
        </p>
      </form>
    </Dialog>
  )
}
