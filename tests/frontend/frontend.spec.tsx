import { describe, expect, it, vi } from 'vitest'

import { handleLoginAttempt } from '../../src/renderer/pages/Auth/LoginPage'
import { loadMonthlySummary } from '../../src/renderer/pages/Reports/PartnersMonthlyTable'
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

describe('loadMonthlySummary', () => {
  it('utiliza o fetch autenticado para carregar o resumo mensal', async () => {
    const payload = {
      month: '2024-04',
      currency: 'BRL',
      rows: [],
      totals: {
        'CX COPO_qtd': 0,
        'CX COPO_val': 0,
        '10 LITROS_qtd': 0,
        '10 LITROS_val': 0,
        '20 LITROS_qtd': 0,
        '20 LITROS_val': 0,
        '1500 ML_qtd': 0,
        '1500 ML_val': 0,
        'TOTAL_qtd': 0,
        'TOTAL_val': 0,
      },
      filters: { states: [], distributors: [] },
    }

    const jsonMock = vi.fn().mockResolvedValue(payload)
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: jsonMock } as any)
    const controller = new AbortController()

    const result = await loadMonthlySummary(fetchMock, '2024-04', controller.signal)

    expect(fetchMock).toHaveBeenCalledWith('/api/partners/monthly-summary?month=2024-04', {
      signal: controller.signal,
    })
    expect(jsonMock).toHaveBeenCalled()
    expect(result).toBe(payload)
  })

  it('propaga a mensagem de erro retornada pela API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Falha ao gerar relatório' }),
    } as any)

    await expect(loadMonthlySummary(fetchMock, '2024-05', new AbortController().signal)).rejects.toThrow(
      'Falha ao gerar relatório',
    )
  })

  it('lança erro padrão quando a resposta é inválida', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    } as any)

    await expect(loadMonthlySummary(fetchMock, '2024-06', new AbortController().signal)).rejects.toThrow(
      'Resposta inválida ao carregar resumo mensal',
    )
  })
})
