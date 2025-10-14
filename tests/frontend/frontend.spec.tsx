import { describe, expect, it, vi } from 'vitest'

import { handleLoginAttempt } from '../../src/renderer/pages/Auth/LoginPage'
import { userCanAccessUsersPage } from '../../src/renderer/pages/Users/UsersPage'

describe('Front-end auth flows', () => {
  it('executa login com credenciais válidas', async () => {
    const signInMock = vi.fn().mockResolvedValue(true)
    const toastMock = vi.fn()
    const navigateMock = vi.fn()

    const result = await handleLoginAttempt(
      { signIn: signInMock, toast: toastMock, navigate: navigateMock },
      { email: 'user@example.com', password: 'password123' },
    )

    expect(signInMock).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' })
    expect(result.success).toBe(true)
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bem-vindo de volta!' }))
    expect(navigateMock).toHaveBeenCalledWith('/partners', { replace: true })
  })

  it('impede acesso à página de usuários sem permissão', () => {
    const hasRoleMock = vi.fn().mockReturnValue(false)

    expect(userCanAccessUsersPage(hasRoleMock)).toBe(false)
    expect(hasRoleMock).toHaveBeenCalledWith('ADMIN')
  })
})
