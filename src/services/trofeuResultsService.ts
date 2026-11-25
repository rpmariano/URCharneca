import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { TrofeuPublicGeneralAthlete, TrofeuStageResults } from '../types'

// Lidas só quando se abrem (são grandes: centenas de atletas por prova). Guardadas em memória durante a sessão.
const stageCache = new Map<string, Promise<TrofeuStageResults | null>>()
const generalCache = new Map<string, Promise<TrofeuPublicGeneralAthlete[] | null>>()

/** Classificação completa de uma etapa; `null` se ainda não sincronizada ou em modo de demonstração. */
export function fetchStageResults(season: string, stage: string): Promise<TrofeuStageResults | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  const key = `${season}|${stage}`
  let p = stageCache.get(key)
  if (!p) {
    p = (async () => {
      const { data, error } = await supabase
        .from('trofeu_stage_results')
        .select('season,stage,race_id,athletes,clubs,synced_at')
        .eq('season', season)
        .eq('stage', stage)
        .maybeSingle()
      if (error) throw error
      return (data as TrofeuStageResults | null) ?? null
    })()
    p.catch(() => stageCache.delete(key))
    stageCache.set(key, p)
  }
  return p
}

/** Classificação geral individual de todos os clubes; `null` se ainda não sincronizada. */
export function fetchGeneralStandings(season: string): Promise<TrofeuPublicGeneralAthlete[] | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  let p = generalCache.get(season)
  if (!p) {
    p = (async () => {
      const { data, error } = await supabase.from('trofeu_general_standings').select('athletes').eq('season', season).maybeSingle()
      if (error) throw error
      return ((data?.athletes as TrofeuPublicGeneralAthlete[] | undefined) ?? null)
    })()
    p.catch(() => generalCache.delete(season))
    generalCache.set(season, p)
  }
  return p
}

/** Depois de "Atualizar classificações", volta a ler da base de dados. */
export function clearTrofeuResultsCache() {
  stageCache.clear()
  generalCache.clear()
}
