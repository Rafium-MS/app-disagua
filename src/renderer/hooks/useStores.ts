import { useMemo } from 'react'

export type Store = {
  id: string
  name: string
  cnpj: string
  city: string
  state: string
  partnerId: string
  partnerName: string
  lastVoucher?: string
  situation: 'em-dia' | 'pendente' | 'sem-relatorio'
  status: 'ativa' | 'encerrada'
}

export const storesSeed: Store[] = [
  {
    id: 's-01',
    name: 'Loja Paulista',
    cnpj: '12.345.678/0001-90',
    city: 'São Paulo',
    state: 'SP',
    partnerId: 'p-001',
    partnerName: 'Aquarius Group',
    lastVoucher: '2024-08-12',
    situation: 'em-dia',
    status: 'ativa',
  },
  {
    id: 's-02',
    name: 'Unidade Pampulha',
    cnpj: '23.456.789/0001-02',
    city: 'Belo Horizonte',
    state: 'MG',
    partnerId: 'p-002',
    partnerName: 'Fonte Viva',
    lastVoucher: '2024-08-05',
    situation: 'pendente',
    status: 'ativa',
  },
  {
    id: 's-03',
    name: 'Filial Niterói',
    cnpj: '98.765.432/0001-10',
    city: 'Niterói',
    state: 'RJ',
    partnerId: 'p-003',
    partnerName: 'Rio Claro Distribuidora',
    lastVoucher: '2024-07-29',
    situation: 'sem-relatorio',
    status: 'encerrada',
  },
]

export type UseStoresFilters = {
  partnerId: string
  city: string
  state: string
  status: 'all' | 'ativa' | 'encerrada'
  search: string
}

export function useStores(filters: UseStoresFilters) {
  return useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()
    return storesSeed.filter((store) => {
      if (filters.partnerId !== 'all' && store.partnerId !== filters.partnerId) {
        return false
      }
      if (filters.city && !store.city.toLowerCase().includes(filters.city.toLowerCase())) {
        return false
      }
      if (filters.state !== 'all' && store.state !== filters.state) {
        return false
      }
      if (filters.status !== 'all' && store.status !== filters.status) {
        return false
      }
      if (
        normalizedSearch.length > 0 &&
        !store.name.toLowerCase().includes(normalizedSearch) &&
        !store.cnpj.replace(/\D/g, '').includes(normalizedSearch.replace(/\D/g, ''))
      ) {
        return false
      }
      return true
    })
  }, [filters])
}
