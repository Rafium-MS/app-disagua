import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

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

export default function App() {
  const health = useHealth()
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">App DisÁgua</h1>
      <p className="text-sm text-muted-foreground">Servidor: {health}</p>
      <div className="space-x-2">
        <Button>shadcn/ui Button</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
    </div>
  )
}

