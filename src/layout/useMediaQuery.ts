import { useCallback, useSyncExternalStore } from 'react'

/** `true` enquanto a media query corresponder (atualiza ao redimensionar). Usar só para decisões de layout. */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

/** Larguras mínimas dos breakpoints (iguais às do Tailwind em index.css). */
export const BP = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1440px)',
} as const
