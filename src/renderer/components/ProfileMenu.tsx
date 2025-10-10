import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from '@/routes/RouterProvider'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { Button } from '@/components/ui/button'

export function ProfileMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  if (!user) {
    return null
  }

  const handleLogout = async () => {
    setOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-fg transition hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="hidden text-left sm:block">
          <span className="block text-xs text-fg/60">{user.roles.join(', ')}</span>
          <span className="block text-sm font-semibold text-fg">{user.name}</span>
        </span>
        <span className="sm:hidden">{user.name.split(' ')[0]}</span>
        <ChevronDown className="h-4 w-4 text-fg/60" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border bg-muted/50 px-4 py-3">
            <p className="text-sm font-semibold text-fg">{user.name}</p>
            <p className="text-xs text-fg/60">{user.email}</p>
          </div>
          <div className="flex flex-col gap-1 p-2">
            <Button
              type="button"
              variant="ghost"
              className="justify-start"
              onClick={() => {
                setChangePasswordOpen(true)
                setOpen(false)
              }}
            >
              Alterar senha
            </Button>
            <Button type="button" variant="ghost" className="justify-start text-red-500" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      )}

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => {
          setChangePasswordOpen(false)
        }}
      />
    </div>
  )
}
