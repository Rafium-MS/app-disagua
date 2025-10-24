# Componentes de Feedback Visual

Este documento descreve os componentes de feedback visual disponíveis na aplicação e como usá-los.

## 📋 Índice

1. [Toast / Notificações](#toast--notificações)
2. [Spinner - Loading States](#spinner---loading-states)
3. [Alert - Mensagens de Erro](#alert---mensagens-de-erro)
4. [Skeleton - Loading de Conteúdo](#skeleton---loading-de-conteúdo)

---

## 🔔 Toast / Notificações

Sistema de notificações toast para feedback visual temporário.

### Localização
`src/renderer/components/ui/toast.tsx`

### Configuração

Envolva sua aplicação com o `ToastProvider`:

```tsx
import { ToastProvider } from '@/components/ui/toast'

function App() {
  return (
    <ToastProvider>
      {/* Seu conteúdo aqui */}
    </ToastProvider>
  )
}
```

### Uso

```tsx
import { useToast } from '@/components/ui/toast'

function MyComponent() {
  const { toast } = useToast()

  const handleSuccess = () => {
    toast({
      title: 'Sucesso!',
      description: 'Operação realizada com sucesso',
      variant: 'success'
    })
  }

  const handleError = () => {
    toast({
      title: 'Erro',
      description: 'Algo deu errado',
      variant: 'error'
    })
  }

  const handleDefault = () => {
    toast({
      title: 'Notificação',
      description: 'Informação importante',
      variant: 'default'
    })
  }

  return (
    <div>
      <button onClick={handleSuccess}>Mostrar Sucesso</button>
      <button onClick={handleError}>Mostrar Erro</button>
      <button onClick={handleDefault}>Mostrar Padrão</button>
    </div>
  )
}
```

### Variantes

- `default` - Notificação padrão (cinza)
- `success` - Sucesso (verde/emerald)
- `error` - Erro (vermelho)

### Propriedades

- `title` (string) - Título da notificação
- `description` (string, opcional) - Descrição adicional
- `variant` (ToastVariant, opcional) - Tipo de notificação

### Características

- Auto-dismiss em 4 segundos
- Posicionado no canto superior direito
- Botão de fechar manual
- Suporta múltiplas notificações simultâneas
- Renderizado via portal (document.body)

---

## ⏳ Spinner - Loading States

Componente para indicar estados de carregamento em ações e processos.

### Localização
`src/renderer/components/ui/spinner.tsx`

### Uso Básico

```tsx
import { Spinner } from '@/components/ui/spinner'

function MyComponent() {
  return (
    <div>
      {/* Spinner básico */}
      <Spinner />

      {/* Com tamanho customizado */}
      <Spinner size="lg" />

      {/* Com variante de cor */}
      <Spinner variant="success" />

      {/* Com label para acessibilidade */}
      <Spinner label="Processando pagamento..." />
    </div>
  )
}
```

### Spinner em Botões

```tsx
import { SpinnerButton } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    await someAsyncOperation()
    setIsLoading(false)
  }

  return (
    <Button onClick={handleSubmit} disabled={isLoading}>
      <SpinnerButton loading={isLoading} loadingText="Salvando...">
        Salvar
      </SpinnerButton>
    </Button>
  )
}
```

### Overlay de Tela Inteira

```tsx
import { SpinnerOverlay } from '@/components/ui/spinner'

function MyComponent() {
  const [isProcessing, setIsProcessing] = useState(false)

  return (
    <>
      <SpinnerOverlay
        show={isProcessing}
        message="Processando dados..."
        size="xl"
      />

      {/* Seu conteúdo */}
    </>
  )
}
```

### Tamanhos

- `sm` - Pequeno (16px)
- `default` - Padrão (24px)
- `lg` - Grande (32px)
- `xl` - Extra grande (48px)

### Variantes

- `default` / `primary` - Cor primária do tema
- `secondary` - Cor secundária (muted)
- `success` - Verde (emerald)
- `error` - Vermelho
- `warning` - Amarelo (amber)
- `light` - Branco (para fundos escuros)

---

## ⚠️ Alert - Mensagens de Erro

Componentes para exibir mensagens de erro e avisos de forma clara.

### Localização
`src/renderer/components/ui/error-alert.tsx`

### ErrorAlert - Alert Completo

```tsx
import { ErrorAlert } from '@/components/ui/error-alert'

function MyComponent() {
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    try {
      const data = await api.getData()
    } catch (err) {
      setError(err as Error)
    }
  }

  return (
    <div>
      {error && (
        <ErrorAlert
          title="Erro ao carregar dados"
          error={error}
          onRetry={fetchData}
          variant="destructive"
        />
      )}
    </div>
  )
}
```

### InlineError - Erro Inline

```tsx
import { InlineError } from '@/components/ui/error-alert'

function MyComponent() {
  const [fieldError, setFieldError] = useState<string | null>(null)

  return (
    <div>
      <input type="email" />
      {fieldError && <InlineError message={fieldError} />}
    </div>
  )
}
```

### Variantes de ErrorAlert

- `default` - Estilo padrão (cinza)
- `destructive` - Erro (vermelho) - **padrão**
- `warning` - Aviso (amarelo)

### Propriedades ErrorAlert

- `title` (string, opcional) - Título do erro (padrão: "Erro ao carregar dados")
- `message` (string, opcional) - Mensagem customizada
- `error` (Error | unknown, opcional) - Objeto de erro
- `onRetry` (função, opcional) - Callback para botão "Tentar novamente"
- `variant` - Tipo visual do alerta
- `className` - Classes CSS adicionais

### Propriedades InlineError

- `message` (string, opcional) - Mensagem customizada
- `error` (Error | unknown, opcional) - Objeto de erro
- `className` - Classes CSS adicionais

---

## 💀 Skeleton - Loading de Conteúdo

Componentes skeleton para estados de carregamento de conteúdo estrutural.

### Localização
`src/renderer/components/ui/skeleton.tsx`

### Uso

```tsx
import {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonButton
} from '@/components/ui/skeleton'

function MyComponent() {
  const [isLoading, setIsLoading] = useState(true)

  if (isLoading) {
    return (
      <div>
        {/* Avatar */}
        <SkeletonCircle />

        {/* Título */}
        <SkeletonText className="h-6 w-48" />

        {/* Parágrafos */}
        <SkeletonText />
        <SkeletonText className="w-3/4" />

        {/* Botão */}
        <SkeletonButton />

        {/* Custom skeleton */}
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    )
  }

  return <ActualContent />
}
```

### Componentes Disponíveis

- `Skeleton` - Base skeleton customizável
- `SkeletonText` - Skeleton para texto (altura 16px)
- `SkeletonCircle` - Skeleton circular (48x48px)
- `SkeletonButton` - Skeleton para botão (40x96px)

### Características

- Animação de pulse automática
- Totalmente customizável via className
- Usa cores do tema (bg-muted)

---

## 🎯 Padrões de Uso Recomendados

### Para Feedback de Ações

```tsx
const handleSave = async () => {
  const { toast } = useToast()

  try {
    setIsLoading(true)
    await api.save(data)

    toast({
      title: 'Salvo com sucesso!',
      variant: 'success'
    })
  } catch (error) {
    toast({
      title: 'Erro ao salvar',
      description: error.message,
      variant: 'error'
    })
  } finally {
    setIsLoading(false)
  }
}
```

### Para Carregamento de Dados

```tsx
function DataList() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonText className="h-6 w-48" />
        <SkeletonText />
        <SkeletonText />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorAlert
        error={error}
        onRetry={fetchData}
      />
    )
  }

  return <div>{/* Dados carregados */}</div>
}
```

### Para Operações de Background

```tsx
function BatchProcessor() {
  const [isProcessing, setIsProcessing] = useState(false)

  const processBatch = async () => {
    setIsProcessing(true)
    try {
      await api.processBatch()
      toast({ title: 'Processamento concluído', variant: 'success' })
    } catch (error) {
      toast({ title: 'Erro no processamento', variant: 'error' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <SpinnerOverlay
        show={isProcessing}
        message="Processando lote de dados..."
      />
      <button onClick={processBatch}>Processar</button>
    </>
  )
}
```

---

## 🎨 Integração com o Tema

Todos os componentes utilizam as variáveis CSS do tema:

- `--bg` - Background
- `--fg` - Foreground/texto
- `--muted` - Elementos discretos
- `--card` - Cards e superfícies
- `--border` - Bordas
- `--primary` - Cor primária
- `--ok` - Verde (sucesso)
- `--warn` - Amarelo (aviso)
- `--danger` - Vermelho (erro)

Suporte automático para modo claro/escuro via atributo `data-theme`.

---

## ♿ Acessibilidade

Todos os componentes seguem práticas de acessibilidade:

- **Toast**: Anúncios via ARIA, botão de fechar com label
- **Spinner**: `role="status"`, `aria-label`, texto para leitores de tela
- **Alert**: `role="alert"`, estrutura semântica, ícones descritivos
- **Skeleton**: Indica estado de carregamento visualmente

---

## 📦 Exportações

```tsx
// Toast
import { ToastProvider, useToast } from '@/components/ui/toast'

// Spinner
import { Spinner, SpinnerOverlay, SpinnerButton } from '@/components/ui/spinner'

// Alert
import { ErrorAlert, InlineError } from '@/components/ui/error-alert'

// Skeleton
import { Skeleton, SkeletonText, SkeletonCircle, SkeletonButton } from '@/components/ui/skeleton'
```
