import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import type { Race } from '../types'
import { todayISO } from './dates'

const KEY = 'urc_seen_open_races_v1'
const EVENT = 'urc-seen-races-changed'

const readSeen = (userId: string): string[] => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, string[]>
    return Array.isArray(all[userId]) ? all[userId] : []
  } catch {
    return []
  }
}

/** Marca uma prova como vista por este utilizador (neste dispositivo): deixa de contar como "nova". */
export const markRaceSeen = (userId: string, raceId: string) => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, string[]>
    const cur = Array.isArray(all[userId]) ? all[userId] : []
    if (cur.includes(raceId)) return
    all[userId] = [...cur, raceId]
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // sem armazenamento: o sinal volta a aparecer
  }
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Provas com inscrições abertas para o utilizador (ou as crianças a seu cargo): do clube e da comunidade,
 * ainda por fazer, mesmo que sejam daqui a meses. As etapas do Troféu ficam de fora: são tratadas pela equipa.
 * `fresh` são as que o utilizador ainda não abriu (o sinal vermelho da navegação).
 */
export const useOpenRaces = (): { open: Race[]; fresh: Race[]; isFresh: (id: string) => boolean } => {
  const { races, registrations, currentUser, youthAthletes } = useApp()
  const [seen, setSeen] = useState<string[]>(() => readSeen(currentUser.id))
  const sync = useCallback(() => setSeen(readSeen(currentUser.id)), [currentUser.id])
  useEffect(() => {
    sync()
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [sync])

  const today = todayISO()
  const open = useMemo(() => {
    const childIds = new Set(youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id)).map((c) => c.id))
    const joined = new Set(
      registrations
        .filter(
          (r) =>
            r.status !== 'cancelled' &&
            ((!r.is_dependent && r.athlete_id === currentUser.id) || (r.is_dependent && childIds.has(r.dependent_id || '')))
        )
        .map((r) => r.race_id)
    )
    return races
      .filter((r) => (r.category === 'equipa' || r.category === 'individual') && r.date >= today)
      .filter((r) => r.category === 'individual' || !r.registration_deadline || r.registration_deadline >= today)
      .filter((r) => !joined.has(r.id))
      .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`))
  }, [races, registrations, youthAthletes, currentUser.id, today])

  const seenSet = useMemo(() => new Set(seen), [seen])
  const fresh = useMemo(() => open.filter((r) => !seenSet.has(r.id)), [open, seenSet])
  return { open, fresh, isFresh: (id: string) => !seenSet.has(id) }
}
