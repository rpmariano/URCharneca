import { useEffect, useSyncExternalStore } from 'react'
import { useApp } from '../context/AppContext'

/** Computador = browser com >= 1024 px. Abaixo disso (telemóvel, tablet) a app é sempre a de telemóvel. */
export const DESKTOP_QUERY = '(min-width: 1024px)'

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** `true` em ecrãs >= 1024 px. */
export const useIsDesktop = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  )

/**
 * `true` quando o shell de computador está ativo: ecrã >= 1024 px e sessão autenticada.
 * Vale para todos (atleta e administrador); o que é só de administrador continua a depender de `isAdminView`.
 */
export const useDesktopShell = (): boolean => {
  const { isAuthenticated, recoveryMode } = useApp()
  return useIsDesktop() && isAuthenticated && !recoveryMode
}

/** Liga a classe `desktop-shell` no <html> (usada por layout/desktop.css) enquanto o shell de computador está ativo. */
export const useDesktopShellClass = (active: boolean) => {
  useEffect(() => {
    document.documentElement.classList.toggle('desktop-shell', active)
    return () => document.documentElement.classList.remove('desktop-shell')
  }, [active])
}
