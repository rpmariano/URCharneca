import { useEffect, useSyncExternalStore } from 'react'
import { useApp } from '../context/AppContext'

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

/** `true` quando o shell desktop está ativo: ecrã largo + sessão autenticada com papel de admin ativo. */
export const useDesktopAdmin = (): boolean => {
  const { isAdminView, isAuthenticated } = useApp()
  return useIsDesktop() && isAdminView && isAuthenticated
}

/** Liga a classe `desktop-admin` no <html> (usada por layout/desktop.css) enquanto o shell desktop está ativo. */
export const useDesktopAdminClass = (active: boolean) => {
  useEffect(() => {
    document.documentElement.classList.toggle('desktop-admin', active)
    return () => document.documentElement.classList.remove('desktop-admin')
  }, [active])
}
