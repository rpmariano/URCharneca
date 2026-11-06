import { useCallback, useEffect, useState } from 'react'

/** Termos da equipa explicados em linguagem simples (Perfil → Glossário). */
export const GLOSSARY: Array<{ term: string; text: string }> = [
  { term: 'Escalão', text: 'O grupo de idade em que corres (por exemplo, Veteranos M40 ou Benjamins B). Calcula-se pela data de nascimento.' },
  { term: 'Troféu de Cascais', text: 'Conjunto de provas oficiais do concelho. O clube trata da inscrição e leva-nos na carrinha.' },
  { term: 'Prova do clube', text: 'Prova promovida pelo clube: tu pedes a inscrição e o clube confirma.' },
  { term: 'Prova sugerida', text: 'Prova que um atleta propõe. Cada um se inscreve por si e marca presença para irmos juntos.' },
  { term: 'Aguarda o clube', text: 'Pediste a inscrição e o clube ainda não a confirmou. Fica "Inscrito" quando o clube a tratar.' },
  { term: 'Dorsal', text: 'O número que se prende à camisola. O clube levanta os dorsais na organização ("no clube") e entrega-os a cada atleta ("entregue").' },
  { term: 'Carrinha e lista de espera', text: 'A carrinha do clube tem lugares limitados, dados por ordem de pedido. Quem fica de fora entra em lista de espera e sobe se alguém cancelar.' },
  { term: 'Ponto de encontro', text: 'Local e hora onde a equipa se junta antes da prova, quando cada um vai por si.' },
  { term: 'Prazo de inscrição', text: 'Último dia para pedires ou cancelares a inscrição. Depois disso, só o clube mexe.' },
]

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
