import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Partner = {
  id: number
  name: string
  document: string
  email: string | null
}

function useHealth() {
  const [health, setHealth] = useState<string>('carregando...')
  useEffect(() => {
    fetch('http://localhost:5174/health')
      .then((r) => r.json())
      .then((j) => setHealth(j.status))
      .catch(() => setHealth('erro'))
  }, [])
  return health
}

function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:5174/partners')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.json()
      })
      .then((data: Partner[]) => {
        setPartners(data)
        setError(null)
      })
      .catch(() => {
        setError('Não foi possível carregar os parceiros')
      })
  }, [])

  return { partners, error }
}

export default function App() {
  const health = useHealth()
  const { partners, error } = usePartners()
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">App DisÁgua</h1>
      <p className="text-sm text-muted-foreground">Servidor: {health}</p>
      <div className="space-x-2">
        <Button>shadcn/ui Button</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Parceiros cadastrados</h2>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : partners.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum parceiro encontrado.</p>
        ) : (
          <ul className="space-y-1">
            {partners.map((partner) => (
              <li key={partner.id} className="rounded border border-border px-3 py-2">
                <p className="font-medium">{partner.name}</p>
                <p className="text-xs text-muted-foreground">Documento: {partner.document}</p>
                {partner.email ? (
                  <p className="text-xs text-muted-foreground">{partner.email}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

