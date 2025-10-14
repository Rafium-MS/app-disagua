import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

type PartnerOption = {
  id: number
  name: string
}

type BrandListItem = {
  id: string
  name: string
  code?: string | null
  partner: { id: number; name: string }
  createdAt: string
  updatedAt: string
}

type Pagination = {
  page: number
  size: number
  total: number
  totalPages: number
}

type BrandFormState = {
  partnerId: string
  name: string
  code: string
}

const defaultFormState: BrandFormState = {
  partnerId: '',
  name: '',
  code: '',
}

export function BrandsPage() {
  const { toast } = useToast()
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [brands, setBrands] = useState<BrandListItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, size: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ partnerId: '', q: '', page: 1 })
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formState, setFormState] = useState<BrandFormState>(defaultFormState)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadPartners() {
      try {
        const response = await fetch('/api/partners?page=1&pageSize=200')
        if (!response.ok) throw new Error('Erro ao carregar parceiros')
        const payload = await response.json()
        if (active) {
          setPartners(payload.data ?? [])
        }
      } catch (error) {
        console.error(error)
        toast({ title: 'Erro ao carregar parceiros', variant: 'error' })
      }
    }
    loadPartners()
    return () => {
      active = false
    }
  }, [toast])

  const loadBrands = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(filters.page), size: '10' })
      if (filters.partnerId) params.set('partnerId', filters.partnerId)
      if (filters.q) params.set('q', filters.q)

      const response = await fetch(`/api/brands?${params.toString()}`)
      if (!response.ok) throw new Error('Erro ao carregar marcas')
      const payload = await response.json()
      setBrands(payload.data ?? [])
      setPagination(payload.pagination ?? { page: filters.page, size: 10, total: 0, totalPages: 0 })
    } catch (error) {
      console.error(error)
      toast({ title: 'Não foi possível carregar as marcas', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [filters.page, filters.partnerId, filters.q, toast])

  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  const openCreateDialog = () => {
    setEditingId(null)
    setFormState(defaultFormState)
    setDialogOpen(true)
  }

  const openEditDialog = (brand: BrandListItem) => {
    setEditingId(brand.id)
    setFormState({
      partnerId: String(brand.partner.id),
      name: brand.name,
      code: brand.code ?? '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (brand: BrandListItem) => {
    const confirmation = window.confirm(`Remover a marca "${brand.name}"?`)
    if (!confirmation) {
      return
    }
    try {
      const response = await fetch(`/api/brands/${brand.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Não foi possível remover a marca')
      toast({ title: 'Marca removida com sucesso', variant: 'success' })
      loadBrands()
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro ao remover marca', variant: 'error' })
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState.partnerId || !formState.name.trim()) {
      toast({ title: 'Informe parceiro e nome da marca', variant: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        partnerId: formState.partnerId,
        name: formState.name.trim(),
        code: formState.code.trim() || undefined,
      }

      const response = await fetch(editingId ? `/api/brands/${editingId}` : '/api/brands', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload.error || 'Não foi possível salvar a marca')
      }

      toast({ title: 'Marca salva com sucesso', variant: 'success' })
      setDialogOpen(false)
      setFormState(defaultFormState)
      setEditingId(null)
      loadBrands()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao salvar marca',
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const partnerOptions = useMemo(() => [{ id: 0, name: 'Todos os parceiros' }, ...partners], [partners])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Marcas</h1>
          <p className="text-sm text-fg/60">Gerencie as marcas vinculadas aos parceiros e organize o cadastro de lojas.</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nova marca
        </Button>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          onSubmit={(event) => {
            event.preventDefault()
            loadBrands()
          }}
        >
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase text-fg/60">Parceiro</span>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={filters.partnerId}
                onChange={(event) => setFilters((previous) => ({ ...previous, partnerId: event.target.value, page: 1 }))}
              >
                {partnerOptions.map((option) => (
                  <option key={option.id} value={option.id ? String(option.id) : ''}>
                    {option.id ? option.name : 'Todos'}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-xs uppercase text-fg/60">Buscar</span>
              <input
                type="text"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Nome ou código"
                value={filters.q}
                onChange={(event) => setFilters((previous) => ({ ...previous, q: event.target.value, page: 1 }))}
              />
            </label>
          </div>
          <Button type="submit" variant="outline" className="sm:w-auto">
            Aplicar filtros
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-fg/70">
              <tr>
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">Parceiro</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Atualizada em</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-fg">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-fg/60">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-fg/60">
                    Nenhuma marca encontrada
                  </td>
                </tr>
              ) : (
                brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{brand.name}</td>
                    <td className="px-4 py-3">{brand.partner.name}</td>
                    <td className="px-4 py-3">{brand.code ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-fg/60">
                      {new Date(brand.updatedAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(brand)}
                          className="flex items-center gap-2"
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(brand)}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" /> Remover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-fg/60">
          <span>
            Página {pagination.page} de {Math.max(pagination.totalPages ?? 1, 1)} · {pagination.total} registro(s)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((previous) => ({ ...previous, page: Math.max(previous.page - 1, 1) }))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= (pagination.totalPages || 1)}
              onClick={() =>
                setFilters((previous) => ({ ...previous, page: Math.min(previous.page + 1, pagination.totalPages || 1) }))
              }
            >
              Próxima
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (!saving) {
            setDialogOpen(false)
            setFormState(defaultFormState)
            setEditingId(null)
          }
        }}
        title={editingId ? 'Editar marca' : 'Nova marca'}
        description="Informe o parceiro e o nome da marca. O código é opcional."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="brand-form" disabled={saving} className="flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </>
        }
      >
        <form id="brand-form" onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-fg/60">Parceiro</span>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={formState.partnerId}
              onChange={(event) => setFormState((previous) => ({ ...previous, partnerId: event.target.value }))}
              required
            >
              <option value="">Selecione</option>
              {partners.map((partner) => (
                <option key={partner.id} value={String(partner.id)}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-fg/60">Nome da marca</span>
            <input
              type="text"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={formState.name}
              onChange={(event) => setFormState((previous) => ({ ...previous, name: event.target.value }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-fg/60">Código interno</span>
            <input
              type="text"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={formState.code}
              onChange={(event) => setFormState((previous) => ({ ...previous, code: event.target.value }))}
              placeholder="Opcional"
            />
          </label>
        </form>
      </Dialog>
    </div>
  )
}
