import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from '@/routes/RouterProvider'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast, type ToastVariant } from '@/components/ui/toast'

type LoginDependencies = {
  signIn: (credentials: { email: string; password: string }) => Promise<boolean>
  toast: (toast: { title: string; description?: string; variant?: ToastVariant }) => void
  navigate: (path: string, options?: { replace?: boolean }) => void
}

export async function handleLoginAttempt(
  dependencies: LoginDependencies,
  credentials: { email: string; password: string },
) {
  const success = await dependencies.signIn(credentials)
  if (!success) {
    return { success: false as const, error: 'Credenciais inválidas. Verifique email e senha.' }
  }

  dependencies.toast({ title: 'Bem-vindo de volta!', variant: 'success' })
  dependencies.navigate('/partners', { replace: true })

  return { success: true as const }
}

export function LoginPage() {
  const { signIn, loading, user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate('/partners', { replace: true })
    }
  }, [loading, user, navigate])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await handleLoginAttempt({ signIn, toast, navigate }, { email, password })
    setSubmitting(false)
    if (!result.success) {
      setError(result.error)
      return
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-bg to-muted px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-bold text-fg">Gerenciador de Parceiros</h1>
          <p className="text-sm text-fg/70">Acesse sua conta para continuar</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-fg" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="voce@empresa.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-fg" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-fg/60">
          <button type="button" onClick={() => setForgotOpen(true)} className="font-medium text-primary hover:underline">
            Esqueci minha senha
          </button>
          <span>Suporte: admin@local</span>
        </div>
      </div>

      <Dialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Recuperação de acesso"
        description="Entre em contato com um administrador para redefinir sua senha."
        footer={<Button onClick={() => setForgotOpen(false)}>Entendi</Button>}
      >
        <p className="text-sm text-fg/70">
          Por segurança, apenas um administrador pode redefinir senhas. Envie um e-mail para o time de suporte informando seu
          usuário e aguarde a geração de uma nova senha temporária.
        </p>
      </Dialog>
    </div>
  )
}
