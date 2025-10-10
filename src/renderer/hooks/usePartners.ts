import { useMemo, useState } from 'react'

export type Partner = {
  id: string
  name: string
  distributor: string
  document: string
  email: string
  phone: string
  city: string
  state: string
  paymentDay: number
  bank: string
  agencyAccount: string
  pixKey: string
  volumeCupBox: number
  volume10L: number
  volume20L: number
  volume1500ml: number
  volumeTotal: number
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
    distributor: 'Aquarius Distribuição Ltda.',
    document: '12.345.678/0001-00',
    email: 'contato@aquarius.co',
    phone: '(11) 99876-5432',
    city: 'São Paulo',
    state: 'SP',
    paymentDay: 5,
    bank: 'Banco do Brasil',
    agencyAccount: '1234-5 / 67890-1',
    pixKey: 'financeiro@aquarius.co',
    volumeCupBox: 120,
    volume10L: 85,
    volume20L: 65,
    volume1500ml: 140,
    volumeTotal: 410,
    stores: 12,
    activeReports: 3,
    pendingCount: 2,
    createdAt: '2024-02-16',
    status: 'ativo',
  },
  {
    id: 'p-002',
    name: 'Fonte Viva',
    distributor: 'Fonte Viva Distribuidora',
    document: '98.765.432/0001-99',
    email: 'relacionamento@fonteviva.com',
    phone: '(31) 91234-5678',
    city: 'Belo Horizonte',
    state: 'MG',
    paymentDay: 12,
    bank: 'Caixa Econômica',
    agencyAccount: '2345-6 / 78901-2',
    pixKey: 'pix@fonteviva.com',
    volumeCupBox: 90,
    volume10L: 70,
    volume20L: 40,
    volume1500ml: 95,
    volumeTotal: 295,
    stores: 8,
    activeReports: 1,
    pendingCount: 5,
    createdAt: '2023-11-09',
    status: 'ativo',
  },
  {
    id: 'p-003',
    name: 'Rio Claro Distribuidora',
    distributor: 'Rio Claro Água e Gelo',
    document: '54.321.098/0001-77',
    email: 'adm@rioclaro.net',
    phone: '(21) 93456-7810',
    city: 'Rio de Janeiro',
    state: 'RJ',
    paymentDay: 20,
    bank: 'Santander',
    agencyAccount: '3456-7 / 89012-3',
    pixKey: 'financeiro@rioclaro.net',
    volumeCupBox: 40,
    volume10L: 55,
    volume20L: 38,
    volume1500ml: 60,
    volumeTotal: 193,
    stores: 4,
    activeReports: 2,
    pendingCount: 0,
    createdAt: '2022-08-01',
    status: 'inativo',
  },
  {
    id: 'p-004',
    name: 'Hidrasul Coop',
    distributor: 'Cooperativa Hidrasul',
    document: '11.222.333/0001-44',
    email: 'comercial@hidrasul.coop',
    phone: '(41) 97654-3210',
    city: 'Curitiba',
    state: 'PR',
    paymentDay: 28,
    bank: 'Sicredi',
    agencyAccount: '4567-8 / 90123-4',
    pixKey: 'pix@hidrasul.coop',
    volumeCupBox: 75,
    volume10L: 80,
    volume20L: 92,
    volume1500ml: 110,
    volumeTotal: 357,
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
