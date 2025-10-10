import './styles/theme.css'
import { RouterProvider } from './routes/RouterProvider'
import { ToastProvider } from './components/ui/toast'
import { AuthProvider } from './hooks/useAuth'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <div className="min-h-screen bg-bg text-fg">
          <RouterProvider />
        </div>
      </AuthProvider>
    </ToastProvider>
  )
}
