import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from '@/routes/RouterProvider'
import { LoadingView } from '@/components/layout/LoadingView'

export function LogoutPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const execute = async () => {
      await signOut()
      navigate('/login', { replace: true })
    }
    void execute()
  }, [signOut, navigate])

  return <LoadingView message="Encerrando sessão" />
}
