import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@/lib/zod-resolver'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

const partnerSchema = z.object({
  name: z.string().min(3, 'Informe o nome do parceiro'),
  document: z.string().min(5, 'Documento inválido'),
  email: z
    .string({ required_error: 'Informe o e-mail de contato' })
    .email('Informe um e-mail válido'),
})

type PartnerFormValues = z.infer<typeof partnerSchema>

type Partner = {
  id: number
  name: string
  document: string
  email: string
  createdAt: string
  updatedAt: string
}

const initialPartners: Partner[] = [
  {
    id: 1,
    name: 'Águas do Norte',
    document: '12.345.678/0001-90',
    email: 'contato@aguasdonorte.com',
    createdAt: '2024-01-12T10:24:00Z',
    updatedAt: '2024-01-12T10:24:00Z',
  },
  {
    id: 2,
    name: 'Distribuidora Central',
    document: '98.765.432/0001-11',
    email: 'financeiro@distribuidoracentral.com',
    createdAt: '2024-02-03T15:00:00Z',
    updatedAt: '2024-02-15T18:32:00Z',
  },
  {
    id: 3,
    name: 'Cooperativa Azul',
    document: '23.456.789/0001-55',
    email: 'suporte@cooperativaazul.org',
    createdAt: '2024-03-21T09:10:00Z',
    updatedAt: '2024-03-21T09:10:00Z',
  },
]

type SortConfig = {
  column: keyof Pick<Partner, 'name' | 'document' | 'email' | 'createdAt'>
  direction: 'asc' | 'desc'
}

function formatDate(dateIso: string) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  return formatter.format(new Date(dateIso))
}

export function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>(initialPartners)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortConfig>({ column: 'name', direction: 'asc' })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const { toast } = useToast()

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { name: '', document: '', email: '' },
  })

  const filteredPartners = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filtered = partners.filter((partner) => {
      if (!normalizedSearch) return true
      return (
        partner.name.toLowerCase().includes(normalizedSearch) ||
        partner.document.toLowerCase().includes(normalizedSearch) ||
        partner.email.toLowerCase().includes(normalizedSearch)
      )
    })

    const sorted = [...filtered].sort((a, b) => {
      const column = sort.column
      const direction = sort.direction === 'asc' ? 1 : -1
      const valueA = a[column]
      const valueB = b[column]
      return String(valueA).localeCompare(String(valueB), 'pt-BR') * direction
    })

    return sorted
  }, [partners, search, sort])

  const openCreateModal = () => {
    setEditingPartner(null)
    form.reset({ name: '', document: '', email: '' })
    setIsDialogOpen(true)
  }

  const openEditModal = (partner: Partner) => {
    setEditingPartner(partner)
    form.reset({ name: partner.name, document: partner.document, email: partner.email })
    setIsDialogOpen(true)
  }

  const handleSubmit = form.handleSubmit((data) => {
    if (editingPartner) {
      setPartners((previous) =>
        previous.map((partner) =>
          partner.id === editingPartner.id
            ? { ...partner, ...data, updatedAt: new Date().toISOString() }
            : partner
        )
      )
      toast({
        title: 'Parceiro atualizado',
        description: `${data.name} foi atualizado com sucesso.`,
        variant: 'success',
      })
    } else {
      const nextId = partners.length > 0 ? Math.max(...partners.map((partner) => partner.id)) + 1 : 1
      const timestamp = new Date().toISOString()
      setPartners((previous) => [
        ...previous,
        { id: nextId, ...data, createdAt: timestamp, updatedAt: timestamp },
      ])
      toast({
        title: 'Parceiro criado',
        description: `${data.name} foi adicionado à base.`,
        variant: 'success',
      })
    }

    setIsDialogOpen(false)
  })

  const handleSort = (column: SortConfig['column']) => {
    setSort((current) => {
      if (current.column === column) {
        return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { column, direction: 'asc' }
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Parceiros</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie cadastros de parceiros, documentos e contatos principais.
          </p>
        </div>
        <Button onClick={openCreateModal}>Cadastrar parceiro</Button>
      </header>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="partner-search" className="sr-only">
              Buscar parceiro
            </label>
            <input
              id="partner-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, documento ou e-mail"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                {(
                  [
                    { key: 'name', label: 'Nome' },
                    { key: 'document', label: 'Documento' },
                    { key: 'email', label: 'E-mail' },
                    { key: 'createdAt', label: 'Criado em' },
                  ] satisfies { key: SortConfig['column']; label: string }[]
                ).map((column) => (
                  <th key={column.key} className="px-4 py-3 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-2 text-left text-sm font-medium text-foreground"
                    >
                      {column.label}
                      {sort.column === column.key && (
                        <span className="text-xs text-muted-foreground">
                          {sort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {filteredPartners.map((partner) => (
                <tr key={partner.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{partner.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{partner.document}</td>
                  <td className="px-4 py-3 text-muted-foreground">{partner.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(partner.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(partner)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhum parceiro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingPartner ? 'Editar parceiro' : 'Cadastrar parceiro'}
        description="Preencha os dados do parceiro para manter a base atualizada."
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="partner-form">
              {editingPartner ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        }
      >
        <form id="partner-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="partner-name" className="text-sm font-medium text-foreground">
              Nome
            </label>
            <input
              id="partner-name"
              {...form.register('name')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Ex.: Companhia de Água"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="partner-document" className="text-sm font-medium text-foreground">
              Documento
            </label>
            <input
              id="partner-document"
              {...form.register('document')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="CNPJ ou CPF"
            />
            {form.formState.errors.document && (
              <p className="text-xs text-red-600">{form.formState.errors.document.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="partner-email" className="text-sm font-medium text-foreground">
              E-mail
            </label>
            <input
              id="partner-email"
              type="email"
              {...form.register('email')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="contato@empresa.com"
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export default PartnersPage
