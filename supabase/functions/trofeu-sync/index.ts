// Edge Function `trofeu-sync` (Deno).
// Lê as classificações OFICIAIS de https://trofeuatletismocascais.pt e atualiza `trofeu_seasons`
// (athlete_standings, club_standings, last_synced_at) da época em curso.
// Só aceita pedidos de administradores (JWT validado com a RPC `is_admin`).
// Não regista nomes nem dorsais nos logs.

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  aggregateAthletes,
  birthYearFromDate,
  buildGeneralStandings,
  buildStageAthletes,
  buildStageClubs,
  buildUrcStandings,
  computeClubStandings,
  crossCheckUrc,
  isDateInSeason,
  isUrcClub,
  matchCompetitionsToRaces,
  mergeStanding,
  parseClassificationPage,
  parseCollectivePage,
  parseCompetitionPage,
  rankAthletes,
  seasonStartYear,
  todayLisbon,
  type AthleteStanding,
  type ClassificationRow,
  type ClubRow,
  type CompetitionInfo,
  type FichaLite,
  type PendingRace,
  type StageInput,
} from './parse.ts'

const SITE = 'https://trofeuatletismocascais.pt'
const USER_AGENT = 'URCharneca-TrofeuSync/1.0 (+https://github.com/rpmariano/URCharneca)'
const FETCH_TIMEOUT_MS = 15_000
const STAGE_CONCURRENCY = 3 // pedidos em paralelo às etapas
const SCAN_CONCURRENCY = 6 // máximo pedido: ~6 em paralelo
const SCAN_PAUSE_MS = 150
const DEFAULT_SCAN_AHEAD = 80
const MAX_SCAN_AHEAD = 200

const DEFAULT_ORIGINS = [
  'https://rpmariano.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
]

function allowedOrigins(): string[] {
  const extra = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return [...DEFAULT_ORIGINS, ...extra]
}

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (origin && allowedOrigins().includes(origin)) h['Access-Control-Allow-Origin'] = origin
  return h
}

function reply(status: number, body: Record<string, unknown>, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** GET com timeout e 1 nova tentativa em erros de rede/5xx. 404 -> null. */
async function fetchText(url: string): Promise<string | null> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (res.status === 404) return null
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      lastErr = e
      await sleep(600)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('falha de rede')
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

interface RaceRow {
  id: string
  title: string
  date: string
  trophy_stage_number: number | null
  trofeu_competition_id: number | null
}

interface PersonRow {
  id: string
  name: string
  birth_date: string | null
  dorsal_trofeu: string | null
  dorsais_trofeu: Record<string, string> | null
}

function toFichas(rows: PersonRow[], season: string, isYouth: boolean): FichaLite[] {
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    birthYear: birthYearFromDate(p.birth_date),
    isYouth,
    dorsal: p.dorsais_trofeu?.[season] ?? (season === '2026/2027' ? (p.dorsal_trofeu ?? undefined) : undefined),
  }))
}

// deno-lint-ignore no-explicit-any
type Db = any

async function discoverCompetitionIds(
  pending: PendingRace[],
  anchorId: number,
  scanAhead: number,
  usedIds: Set<number>,
): Promise<{ matches: { raceId: string; competitionId: number }[]; ambiguous: string[]; scanned: number }> {
  const found: { id: number; info: CompetitionInfo }[] = []
  const dates = new Set(pending.map((r) => r.date))
  const foundDates = new Set<string>()
  let scanned = 0
  for (let start = anchorId + 1; start <= anchorId + scanAhead; start += SCAN_CONCURRENCY) {
    if ([...dates].every((d) => foundDates.has(d))) break // early-exit: todas as datas já têm candidato
    const ids = Array.from(
      { length: Math.min(SCAN_CONCURRENCY, anchorId + scanAhead - start + 1) },
      (_, i) => start + i,
    )
    const chunk = await Promise.all(
      ids.map(async (id) => {
        try {
          const html = await fetchText(`${SITE}/Competicoes/${id}`)
          return html ? { id, info: parseCompetitionPage(html) } : null
        } catch {
          return null // tolerar erros: o id fica por ver nesta execução
        }
      }),
    )
    scanned += ids.length
    for (const c of chunk) {
      if (c?.info) {
        found.push({ id: c.id, info: c.info })
        if (dates.has(c.info.date)) foundDates.add(c.info.date)
      }
    }
    await sleep(SCAN_PAUSE_MS)
  }
  return { ...matchCompetitionsToRaces(pending, found, usedIds), scanned }
}

async function handle(req: Request, cors: Record<string, string>): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new HttpError(500, 'Função mal configurada: faltam variáveis de ambiente do Supabase.')
  }

  // 1. Autenticação: só administradores.
  const auth = req.headers.get('Authorization') ?? ''
  const jwt = /^Bearer\s+(.+)$/i.exec(auth)?.[1]
  if (!jwt) throw new HttpError(401, 'Sem sessão. Inicia sessão como administrador.')
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: isAdmin, error: adminErr } = await userClient.rpc('is_admin')
  if (adminErr) throw new HttpError(401, 'Sessão inválida ou expirada. Volta a iniciar sessão.')
  if (isAdmin !== true) throw new HttpError(403, 'Apenas administradores podem sincronizar o Troféu.')

  // 2. Pedido
  let body: { season?: unknown; dry_run?: unknown; scan_ahead?: unknown } = {}
  try {
    const text = await req.text()
    if (text.trim()) body = JSON.parse(text)
  } catch {
    throw new HttpError(400, 'Corpo do pedido inválido: esperava JSON.')
  }
  const dryRun = body.dry_run === true
  const scanAhead = Math.min(
    MAX_SCAN_AHEAD,
    Math.max(1, typeof body.scan_ahead === 'number' ? Math.floor(body.scan_ahead) : DEFAULT_SCAN_AHEAD),
  )

  const db: Db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // 3. Época
  let seasonQuery = db.from('trofeu_seasons').select('*')
  seasonQuery =
    typeof body.season === 'string' && body.season
      ? seasonQuery.eq('season', body.season)
      : seasonQuery.eq('status', 'open').order('season', { ascending: false }).limit(1)
  const { data: seasonRows, error: seasonErr } = await seasonQuery
  if (seasonErr) throw new HttpError(500, 'Não foi possível ler as épocas do Troféu.')
  const seasonRow = seasonRows?.[0]
  if (!seasonRow) throw new HttpError(404, 'Não existe nenhuma época do Troféu em curso na base de dados.')
  const season: string = seasonRow.season
  if (seasonStartYear(season) === null) throw new HttpError(500, 'Época com formato inesperado (esperava AAAA/AAAA).')

  // 4. Provas da época
  const { data: allRaces, error: racesErr } = await db
    .from('races')
    .select('id,title,date,trophy_stage_number,trofeu_competition_id')
    .eq('category', 'trofeu_cascais')
  if (racesErr) throw new HttpError(500, 'Não foi possível ler as provas do Troféu.')
  const races = (allRaces ?? []) as RaceRow[]
  const seasonRaces = races
    .filter((r) => isDateInSeason(r.date, season) && r.trophy_stage_number != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  const totalSeasonStages = seasonRaces.length || (Array.isArray(seasonRow.stages) ? seasonRow.stages.length : 0)
  const today = todayLisbon()
  const pastRaces = seasonRaces.filter((r) => r.date <= today)
  if (pastRaces.length === 0) {
    return reply(200, {
      ok: true, season, stages: [], athletes_updated: 0, unmatched: [],
      message: 'Ainda não há provas desta época realizadas. Nada para sincronizar.',
    }, cors)
  }

  // 5. Descoberta de ids em falta (por data)
  const knownIds = races.map((r) => r.trofeu_competition_id).filter((x): x is number => typeof x === 'number')
  const idByRace = new Map<string, number>()
  for (const r of pastRaces) if (r.trofeu_competition_id != null) idByRace.set(r.id, r.trofeu_competition_id)
  const missing = pastRaces.filter((r) => !idByRace.has(r.id))
  const warnings: string[] = []
  const discovered: { stage: string; competition_id: number }[] = []
  if (missing.length > 0) {
    if (knownIds.length === 0) {
      warnings.push('Sem nenhum id de competição conhecido como ponto de partida; não foi possível descobrir ids novos.')
    } else {
      const anchor = Math.max(...knownIds)
      const res = await discoverCompetitionIds(
        missing.map((r) => ({ id: r.id, date: r.date, title: r.title })),
        anchor,
        scanAhead,
        new Set(knownIds),
      )
      for (const m of res.matches) {
        idByRace.set(m.raceId, m.competitionId)
        const race = missing.find((r) => r.id === m.raceId)
        discovered.push({ stage: `P${race?.trophy_stage_number}`, competition_id: m.competitionId })
      }
      for (const raceId of res.ambiguous) {
        const race = missing.find((r) => r.id === raceId)
        warnings.push(`Etapa P${race?.trophy_stage_number}: várias competições na mesma data; id não associado.`)
      }
      const stillMissing = missing.filter((r) => !idByRace.has(r.id) && !res.ambiguous.includes(r.id))
      for (const r of stillMissing) {
        warnings.push(`Etapa P${r.trophy_stage_number}: competição ainda não encontrada no site (procurados ${res.scanned} ids a seguir ao ${anchor}).`)
      }
    }
  }

  // 6. Classificações de cada etapa realizada com id conhecido
  const withId = pastRaces.filter((r) => idByRace.has(r.id))
  interface Fetched {
    race: RaceRow
    competitionId: number
    rows: ClassificationRow[]
    clubs: ClubRow[]
  }
  let fetched: Fetched[]
  try {
    fetched = await mapLimit(withId, STAGE_CONCURRENCY, async (race) => {
      const competitionId = idByRace.get(race.id)!
      const [indHtml, colHtml] = await Promise.all([
        fetchText(`${SITE}/Classificacao/${competitionId}/1`),
        fetchText(`${SITE}/Coletiva/${competitionId}/1`),
      ])
      return {
        race,
        competitionId,
        rows: indHtml ? parseClassificationPage(indHtml) : [],
        clubs: colHtml ? parseCollectivePage(colHtml) : [],
      }
    })
  } catch {
    throw new HttpError(502, 'Não foi possível ler as classificações do site do Troféu (falha de ligação). Nada foi gravado; tenta de novo daqui a pouco.')
  }

  const withResults = fetched.filter((f) => f.rows.length > 0)
  // Salvaguarda: não apagar etapas que já estavam gravadas se o site deixar de as mostrar.
  const existingStandings: AthleteStanding[] = Array.isArray(seasonRow.athlete_standings) ? seasonRow.athlete_standings : []
  const codesNow = new Set(withResults.map((f) => `P${f.race.trophy_stage_number}`))
  const lost = new Set<string>()
  for (const st of existingStandings) for (const code of Object.keys(st.points_per_stage ?? {})) if (!codesNow.has(code)) lost.add(code)
  if (lost.size > 0) {
    throw new HttpError(
      409,
      `O site não devolveu resultados das etapas já gravadas (${[...lost].sort().join(', ')}). Nada foi alterado, para não perder dados.`,
    )
  }
  if (withResults.length === 0) {
    return reply(200, {
      ok: true, season, stages: fetched.map((f) => ({ stage: `P${f.race.trophy_stage_number}`, competition_id: f.competitionId, date: f.race.date, urc_athletes: 0 })),
      athletes_updated: 0, unmatched: [], warnings,
      message: 'O site ainda não tem classificações publicadas para as provas realizadas.',
    }, cors)
  }

  // 7. Fichas (por dorsal da época, senão por nome)
  const [{ data: profs, error: e1 }, { data: youths, error: e2 }] = await Promise.all([
    db.from('profiles').select('id,name,birth_date,dorsal_trofeu,dorsais_trofeu'),
    db.from('youth_athletes').select('id,name,birth_date,dorsal_trofeu,dorsais_trofeu'),
  ])
  if (e1 || e2) throw new HttpError(500, 'Não foi possível ler as fichas dos atletas.')
  const fichas = [...toFichas((profs ?? []) as PersonRow[], season, false), ...toFichas((youths ?? []) as PersonRow[], season, true)]

  // 8. Cálculos
  const stageInputs: StageInput[] = withResults.map((f) => ({
    code: `P${f.race.trophy_stage_number}`,
    rows: f.rows,
    competitionId: f.competitionId,
    raceId: f.race.id,
  }))
  const ranked = rankAthletes(aggregateAthletes(stageInputs))
  const { standings, unmatched } = buildUrcStandings(ranked, { season, totalSeasonStages, fichas })
  const existingById = new Map(existingStandings.map((s) => [s.id, s]))
  const athleteStandings = standings.map((s) => mergeStanding(existingById.get(s.id), s))

  const clubStandings = computeClubStandings(
    withResults.map((f) => ({ code: `P${f.race.trophy_stage_number}`, rows: f.clubs })),
    season,
  )
  for (const f of withResults) {
    if (f.clubs.length === 0) warnings.push(`Etapa P${f.race.trophy_stage_number}: sem classificação coletiva no site; clubes incompletos.`)
    const diff = crossCheckUrc(f.rows, f.clubs)
    if (diff) warnings.push(`Etapa P${f.race.trophy_stage_number}: total da U.R. Charneca difere entre a coletiva (${diff.collective}) e a soma individual (${diff.individual}).`)
  }

  // 9. Gravação (só depois de tudo lido e calculado)
  const nowIso = new Date().toISOString()
  if (!dryRun) {
    for (const [raceId, competitionId] of idByRace) {
      const race = pastRaces.find((r) => r.id === raceId)
      if (race && race.trofeu_competition_id == null) {
        const { error } = await db.from('races').update({ trofeu_competition_id: competitionId }).eq('id', raceId)
        if (error) warnings.push(`Não foi possível gravar o id da competição da etapa P${race.trophy_stage_number}.`)
      }
    }
    const { error: upErr } = await db
      .from('trofeu_seasons')
      .update({ athlete_standings: athleteStandings, club_standings: clubStandings, last_synced_at: nowIso })
      .eq('season', season)
    if (upErr) throw new HttpError(500, 'Não foi possível gravar as classificações na base de dados.')

    // Classificações completas (todos os clubes): uma linha por etapa e a geral da época.
    // Só se escrevem as etapas lidas agora; as já gravadas que o site deixe de mostrar mantêm-se.
    const stageRows = withResults.map((f) => ({
      season,
      stage: `P${f.race.trophy_stage_number}`,
      race_id: f.race.id,
      competition_id: f.competitionId,
      athletes: buildStageAthletes(f.rows),
      clubs: buildStageClubs(f.clubs),
      synced_at: nowIso,
    }))
    const { error: stErr } = await db.from('trofeu_stage_results').upsert(stageRows, { onConflict: 'season,stage' })
    if (stErr) warnings.push('Não foi possível gravar as classificações completas de cada prova.')
    const { error: genErr } = await db
      .from('trofeu_general_standings')
      .upsert({ season, athletes: buildGeneralStandings(ranked), synced_at: nowIso }, { onConflict: 'season' })
    if (genErr) warnings.push('Não foi possível gravar a classificação geral de todos os clubes.')
  }

  const stagesOut = fetched.map((f) => ({
    stage: `P${f.race.trophy_stage_number}`,
    competition_id: f.competitionId,
    date: f.race.date,
    urc_athletes: f.rows.filter((r) => isUrcClub(r.club)).length,
  }))
  console.log(`trofeu-sync: etapas=${withResults.length} atletas=${athleteStandings.length} clubes=${clubStandings.length} dry_run=${dryRun}`)
  return reply(200, {
    ok: true,
    season,
    dry_run: dryRun,
    stages: stagesOut,
    athletes_updated: athleteStandings.length,
    clubs_updated: clubStandings.length,
    discovered_ids: discovered,
    unmatched,
    warnings,
    message: dryRun
      ? `Simulação: ${athleteStandings.length} atletas e ${clubStandings.length} clubes calculados a partir de ${withResults.length} etapa(s); nada foi gravado.`
      : `Sincronização concluída: ${athleteStandings.length} atletas e ${clubStandings.length} clubes atualizados a partir de ${withResults.length} etapa(s).`,
  }, cors)
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const cors = corsHeaders(origin)
  if (origin && !cors['Access-Control-Allow-Origin']) {
    return reply(403, { ok: false, message: 'Origem não autorizada.' }, cors)
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return reply(405, { ok: false, message: 'Método não permitido. Usa POST.' }, cors)
  try {
    return await handle(req, cors)
  } catch (e) {
    if (e instanceof HttpError) return reply(e.status, { ok: false, message: e.message }, cors)
    console.error('trofeu-sync: erro inesperado', e instanceof Error ? e.name : 'desconhecido')
    return reply(500, { ok: false, message: 'Erro inesperado na sincronização. Tenta de novo; se persistir, avisa o responsável técnico.' }, cors)
  }
})
