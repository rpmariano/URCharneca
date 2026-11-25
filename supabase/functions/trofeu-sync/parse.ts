// Parser e cálculos PUROS do Troféu de Atletismo de Cascais (sem imports Deno nem rede).
// Usado pela Edge Function `trofeu-sync` (index.ts) e testado em Node (tests/unit/trofeuParse.test.ts).

// ---------------------------------------------------------------------------
// Tipos (espelham TrofeuAthleteStanding / TrofeuClubStanding de src/types.ts)
// ---------------------------------------------------------------------------

export interface StageResult {
  pos: number
  points: number
  time?: string
  competition_id?: number
  race_id?: string
}

export interface AthleteStanding {
  id: string
  season: string
  season_status: 'open' | 'completed'
  escalao: string
  gender: 'M' | 'F'
  pos: number
  name: string
  birth_year: number
  team: string
  dorsal?: string
  points_per_stage: Record<string, number>
  total: number
  stages_participated: number
  total_season_stages: number
  eligible_for_prize: boolean
  is_urc: boolean
  matched_profile_id?: string
  is_youth?: boolean
  stage_results?: Record<string, StageResult>
}

export interface ClubStanding {
  season: string
  pos: number
  team: string
  points_per_stage: Record<string, number>
  total: number
  is_urc: boolean
  prize_amount_eur?: number
}

export interface CompetitionInfo {
  title: string
  /** AAAA-MM-DD */
  date: string
  time?: string
  location?: string
}

/** Uma linha da classificação individual de uma prova. */
export interface ClassificationRow {
  pos: number
  dorsal: string
  /** MAIÚSCULAS, tal como no site */
  name: string
  /** sigla do clube (ex.: "U R CHARNECA"); '' se sem clube */
  club: string
  /** escalão base sem género: "M35", "Seniores", "Sub-12" */
  escalaoBase: string
  gender: 'M' | 'F'
  /** rótulo no formato da app: "M35", "Seniores (M)", "Sub-12 (F)" */
  escalao: string
  time?: string
  points: number
}

export interface ClubRow {
  pos: number
  sigla: string
  name: string
  athletes: number
  points: number
}

// ---------------------------------------------------------------------------
// Utilitários de texto
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  atilde: 'ã', otilde: 'õ', Atilde: 'Ã', Otilde: 'Õ',
  agrave: 'à', Agrave: 'À', acirc: 'â', ecirc: 'ê', ocirc: 'ô',
  Acirc: 'Â', Ecirc: 'Ê', Ocirc: 'Ô', ccedil: 'ç', Ccedil: 'Ç',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole
    }
    return NAMED_ENTITIES[body] ?? whole
  })
}

/** Remove etiquetas, decodifica entidades e normaliza espaços (incl. nbsp). */
export function cellText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normaliza nomes: sem acentos, minúsculas, espaços únicos (igual a normalizeName da app). */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/schaller/g, 'shaller')
    .replace(/\s+/g, ' ')
    .trim()
}

const NAME_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'van', 'von', 'der', 'den'])

/** "LUÍS FILIPE DA SILVA" -> "Luís Filipe da Silva" */
export function titleCaseName(name: string): string {
  const cap = (w: string) =>
    w.replace(/(^|[-'’])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word, i) => {
      const lower = word.toLowerCase()
      if (i > 0 && NAME_PARTICLES.has(lower)) return lower
      return cap(lower)
    })
    .join(' ')
}

/** Sigla/nome do clube da U.R. Charneca. */
export function isUrcClub(label: string): boolean {
  const n = normalizeName(label).replace(/[^a-z]/g, '')
  return n === 'urcharneca' || n === 'uniaorecreativadacharneca'
}

// ---------------------------------------------------------------------------
// Pontos por prova (espelha TROFEU_POINTS_TABLE de src/data/trofeuData.ts;
// a Edge Function não pode importar de src/, há um teste que garante a igualdade)
// ---------------------------------------------------------------------------

export function pointsForPlace(place: number): number {
  if (!Number.isFinite(place) || place <= 0) return 0
  const top = [15, 13, 11, 10, 9, 8, 7, 6, 5, 4]
  if (place <= 10) return top[place - 1]
  if (place <= 20) return 3
  if (place <= 30) return 2
  return 1
}

// ---------------------------------------------------------------------------
// Parsing das páginas do site
// ---------------------------------------------------------------------------

function spanById(html: string, idSuffix: string): string {
  const re = new RegExp(`id="[^"]*${idSuffix}"[^>]*>([\\s\\S]*?)</`, 'i')
  const m = re.exec(html)
  return m ? cellText(m[1]) : ''
}

/**
 * /Competicoes/<id>. Ids inexistentes devolvem HTTP 200 com o modelo vazio,
 * por isso a página só "existe" se tiver título e data DD-MM-AAAA.
 */
export function parseCompetitionPage(html: string): CompetitionInfo | null {
  const title = spanById(html, 'EventoDetalhe_span_nome')
  const rawDate = spanById(html, 'EventoDetalhe_span_data')
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(rawDate)
  if (!title || !m) return null
  const time = /(\d{1,2}:\d{2})/.exec(spanById(html, 'EventoDetalhe_span_hora'))?.[1]
  const location = spanById(html, 'EventoDetalhe_span_localidade').replace(/\.$/, '') || undefined
  return { title, date: `${m[3]}-${m[2]}-${m[1]}`, time, location }
}

function tableRows(tableHtml: string): string[][] {
  const rows: string[][] = []
  for (const tr of tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? []
    rows.push(cells)
  }
  return rows
}

/** Texto do clube: preferir o <span> (sigla); senão o alt da imagem; senão texto simples. */
function clubCell(cellHtml: string): string {
  const span = /<span[^>]*>([\s\S]*?)<\/span>/i.exec(cellHtml)
  if (span && cellText(span[1])) return cellText(span[1])
  const alt = /alt="([^"]*)"/i.exec(cellHtml)
  if (alt && cellText(alt[1])) return cellText(alt[1])
  return cellText(cellHtml)
}

function headerIndex(headers: string[], ...names: string[]): number {
  const norm = headers.map((h) => normalizeName(h).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim())
  for (const n of names) {
    const i = norm.findIndex((h) => h === n)
    if (i >= 0) return i
  }
  return -1
}

/** "M35  (Masculino)" -> { base: "M35", gender: "M" } */
export function parseBlockHeader(raw: string): { base: string; gender: 'M' | 'F' | null } | null {
  const text = cellText(raw)
  if (!text) return null
  const g = /\((masculino|feminino|m|f)\)\s*$/i.exec(text)
  const base = text.replace(/\s*\((masculino|feminino|m|f)\)\s*$/i, '').trim()
  if (!base) return null
  let gender: 'M' | 'F' | null = null
  if (g) gender = g[1].toLowerCase().startsWith('f') ? 'F' : 'M'
  else if (/^[MF]\d{2}$/.test(base)) gender = base[0] as 'M' | 'F'
  return { base, gender }
}

/** Rótulo de escalão no formato da app: "M35" tal como está; os restantes com "(M)"/"(F)". */
export function escalaoLabel(base: string, gender: 'M' | 'F'): string {
  return /^[MF]\d{2}$/.test(base) ? base : `${base} (${gender})`
}

/**
 * /Classificacao/<id>/1 — classificação individual da prova. A página tem várias tabelas
 * (uma por escalão/género); o género e o escalão vêm do cabeçalho de cada bloco.
 */
export function parseClassificationPage(html: string): ClassificationRow[] {
  const out: ClassificationRow[] = []
  const tokenRe = /nome_bloco_\d+"[^>]*>([\s\S]*?)<\/span>|<table[\s\S]*?<\/table>/gi
  let currentBlock: { base: string; gender: 'M' | 'F' | null } | null = null
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(html)) !== null) {
    if (m[1] !== undefined) {
      currentBlock = parseBlockHeader(m[1])
      continue
    }
    const rows = tableRows(m[0])
    if (rows.length < 2) continue
    const headers = rows[0].map(cellText)
    const iPos = headerIndex(headers, 'pos', 'posicao')
    const iDorsal = headerIndex(headers, 'dorsal')
    const iName = headerIndex(headers, 'nome')
    if (iPos < 0 || iDorsal < 0 || iName < 0) continue
    const iClub = headerIndex(headers, 'clube')
    const iEsc = headerIndex(headers, 'escalao')
    const iTime = headerIndex(headers, 'marca', 'tempo')
    const iPts = headerIndex(headers, 'pontos')

    for (const cells of rows.slice(1)) {
      const pos = parseInt(cellText(cells[iPos] ?? ''), 10)
      if (!Number.isFinite(pos) || pos <= 0) continue // DNF/DQ/sem lugar: sem pontos
      const name = cellText(cells[iName] ?? '')
      if (!name) continue
      const dorsal = cellText(cells[iDorsal] ?? '')
      const club = iClub >= 0 ? clubCell(cells[iClub] ?? '') : ''
      const escCell = iEsc >= 0 ? cellText(cells[iEsc] ?? '') : ''
      const cellBlock = parseBlockHeader(escCell)
      const base = currentBlock?.base ?? cellBlock?.base ?? ''
      const gender = currentBlock?.gender ?? cellBlock?.gender ?? null
      if (!base || !gender) continue
      const rawPts = iPts >= 0 ? parseInt(cellText(cells[iPts] ?? ''), 10) : NaN
      const time = iTime >= 0 ? cellText(cells[iTime] ?? '') : ''
      out.push({
        pos,
        dorsal,
        name,
        club,
        escalaoBase: base,
        gender,
        escalao: escalaoLabel(base, gender),
        time: time || undefined,
        points: Number.isFinite(rawPts) ? rawPts : pointsForPlace(pos),
      })
    }
  }
  return out
}

/**
 * /Coletiva/<id>/1 — classificação coletiva por clubes da prova. Usa a tabela "Coletivo Misto"
 * (a que tem dados); as tabelas Masculina/Feminina da página vêm vazias.
 */
export function parseCollectivePage(html: string): ClubRow[] {
  const candidates: { id: string; rows: ClubRow[] }[] = []
  const tableRe = /<table([^>]*)>([\s\S]*?)<\/table>/gi
  let m: RegExpExecArray | null
  while ((m = tableRe.exec(html)) !== null) {
    const rows = tableRows(m[0])
    if (rows.length < 1) continue
    const headers = rows[0].map(cellText)
    const iPos = headerIndex(headers, 'posicao', 'pos')
    const iSigla = headerIndex(headers, 'sigla')
    const iName = headerIndex(headers, 'nome equipa', 'equipa', 'clube')
    const iAth = headerIndex(headers, 'n atletas', 'no atletas', 'atletas')
    const iPts = headerIndex(headers, 'pontos')
    if (iPos < 0 || iName < 0 || iPts < 0) continue
    const parsed: ClubRow[] = []
    for (const cells of rows.slice(1)) {
      const pos = parseInt(cellText(cells[iPos] ?? ''), 10)
      const points = parseInt(cellText(cells[iPts] ?? ''), 10)
      const name = cellText(cells[iName] ?? '')
      if (!Number.isFinite(pos) || !Number.isFinite(points) || !name) continue
      parsed.push({
        pos,
        sigla: iSigla >= 0 ? cellText(cells[iSigla] ?? '') : '',
        name,
        athletes: iAth >= 0 ? parseInt(cellText(cells[iAth] ?? ''), 10) || 0 : 0,
        points,
      })
    }
    candidates.push({ id: /id="([^"]*)"/i.exec(m[1])?.[1] ?? '', rows: parsed })
  }
  const withData = candidates.filter((c) => c.rows.length > 0)
  if (withData.length === 0) return []
  const mixed = withData.find((c) => /mista/i.test(c.id))
  if (mixed) return mixed.rows
  return withData.sort((a, b) => b.rows.length - a.rows.length)[0].rows
}

// ---------------------------------------------------------------------------
// Datas e época
// ---------------------------------------------------------------------------

/** Data de hoje (AAAA-MM-DD) em Lisboa. */
export function todayLisbon(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** "2026/2027" -> 2026 */
export function seasonStartYear(season: string): number | null {
  const m = /^(\d{4})\/(\d{4})$/.exec(season.trim())
  return m ? parseInt(m[1], 10) : null
}

/** A época corre de 1 de agosto a 31 de julho. */
export function isDateInSeason(date: string, season: string): boolean {
  const y = seasonStartYear(season)
  if (y === null) return false
  return date >= `${y}-08-01` && date < `${y + 1}-08-01`
}

/** Mínimo de provas para ser elegível aos prémios (Regra 5.3.1: 70%). */
export function minStagesForPrize(totalSeasonStages: number): number {
  return Math.ceil(0.7 * Math.max(0, totalSeasonStages))
}

// ---------------------------------------------------------------------------
// Descoberta de ids de competição (por data)
// ---------------------------------------------------------------------------

export interface PendingRace {
  id: string
  date: string
  title: string
}

function tokens(s: string): Set<string> {
  return new Set(
    normalizeName(s)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !['etapa', 'trofeu', 'prova', 'atletismo', 'cascais'].includes(t)),
  )
}

/**
 * Associa competições descobertas às provas por DATA. Se uma data tiver várias competições,
 * desempata pelas palavras em comum com o título da prova; se continuar ambíguo, não associa.
 */
export function matchCompetitionsToRaces(
  races: PendingRace[],
  found: { id: number; info: CompetitionInfo }[],
  alreadyUsedIds: Set<number> = new Set(),
): { matches: { raceId: string; competitionId: number }[]; ambiguous: string[] } {
  const matches: { raceId: string; competitionId: number }[] = []
  const ambiguous: string[] = []
  const used = new Set(alreadyUsedIds)
  for (const race of races) {
    const sameDay = found.filter((f) => f.info.date === race.date && !used.has(f.id))
    if (sameDay.length === 0) continue
    let chosen: { id: number } | undefined
    if (sameDay.length === 1) chosen = sameDay[0]
    else {
      const rt = tokens(race.title)
      const scored = sameDay
        .map((f) => ({ f, score: [...tokens(f.info.title)].filter((t) => rt.has(t)).length }))
        .sort((a, b) => b.score - a.score)
      if (scored[0].score > 0 && scored[0].score > scored[1].score) chosen = scored[0].f
    }
    if (chosen) {
      matches.push({ raceId: race.id, competitionId: chosen.id })
      used.add(chosen.id)
    } else {
      ambiguous.push(race.id)
    }
  }
  return { matches, ambiguous }
}

// ---------------------------------------------------------------------------
// Classificação acumulada por escalão (todos os clubes)
// ---------------------------------------------------------------------------

export interface StageInput {
  /** "P1", "P2", ... */
  code: string
  rows: ClassificationRow[]
  competitionId?: number
  raceId?: string
}

export interface AthleteAggregate {
  key: string
  dorsal: string
  name: string
  club: string
  escalao: string
  gender: 'M' | 'F'
  results: Record<string, StageResult>
  total: number
  stagesParticipated: number
  firsts: number
  seconds: number
  thirds: number
  /** lugar acumulado no escalão (preenchido por rankAthletes) */
  pos: number
}

function groupKey(a: { escalao: string; gender: 'M' | 'F' }): string {
  return `${a.gender}|${a.escalao}`
}

/**
 * Soma os pontos por dorsal ao longo das provas. O escalão/clube/nome vêm da prova mais recente
 * em que o atleta aparece. Se o mesmo dorsal aparecer duas vezes numa prova, conta a melhor linha.
 */
export function aggregateAthletes(stages: StageInput[]): AthleteAggregate[] {
  const byKey = new Map<string, AthleteAggregate>()
  const ordered = [...stages].sort((a, b) => stageNumber(a.code) - stageNumber(b.code))
  for (const stage of ordered) {
    const seen = new Set<string>()
    const rows = [...stage.rows].sort((a, b) => a.pos - b.pos)
    for (const r of rows) {
      const key = r.dorsal ? `d:${r.dorsal}` : `n:${normalizeName(r.name)}`
      if (seen.has(key)) continue
      seen.add(key)
      let agg = byKey.get(key)
      if (!agg) {
        agg = {
          key, dorsal: r.dorsal, name: r.name, club: r.club, escalao: r.escalao, gender: r.gender,
          results: {}, total: 0, stagesParticipated: 0, firsts: 0, seconds: 0, thirds: 0, pos: 0,
        }
        byKey.set(key, agg)
      }
      agg.name = r.name
      agg.club = r.club || agg.club
      agg.escalao = r.escalao
      agg.gender = r.gender
      const res: StageResult = { pos: r.pos, points: r.points }
      if (r.time) res.time = r.time
      if (stage.competitionId !== undefined) res.competition_id = stage.competitionId
      if (stage.raceId) res.race_id = stage.raceId
      agg.results[stage.code] = res
    }
  }
  const list = [...byKey.values()]
  for (const a of list) {
    const rs = Object.values(a.results)
    a.total = rs.reduce((s, r) => s + r.points, 0)
    a.stagesParticipated = rs.length
    a.firsts = rs.filter((r) => r.pos === 1).length
    a.seconds = rs.filter((r) => r.pos === 2).length
    a.thirds = rs.filter((r) => r.pos === 3).length
  }
  return list
}

function stageNumber(code: string): number {
  const n = parseInt(code.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

/**
 * Atribui o lugar acumulado dentro de cada escalão/género. Critérios: mais pontos, mais provas,
 * mais 1.ºs, 2.ºs e 3.ºs lugares. Empate em tudo = mesmo lugar (ex.: 1, 2, 2, 4).
 */
export function rankAthletes(list: AthleteAggregate[]): AthleteAggregate[] {
  const cmp = (a: AthleteAggregate, b: AthleteAggregate) =>
    b.total - a.total ||
    b.stagesParticipated - a.stagesParticipated ||
    b.firsts - a.firsts ||
    b.seconds - a.seconds ||
    b.thirds - a.thirds
  const groups = new Map<string, AthleteAggregate[]>()
  for (const a of list) {
    const k = groupKey(a)
    const g = groups.get(k)
    if (g) g.push(a)
    else groups.set(k, [a])
  }
  for (const g of groups.values()) {
    g.sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name, 'pt') || a.dorsal.localeCompare(b.dorsal))
    g.forEach((a, i) => {
      a.pos = i > 0 && cmp(g[i - 1], a) === 0 ? g[i - 1].pos : i + 1
    })
  }
  return list
}

// ---------------------------------------------------------------------------
// Fichas (profiles / youth_athletes) e construção dos standings da U.R. Charneca
// ---------------------------------------------------------------------------

export interface FichaLite {
  id: string
  name: string
  /** 0 se desconhecido */
  birthYear: number
  isYouth: boolean
  /** dorsal da ÉPOCA em causa (dorsais_trofeu[época]); undefined se não tiver */
  dorsal?: string
}

export function birthYearFromDate(birthDate: string | null | undefined): number {
  const y = parseInt((birthDate ?? '').slice(0, 4), 10)
  return Number.isFinite(y) && y > 1900 ? y : 0
}

/** Ficha por dorsal da época; se não houver, por nome normalizado (só se for único e sem outro dorsal). */
export function matchFicha(dorsal: string, name: string, fichas: FichaLite[]): FichaLite | undefined {
  if (dorsal) {
    const byDorsal = fichas.filter((f) => f.dorsal === dorsal)
    if (byDorsal.length === 1) return byDorsal[0]
    if (byDorsal.length > 1) return undefined
  }
  const n = normalizeName(name)
  const byName = fichas.filter((f) => !f.dorsal && normalizeName(f.name) === n)
  return byName.length === 1 ? byName[0] : undefined
}

export interface BuildStandingsOptions {
  season: string
  totalSeasonStages: number
  teamName?: string
  fichas: FichaLite[]
}

export const URC_TEAM_NAME = 'UNIÃO RECREATIVA DA CHARNECA'

export function buildUrcStandings(
  ranked: AthleteAggregate[],
  opts: BuildStandingsOptions,
): { standings: AthleteStanding[]; unmatched: { dorsal: string; name: string }[] } {
  const standings: AthleteStanding[] = []
  const unmatched: { dorsal: string; name: string }[] = []
  const minStages = minStagesForPrize(opts.totalSeasonStages)
  for (const a of ranked.filter((x) => isUrcClub(x.club))) {
    const ficha = matchFicha(a.dorsal, a.name, opts.fichas)
    if (!ficha) unmatched.push({ dorsal: a.dorsal, name: titleCaseName(a.name) })
    const birthYear = ficha?.birthYear ?? 0
    const pointsPerStage: Record<string, number> = {}
    for (const [code, r] of Object.entries(a.results)) pointsPerStage[code] = r.points
    const youthByEscalao = /^Sub-(12|14|16|18)\b/i.test(a.escalao)
    const st: AthleteStanding = {
      id: `st-${opts.season}-${a.dorsal || normalizeName(a.name).replace(/[^a-z0-9]+/g, '-')}`,
      season: opts.season,
      season_status: 'open',
      escalao: a.escalao,
      gender: a.gender,
      pos: a.pos,
      name: titleCaseName(a.name),
      birth_year: birthYear,
      team: opts.teamName ?? URC_TEAM_NAME,
      points_per_stage: pointsPerStage,
      total: a.total,
      stages_participated: a.stagesParticipated,
      total_season_stages: opts.totalSeasonStages,
      eligible_for_prize: a.stagesParticipated >= minStages,
      is_urc: true,
      is_youth: ficha ? ficha.isYouth : youthByEscalao || (birthYear > 0 && birthYear >= 2009),
      stage_results: a.results,
    }
    if (a.dorsal) st.dorsal = a.dorsal
    if (ficha) st.matched_profile_id = ficha.id
    standings.push(st)
  }
  standings.sort(
    (x, y) => x.escalao.localeCompare(y.escalao, 'pt') || x.pos - y.pos || x.name.localeCompare(y.name, 'pt'),
  )
  return { standings, unmatched }
}

/** Mantém campos existentes que não conseguimos recalcular (ficha ausente, campos extra). */
export function mergeStanding(existing: Partial<AthleteStanding> | undefined, fresh: AthleteStanding): AthleteStanding {
  if (!existing) return fresh
  const merged: AthleteStanding = { ...existing, ...fresh } as AthleteStanding
  if (!fresh.birth_year && existing.birth_year) merged.birth_year = existing.birth_year
  if (!fresh.matched_profile_id && existing.matched_profile_id) merged.matched_profile_id = existing.matched_profile_id
  if (!fresh.matched_profile_id && existing.is_youth !== undefined) merged.is_youth = existing.is_youth
  return merged
}

// ---------------------------------------------------------------------------
// Classificação coletiva acumulada
// ---------------------------------------------------------------------------

export interface ClubStageInput {
  code: string
  rows: ClubRow[]
}

/** Soma dos pontos por clube ao longo das provas (a Coletiva de cada prova já traz o total do clube). */
export function computeClubStandings(stages: ClubStageInput[], season: string): ClubStanding[] {
  interface Acc {
    team: string
    perStage: Record<string, number>
    lastPos: number
    lastStage: number
  }
  const byKey = new Map<string, Acc>()
  for (const st of stages) {
    const n = stageNumber(st.code)
    for (const r of st.rows) {
      const key = normalizeName(r.name)
      let acc = byKey.get(key)
      if (!acc) {
        acc = { team: r.name, perStage: {}, lastPos: r.pos, lastStage: n }
        byKey.set(key, acc)
      }
      acc.perStage[st.code] = (acc.perStage[st.code] ?? 0) + r.points
      if (n >= acc.lastStage) {
        acc.lastStage = n
        acc.lastPos = r.pos
        acc.team = r.name
      }
    }
  }
  const list = [...byKey.values()].map((a) => ({
    ...a,
    total: Object.values(a.perStage).reduce((s, p) => s + p, 0),
    stages: Object.keys(a.perStage).length,
  }))
  list.sort(
    (a, b) => b.total - a.total || b.stages - a.stages || a.lastPos - b.lastPos || a.team.localeCompare(b.team, 'pt'),
  )
  return list.map((a, i) => ({
    season,
    pos: i + 1,
    team: a.team,
    points_per_stage: a.perStage,
    total: a.total,
    is_urc: isUrcClub(a.team),
  }))
}

/** Soma dos pontos individuais por sigla de clube (para validar contra a Coletiva). */
export function sumPointsByClub(rows: ClassificationRow[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = r.club || ''
    out[k] = (out[k] ?? 0) + r.points
  }
  return out
}

/** Compara o total da U.R. Charneca na Coletiva com a soma da classificação individual. */
export function crossCheckUrc(rows: ClassificationRow[], clubs: ClubRow[]): { individual: number; collective: number } | null {
  const coll = clubs.find((c) => isUrcClub(c.sigla) || isUrcClub(c.name))
  if (!coll) return null
  const individual = rows.filter((r) => isUrcClub(r.club)).reduce((s, r) => s + r.points, 0)
  return individual === coll.points ? null : { individual, collective: coll.points }
}

// ---------------------------------------------------------------------------
// Classificações completas (todos os clubes) para as tabelas trofeu_stage_results
// e trofeu_general_standings. Sem dorsal nem ano de nascimento (minimização de dados).
// ---------------------------------------------------------------------------

export interface PublicStageAthlete {
  pos: number
  name: string
  club: string
  escalao: string
  gender: 'M' | 'F'
  time?: string
  points: number
  urc: boolean
}

export interface PublicStageClub {
  pos: number
  sigla: string
  name: string
  athletes: number
  points: number
  urc: boolean
}

export interface PublicGeneralAthlete {
  pos: number
  name: string
  club: string
  escalao: string
  gender: 'M' | 'F'
  total: number
  stages: number
  pts: Record<string, number>
  urc: boolean
}

const byGroupThenPos = <T extends { gender: 'M' | 'F'; escalao: string; pos: number; name: string }>(a: T, b: T) =>
  a.gender.localeCompare(b.gender) || a.escalao.localeCompare(b.escalao, 'pt') || a.pos - b.pos || a.name.localeCompare(b.name, 'pt')

/** Classificação individual completa de uma prova, por escalão/género e lugar. */
export function buildStageAthletes(rows: ClassificationRow[]): PublicStageAthlete[] {
  return rows
    .map((r) => {
      const out: PublicStageAthlete = {
        pos: r.pos,
        name: titleCaseName(r.name),
        club: r.club,
        escalao: r.escalao,
        gender: r.gender,
        points: r.points,
        urc: isUrcClub(r.club),
      }
      if (r.time) out.time = r.time
      return out
    })
    .sort(byGroupThenPos)
}

/** Classificação coletiva de uma prova. */
export function buildStageClubs(clubs: ClubRow[]): PublicStageClub[] {
  return [...clubs]
    .sort((a, b) => a.pos - b.pos)
    .map((c) => ({
      pos: c.pos,
      sigla: c.sigla,
      name: c.name,
      athletes: c.athletes,
      points: c.points,
      urc: isUrcClub(c.sigla) || isUrcClub(c.name),
    }))
}

/** Classificação geral individual acumulada (todos os clubes), a partir de rankAthletes. */
export function buildGeneralStandings(ranked: AthleteAggregate[]): PublicGeneralAthlete[] {
  return ranked
    .map((a) => {
      const pts: Record<string, number> = {}
      for (const [code, r] of Object.entries(a.results)) pts[code] = r.points
      return {
        pos: a.pos,
        name: titleCaseName(a.name),
        club: a.club,
        escalao: a.escalao,
        gender: a.gender,
        total: a.total,
        stages: a.stagesParticipated,
        pts,
        urc: isUrcClub(a.club),
      }
    })
    .sort(byGroupThenPos)
}
