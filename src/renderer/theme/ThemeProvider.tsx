import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeCtx = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'theme'

function resolveStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system'
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const effective = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  root.setAttribute('data-theme', effective === 'dark' ? 'dark' : 'light')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => resolveStoredTheme())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  const context = useContext(ThemeCtx)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
