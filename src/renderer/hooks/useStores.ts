import { useMemo } from 'react'

export type StoreStatus = 'ACTIVE' | 'INACTIVE'

export type Store = {
  id: string
  partnerId: string | null
  partnerName: string
  name: string
  externalCode: string | null
  addressRaw: string
  street?: string | null
  number?: string | null
  complement?: string | null
  district?: string | null
  city: string
  state: string
  postalCode?: string | null
  unitValueCents: number | null
  lastVoucher?: string | null
  vouchersCount: number
  status: StoreStatus
}

export const storesSeed: Store[] = [
  {
    id: 's-01',
    partnerId: 'p-001',
    partnerName: 'Aquarius Group',
    name: 'Loja Paulista',
    externalCode: 'AQ-001',
    addressRaw: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-000',
    street: 'Av. Paulista',
    number: '1000',
    complement: 'sala 1203',
    district: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '01310000',
    unitValueCents: 1250,
    lastVoucher: '2024-08-12',
    vouchersCount: 42,
    status: 'ACTIVE',
  },
  {
    id: 's-02',
    partnerId: 'p-002',
    partnerName: 'Fonte Viva',
    name: 'Unidade Pampulha',
    externalCode: 'FV-442',
    addressRaw: 'Rua da Bahia, 2200, Belo Horizonte - MG',
    street: 'Rua da Bahia',
    number: '2200',
    city: 'Belo Horizonte',
    state: 'MG',
    postalCode: null,
    complement: null,
    district: null,
    unitValueCents: 980,
    lastVoucher: '2024-08-05',
    vouchersCount: 28,
    status: 'ACTIVE',
  },
  {
    id: 's-03',
    partnerId: 'p-003',
    partnerName: 'Rio Claro Distribuidora',
    name: 'Filial Niterói',
    externalCode: 'RC-889',
    addressRaw: 'Av. Ernani do Amaral Peixoto, 155 - Centro, Niterói - RJ',
    street: 'Av. Ernani do Amaral Peixoto',
    number: '155',
    district: 'Centro',
    city: 'Niterói',
    state: 'RJ',
    postalCode: null,
    complement: null,
    unitValueCents: 1435,
    lastVoucher: null,
    vouchersCount: 0,
    status: 'INACTIVE',
  },
]

export type UseStoresFilters = {
  partnerId: string
  city: string
  state: string
  status: 'all' | StoreStatus
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
      if (normalizedSearch.length > 0) {
        const matches = [
          store.name,
          store.externalCode ?? '',
          store.addressRaw,
          store.partnerName,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch))

        if (!matches) {
          return false
        }
      }

      return true
    })
  }, [filters])
}
