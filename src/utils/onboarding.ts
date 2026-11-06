import { useCallback, useEffect, useState } from 'react'

/** Guias e dicas de primeira utilização: o que o utilizador já dispensou fica guardado neste dispositivo. */
const KEY = 'urc_onboarding_v1'
const EVENT = 'urc-onboarding-changed'

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const write = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // sem armazenamento: o guia volta a aparecer na próxima visita
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Volta a mostrar todos os guias e dicas (usado em Perfil → "Ver o guia outra vez"). */
export const resetOnboarding = () => write([])

/** Estado de um guia ou dica: `visible` até ser dispensado; `dismiss()` guarda a escolha. */
export const useOnboardingItem = (id: string) => {
  const [dismissed, setDismissed] = useState(() => read().includes(id))
  useEffect(() => {
    const sync = () => setDismissed(read().includes(id))
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [id])
  const dismiss = useCallback(() => {
    const ids = read()
    if (!ids.includes(id)) write([...ids, id])
  }, [id])
  return { visible: !dismissed, dismiss }
}
