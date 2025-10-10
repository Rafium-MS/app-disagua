import './styles/theme.css'
import { RouterProvider } from './routes/RouterProvider'
import { ToastProvider } from './components/ui/toast'

export default function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg text-fg">
        <RouterProvider />
      </div>
    </ToastProvider>
  )
}
