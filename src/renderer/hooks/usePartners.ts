import { useMemo, useState } from 'react'

export type Partner = {
  id: string
  name: string
  email: string
  state: string
  stores: number
  activeReports: number
  pendingCount: number
  createdAt: string
  status: 'ativo' | 'inativo'
}

export const partnersSeed: Partner[] = [
  {
    id: 'p-001',
    name: 'Aquarius Group',
    email: 'contato@aquarius.co',
    state: 'SP',
    stores: 12,
    activeReports: 3,
    pendingCount: 2,
    createdAt: '2024-02-16',
    status: 'ativo',
  },
  {
    id: 'p-002',
    name: 'Fonte Viva',
    email: 'relacionamento@fonteviva.com',
    state: 'MG',
    stores: 8,
    activeReports: 1,
    pendingCount: 5,
    createdAt: '2023-11-09',
    status: 'ativo',
  },
  {
    id: 'p-003',
    name: 'Rio Claro Distribuidora',
    email: 'adm@rioclaro.net',
    state: 'RJ',
    stores: 4,
    activeReports: 2,
    pendingCount: 0,
    createdAt: '2022-08-01',
    status: 'inativo',
  },
  {
    id: 'p-004',
    name: 'Hidrasul Coop',
    email: 'comercial@hidrasul.coop',
    state: 'PR',
    stores: 16,
    activeReports: 4,
    pendingCount: 1,
    createdAt: '2021-05-22',
    status: 'ativo',
  },
]

export type UsePartnersFilters = {
  state: string
  status: 'all' | 'ativo' | 'inativo'
  hasPending: boolean
  search: string
}

export function usePartners(filters: UsePartnersFilters) {
  return useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()
    return partnersSeed.filter((partner) => {
      if (filters.state !== 'all' && partner.state !== filters.state) {
        return false
      }
      if (filters.status !== 'all' && partner.status !== filters.status) {
        return false
      }
      if (filters.hasPending && partner.pendingCount === 0) {
        return false
      }
      if (
        normalizedSearch.length > 0 &&
        !partner.name.toLowerCase().includes(normalizedSearch) &&
        !partner.email.toLowerCase().includes(normalizedSearch)
      ) {
        return false
      }
      return true
    })
  }, [filters])
}

export function usePartnerStates() {
  const [states] = useState(() => ['all', 'SP', 'MG', 'RJ', 'PR'])
  return states
}
