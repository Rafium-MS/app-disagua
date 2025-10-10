import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginPage } from '../../src/renderer/pages/Auth/LoginPage'
import { UsersPage } from '../../src/renderer/pages/Users/UsersPage'
import { ToastProvider } from '../../src/renderer/components/ui/toast'

const navigateMock = vi.fn()
const useAuthMock = vi.fn()

vi.mock('@/routes/RouterProvider', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

describe('Front-end auth flows', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useAuthMock.mockReset()
  })

  it('executa login com credenciais válidas', async () => {
    const signInMock = vi.fn().mockResolvedValue(true)
    useAuthMock.mockReturnValue({
      signIn: signInMock,
      loading: false,
      user: null,
    })

    render(
      <ToastProvider>
        <LoginPage />
      </ToastProvider>,
    )

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' })
    })
  })

  it('impede acesso à página de usuários sem permissão', () => {
    useAuthMock.mockReturnValue({
      hasRole: vi.fn().mockReturnValue(false),
      authenticatedFetch: vi.fn(),
    })

    render(
      <ToastProvider>
        <UsersPage />
      </ToastProvider>,
    )

    expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument()
  })
})
