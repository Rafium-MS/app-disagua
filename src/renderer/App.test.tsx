import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'

describe('App', () => {
  it('renderiza título e mensagem de lista vazia', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      if (typeof input === 'string' && input.endsWith('/health')) {
        return {
          json: async () => ({ status: 'ok' })
        } as Response
      }

      if (typeof input === 'string' && input.endsWith('/partners')) {
        return {
          json: async () => ({ data: [] })
        } as Response
      }

      throw new Error('endpoint não mockado')
    })

    const originalFetch = global.fetch
    ;(globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch

    try {
      render(<App />)

      expect(screen.getByText(/App DisÁgua/i)).toBeInTheDocument()

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled()
        expect(screen.getByText(/Nenhum parceiro cadastrado/i)).toBeInTheDocument()
      })
    } finally {
      if (originalFetch) {
        global.fetch = originalFetch
      } else {
        delete (globalThis as { fetch?: typeof fetch }).fetch
      }
    }
  })
})

