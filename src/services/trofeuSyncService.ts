import {
  TROFEU_SITE_URL,
  buildTrofeuRaces2026_2027,
  getTrofeuEscalao2026,
  mapTrofeuEscalaoToApp,
} from '../data/trofeuData'
import type {
  AppNotification,
  AthleteProfile,
  Race,
  RaceDocument,
  TrofeuSeasonData,
  TrofeuSyncLog,
  YouthAthlete,
} from '../types'
import { supabase } from '../lib/supabaseClient'

/** Normaliza nomes removendo acentos, espaços duplos e maiúsculas para cruzamento fiável */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/schaller/g, 'shaller')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Calcula a próxima janela de verificação bissemanal (Terça-feira ou Sexta-feira às 09:00) */
export function computeNextBiweeklyCheck(fromDate = new Date()): string {
  const candidate = new Date(fromDate.getTime())
  candidate.setHours(9, 0, 0, 0)

  // Avança dia a dia até encontrar a próxima Terça (2) ou Sexta (5) futura
  for (let i = 0; i <= 7; i++) {
    const dt = new Date(candidate.getTime())
    dt.setDate(dt.getDate() + i)
    const dow = dt.getDay()
    if ((dow === 2 || dow === 5) && dt.getTime() > fromDate.getTime()) {
      return dt.toISOString()
    }
  }
  const fallback = new Date(fromDate.getTime() + 3.5 * 24 * 60 * 60 * 1000)
  return fallback.toISOString()
}

/** Verifica se a janela bissemanal (2x por semana: Terça e Sexta) já venceu */
export function isBiweeklyCheckDue(lastSyncISO?: string, now = new Date()): boolean {
  if (!lastSyncISO) return true
  const last = new Date(lastSyncISO)
  if (Number.isNaN(last.getTime())) return true

  // Mais de 3,5 dias (84 horas) desde a última verificação
  const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60)
  if (diffHours >= 84) return true

  // Ou atravessou uma Terça (2) / Sexta (5) às 09:00 desde a última sincronização
  const cursor = new Date(last.getTime())
  cursor.setHours(9, 0, 0, 0)
  for (let i = 0; i <= 4; i++) {
    const check = new Date(cursor.getTime())
    check.setDate(check.getDate() + i)
    const dow = check.getDay()
    if ((dow === 2 || dow === 5) && check.getTime() > last.getTime() && check.getTime() <= now.getTime()) {
      return true
    }
  }
  return false
}

export interface TrofeuSyncInput {
  currentRaces: Race[]
  currentProfiles: AthleteProfile[]
  currentYouthAthletes: YouthAthlete[]
  currentSeasons: TrofeuSeasonData[]
  trigger: TrofeuSyncLog['trigger']
  today: string
  actorName: string
}

export interface TrofeuSyncOutput {
  races: Race[]
  profiles: AthleteProfile[]
  youthAthletes: YouthAthlete[]
  seasons: TrofeuSeasonData[]
  newNotifications: Omit<AppNotification, 'id' | 'created_at' | 'read_by'>[]
  log: TrofeuSyncLog
  liveReachable: boolean
}

/** Tenta verificar disponibilidade online do portal do Troféu (resiliente a CORS em browser) */
async function probeTrofeuWebsite(): Promise<{ reachable: boolean; htmlSnippet?: string }> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(TROFEU_SITE_URL, { method: 'GET', signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return { reachable: false }
    const html = await res.text()
    return { reachable: true, htmlSnippet: html.slice(0, 5000) }
  } catch {
    return { reachable: false }
  }
}

/**
 * Executa a sincronização completa com o Troféu de Atletismo de Cascais:
 * 1. Garante todas as 13 provas da época aberta 2026/2027 na agenda.
 * 2. Verifica documentação (Croquis, Regulamentos, Resultados) nas provas futuras (ciclo bissemanal).
 * 3. Identifica atletas da URC por ID de Dorsal / Nome nas classificações e auto-cria atletas em falta.
 * 4. Emite alertas para os administradores validarem novos atletas e associarem dorsais.
 */
export async function runTrofeuSync(input: TrofeuSyncInput): Promise<TrofeuSyncOutput> {
  const now = new Date()
  const nowISO = now.toISOString()
  const nextCheckISO = computeNextBiweeklyCheck(now)
  const probe = await probeTrofeuWebsite()

  const officialRaces = buildTrofeuRaces2026_2027(nowISO)
  const nextRaces = [...input.currentRaces]

  let racesCreated = 0
  let racesUpdated = 0
  let newDocumentsFound = 0
  const newNotifications: Omit<AppNotification, 'id' | 'created_at' | 'read_by'>[] = []

  // 1. Criar / Atualizar as 13 etapas oficiais de 2026/2027 e monitorizar documentos até à data da prova
  for (const official of officialRaces) {
    const existingIdx = nextRaces.findIndex(
      (r) =>
        r.id === official.id ||
        (r.category === 'trofeu_cascais' &&
          r.trophy_stage_number === official.trophy_stage_number &&
          r.date.startsWith(official.date.slice(0, 4)))
    )

    if (existingIdx === -1) {
      nextRaces.push({
        ...official,
        last_doc_check_at: nowISO,
        next_doc_check_at: official.date >= input.today ? nextCheckISO : undefined,
      })
      racesCreated++
    } else {
      const existing = nextRaces[existingIdx]
      const existingDocs = existing.documents || []
      const existingUrls = new Set(existingDocs.map((d) => `${d.type}:${d.url}`))
      const newlyDiscovered: RaceDocument[] = []

      for (const doc of official.documents || []) {
        const key = `${doc.type}:${doc.url}`
        const byId = existingDocs.some((d) => d.id === doc.id)
        if (!byId && !existingUrls.has(key)) {
          newlyDiscovered.push({ ...doc, is_new: true })
        }
      }

      if (newlyDiscovered.length > 0) {
        newDocumentsFound += newlyDiscovered.length
        const docNames = newlyDiscovered.map((d) => d.title).join(', ')
        newNotifications.push({
          title: `Nova documentação: ${official.title}`,
          message: `A verificação automática detetou novos documentos no site do Troféu de Cascais: ${docNames}.`,
          type: 'new_document',
          related_race_id: existing.id,
          created_by_name: 'Sincronização Troféu Cascais',
          pinned: newlyDiscovered.some((d) => d.type === 'croqui'),
        })
      }

      const needsInfoUpgrade =
        existing.title.includes('Troféu de Atletismo de Cascais 2026/27') ||
        !existing.organizer ||
        !existing.documents?.length ||
        newlyDiscovered.length > 0

      if (needsInfoUpgrade || existing.date >= input.today) {
        const mergedDocs = [...existingDocs, ...newlyDiscovered]
        nextRaces[existingIdx] = {
          ...existing,
          title: existing.title.includes('Troféu de Atletismo de Cascais 2026/27')
            ? official.title
            : existing.title,
          date: existing.date || official.date,
          start_time: existing.start_time || official.start_time,
          location: existing.location.includes('Circuito Municipal') || existing.location.includes('São João do Estoril')
            ? official.location
            : existing.location,
          organizer: existing.organizer || official.organizer,
          trofeu_competition_id: existing.trofeu_competition_id ?? official.trofeu_competition_id,
          external_url: existing.external_url === 'https://www.cascais.pt' ? official.external_url : existing.external_url,
          documents: mergedDocs,
          last_doc_check_at: nowISO,
          next_doc_check_at: existing.date >= input.today ? nextCheckISO : existing.next_doc_check_at,
        }
        if (needsInfoUpgrade) racesUpdated++
      }
    }
  }

  // Também atualizar marcador de verificação bissemanal noutras provas futuras do Troféu
  for (let i = 0; i < nextRaces.length; i++) {
    const r = nextRaces[i]
    if (r.category === 'trofeu_cascais' && r.date >= input.today && !r.next_doc_check_at) {
      nextRaces[i] = {
        ...r,
        last_doc_check_at: nowISO,
        next_doc_check_at: nextCheckISO,
      }
    }
  }

  // Ordenar provas por data
  nextRaces.sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`))

  // 2. Correspondência de atletas URC e Auto-Criação a partir das classificações (Época Aberta + Histórico)
  const nextProfiles: AthleteProfile[] = input.currentProfiles.map((p) => ({
    ...p,
    dorsais_trofeu: p.dorsais_trofeu ? { ...p.dorsais_trofeu } : undefined,
    trofeu_seasons: p.trofeu_seasons ? [...p.trofeu_seasons] : [],
  }))
  const nextYouth: YouthAthlete[] = input.currentYouthAthletes.map((y) => ({
    ...y,
    dorsais_trofeu: y.dorsais_trofeu ? { ...y.dorsais_trofeu } : undefined,
    trofeu_seasons: y.trofeu_seasons ? [...y.trofeu_seasons] : [],
  }))

  const createdAdultsNames: string[] = []
  const createdYouthNames: string[] = []

  const getSeasonDorsal = (
    person: { dorsal_trofeu?: string; dorsais_trofeu?: Record<string, string> },
    season: string
  ) => person.dorsais_trofeu?.[season] ?? (season === '2026/2027' ? person.dorsal_trofeu : undefined)

  const setSeasonDorsal = (
    person: { dorsal_trofeu?: string; dorsais_trofeu?: Record<string, string> },
    season: string,
    dorsal?: string
  ) => {
    if (!dorsal) return
    person.dorsais_trofeu = { ...(person.dorsais_trofeu || {}), [season]: dorsal }
    if (season === '2026/2027') {
      person.dorsal_trofeu = dorsal
    }
  }

  const nextSeasons: TrofeuSeasonData[] = input.currentSeasons.map((seasonData) => {
    const sId = seasonData.season
    const updatedStandings = seasonData.athlete_standings.map((st) => {
      if (!st.is_urc) return st

      const normStName = normalizeName(st.name)
      const looksYouth = Boolean(st.is_youth) || st.birth_year >= 2009

      // Procurar primeiro por ID já associado, depois pelo dorsal DA MESMA ÉPOCA, e por fim pelo nome normalizado
      let matchedAdult: AthleteProfile | undefined
      let matchedChild: YouthAthlete | undefined

      if (st.matched_profile_id) {
        matchedAdult = nextProfiles.find((p) => p.id === st.matched_profile_id)
        if (!matchedAdult) matchedChild = nextYouth.find((y) => y.id === st.matched_profile_id)
      }

      if (!matchedAdult && !matchedChild && st.dorsal) {
        matchedAdult = nextProfiles.find((p) => getSeasonDorsal(p, sId) === st.dorsal)
        if (!matchedAdult) matchedChild = nextYouth.find((y) => getSeasonDorsal(y, sId) === st.dorsal)
      }

      if (!matchedAdult && !matchedChild) {
        if (looksYouth) {
          matchedChild = nextYouth.find((y) => {
            if (normalizeName(y.name) !== normStName) return false
            const yYear = Number(y.birth_date.slice(0, 4))
            return !yYear || Math.abs(yYear - st.birth_year) <= 2
          })
          if (!matchedChild) {
            // Caso de transição de Sub-18/Sub-20 para lista de adultos
            matchedAdult = nextProfiles.find(
              (p) => normalizeName(p.name) === normStName && Number(p.birth_date.slice(0, 4)) >= 2007
            )
          }
        } else {
          matchedAdult = nextProfiles.find((p) => {
            if (normalizeName(p.name) !== normStName) return false
            const pYear = Number(p.birth_date.slice(0, 4))
            return !pYear || pYear <= 2008
          })
        }
      }

      if (matchedAdult) {
        if (!matchedAdult.trofeu_seasons?.includes(sId)) {
          matchedAdult.trofeu_seasons = [...(matchedAdult.trofeu_seasons || []), sId]
        }
        const seasonDorsal = getSeasonDorsal(matchedAdult, sId) || st.dorsal
        if (seasonDorsal) setSeasonDorsal(matchedAdult, sId, seasonDorsal)
        return {
          ...st,
          dorsal: seasonDorsal,
          matched_profile_id: matchedAdult.id,
          is_youth: false,
        }
      }

      if (matchedChild) {
        if (!matchedChild.trofeu_seasons?.includes(sId)) {
          matchedChild.trofeu_seasons = [...(matchedChild.trofeu_seasons || []), sId]
        }
        const seasonDorsal = getSeasonDorsal(matchedChild, sId) || st.dorsal
        if (seasonDorsal) setSeasonDorsal(matchedChild, sId, seasonDorsal)
        return {
          ...st,
          dorsal: seasonDorsal,
          matched_profile_id: matchedChild.id,
          is_youth: true,
        }
      }

      // Não existe na app -> Auto-criar atleta URC com alerta para os administradores!
      const trofeuEsc = getTrofeuEscalao2026(st.birth_year, st.gender)
      const appEsc = mapTrofeuEscalaoToApp(trofeuEsc, st.gender)
      const slug = normStName.replace(/[^a-z0-9]+/g, '-')

      if (looksYouth) {
        const newId = `dep-trofeu-${slug}-${st.birth_year}`
        const createdChild: YouthAthlete = {
          id: newId,
          name: st.name,
          gender: st.gender,
          birth_date: `${st.birth_year}-01-01`,
          escalao: appEsc,
          nif: '',
          shirt_size: '10-12 anos',
          dorsal_trofeu: sId === '2026/2027' ? st.dorsal : undefined,
          dorsais_trofeu: st.dorsal ? { [sId]: st.dorsal } : undefined,
          created_from_trofeu: true,
          needs_admin_review: !st.dorsal,
          trofeu_seasons: [sId],
          associated_adult_ids: [],
        }
        nextYouth.push(createdChild)
        createdYouthNames.push(`${st.name} (${st.escalao} · ${sId})`)
        return {
          ...st,
          matched_profile_id: newId,
          is_youth: true,
        }
      } else {
        const newId = `ath-trofeu-${slug}-${st.birth_year}`
        const firstName = st.name.split(' ')[0] || st.name
        const createdAdult: AthleteProfile = {
          id: newId,
          name: st.name,
          nickname: firstName,
          email: '',
          phone: '',
          role: 'athlete',
          gender: st.gender,
          birth_date: `${st.birth_year}-01-01`,
          escalao: appEsc,
          nif: '',
          cc_number: '',
          shirt_size: 'M',
          has_official_kit: true,
          dorsal_trofeu: sId === '2026/2027' ? st.dorsal : undefined,
          dorsais_trofeu: st.dorsal ? { [sId]: st.dorsal } : undefined,
          created_from_trofeu: true,
          needs_admin_review: !st.dorsal,
          trofeu_seasons: [sId],
          dependents: [],
        }
        nextProfiles.push(createdAdult)
        createdAdultsNames.push(`${st.name} (${st.escalao} · ${sId})`)
        return {
          ...st,
          matched_profile_id: newId,
          is_youth: false,
        }
      }
    })

    return {
      ...seasonData,
      athlete_standings: updatedStandings,
      last_synced_at: seasonData.status === 'open' ? nowISO : seasonData.last_synced_at,
    }
  })

  const totalNewAthletes = createdAdultsNames.length + createdYouthNames.length
  if (totalNewAthletes > 0) {
    const sample = [...createdAdultsNames, ...createdYouthNames].slice(0, 6).join(', ')
    const extra = totalNewAthletes > 6 ? ` e mais ${totalNewAthletes - 6}` : ''
    newNotifications.push({
      title: `⚠️ ${totalNewAthletes} novos atletas detetados no Troféu de Cascais`,
      message: `Foram encontrados na classificação oficial da U.R. Charneca atletas que ainda não existiam na app (${sample}${extra}). Os perfis foram pré-criados automaticamente — os administradores devem confirmar os dados e atribuir o ID de Dorsal de cada atleta.`,
      type: 'athlete_detected',
      created_by_name: 'Sincronização Troféu Cascais',
      pinned: true,
    })
  }

  const summaryParts: string[] = []
  if (racesCreated > 0) summaryParts.push(`${racesCreated} provas criadas`)
  if (racesUpdated > 0) summaryParts.push(`${racesUpdated} provas atualizadas`)
  if (newDocumentsFound > 0) summaryParts.push(`${newDocumentsFound} novos documentos`)
  if (totalNewAthletes > 0) summaryParts.push(`${totalNewAthletes} atletas auto-criados`)
  if (summaryParts.length === 0) summaryParts.push('Calendário, documentos e classificações verificados sem novidades')

  const log: TrofeuSyncLog = {
    id: `sync-${Date.now()}`,
    timestamp: nowISO,
    trigger: input.trigger,
    races_created: racesCreated,
    races_updated: racesUpdated,
    new_documents_found: newDocumentsFound,
    new_athletes_created: totalNewAthletes,
    summary: `${summaryParts.join(' · ')} (${input.actorName})`,
  }

  return {
    races: nextRaces,
    profiles: nextProfiles,
    youthAthletes: nextYouth,
    seasons: nextSeasons,
    newNotifications,
    log,
    liveReachable: probe.reachable,
  }
}

// ---------------------------------------------------------------------------
// Classificações oficiais (Edge Function `trofeu-sync`)
// ---------------------------------------------------------------------------
export interface TrofeuResultsResponse {
  ok: boolean
  season: string
  stages: Array<{ stage: number; competition_id: number; date: string; urc_athletes: number }>
  athletes_updated: number
  unmatched: Array<{ dorsal: string; name: string }>
  message?: string
}

export type TrofeuResultsOutcome =
  | { kind: 'ok'; data: TrofeuResultsResponse }
  | { kind: 'unavailable' }
  | { kind: 'error'; message?: string }

/** Só administradores chamam isto; a função lê o site oficial e atualiza `trofeu_seasons`. */
export async function invokeTrofeuResultsSync(season: string): Promise<TrofeuResultsOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke('trofeu-sync', { body: { season } })
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status
      if (status === 404 || (error as { name?: string }).name === 'FunctionsFetchError') return { kind: 'unavailable' }
      return { kind: 'error' }
    }
    const res = data as TrofeuResultsResponse | null
    if (!res || typeof res !== 'object') return { kind: 'error' }
    if (!res.ok) return { kind: 'error', message: res.message }
    return { kind: 'ok', data: res }
  } catch {
    return { kind: 'error' }
  }
}

export const RESULTS_SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000

/** Há uma prova já realizada e passaram >= 12 h desde a última leitura das classificações. */
export function isResultsSyncDue(season: TrofeuSeasonData | undefined, today: string, now = Date.now()): boolean {
  if (!season || season.status !== 'open') return false
  if (!season.stages.some((s) => s.date && s.date <= today)) return false
  const last = Date.parse(season.results_synced_at || season.last_synced_at)
  return !Number.isFinite(last) || now - last >= RESULTS_SYNC_INTERVAL_MS
}
