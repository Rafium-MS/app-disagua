/**
 * API Configuration
 *
 * Em desenvolvimento, usa caminhos relativos para aproveitar o proxy do Vite.
 * Em produção (Electron empacotado), usa a URL completa do servidor local.
 */

const isDev = import.meta.env.DEV

/**
 * URL base para requisições da API.
 * - Desenvolvimento: string vazia (usa proxy do Vite)
 * - Produção: URL completa do servidor Express embutido
 */
export const API_BASE_URL = isDev ? '' : 'http://localhost:5174'

/**
 * Cria uma URL completa para uma rota da API
 */
export function createApiUrl(path: string): string {
  // Remove barra inicial duplicada se existir
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

/**
 * Função fetch wrapper que automaticamente converte caminhos relativos
 * em URLs absolutas quando necessário
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? createApiUrl(input) : input
  return fetch(url, init)
}
