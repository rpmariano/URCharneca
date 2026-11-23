import type {
  AthleteProfile,
  Race,
  RaceDocument,
  TrofeuAthleteStanding,
  TrofeuClubStanding,
  TrofeuSeasonData,
  TrofeuSeasonStage,
  YouthAthlete,
} from '../types'

export const TROFEU_SITE_URL = 'https://trofeuatletismocascais.pt/'
export const TROFEU_REGULATION_2026_2027_URL =
  'https://trofeuatletismocascais.pt/General/Download.ashx?hUOMJ16Jcq/0JVs9/5M7BnydbNVFzlASbVLD2uE7UPY='

/** Pontuação oficial por prova e escalão (Ponto 5 / Anexo do Regulamento 2026/2027) */
export function calculateTrofeuPoints(place: number): number {
  if (place <= 0) return 0
  if (place === 1) return 15
  if (place === 2) return 13
  if (place === 3) return 11
  if (place === 4) return 10
  if (place === 5) return 9
  if (place === 6) return 8
  if (place === 7) return 7
  if (place === 8) return 6
  if (place === 9) return 5
  if (place === 10) return 4
  if (place <= 20) return 3
  if (place <= 30) return 2
  return 1
}

export const TROFEU_POINTS_TABLE: Array<{ label: string; points: number }> = [
  { label: '1º lugar', points: 15 },
  { label: '2º lugar', points: 13 },
  { label: '3º lugar', points: 11 },
  { label: '4º lugar', points: 10 },
  { label: '5º lugar', points: 9 },
  { label: '6º lugar', points: 8 },
  { label: '7º lugar', points: 7 },
  { label: '8º lugar', points: 6 },
  { label: '9º lugar', points: 5 },
  { label: '10º lugar', points: 4 },
  { label: '11º ao 20º', points: 3 },
  { label: '21º ao 30º', points: 2 },
  { label: '31º até último', points: 1 },
]

/** Comparticipação financeira coletiva para a época 2026/2027 (Ponto 7.6.1 do Regulamento) */
export const TROFEU_COLLECTIVE_PRIZES_2026_2027: Array<{ pos: number; label: string; amountEur: number }> = [
  { pos: 1, label: '1ª Equipa', amountEur: 2000 },
  { pos: 2, label: '2ª Equipa', amountEur: 1600 },
  { pos: 3, label: '3ª Equipa', amountEur: 1300 },
  { pos: 4, label: '4ª Equipa', amountEur: 1100 },
  { pos: 5, label: '5ª Equipa', amountEur: 900 },
  { pos: 6, label: '6ª Equipa', amountEur: 700 },
  { pos: 7, label: '7ª Equipa', amountEur: 500 },
  { pos: 8, label: '8ª à última', amountEur: 300 },
]

export function getCollectivePrizeEur(pos: number): number {
  if (pos <= 0) return 0
  const found = TROFEU_COLLECTIVE_PRIZES_2026_2027.find((p) => p.pos === pos)
  return found ? found.amountEur : 300
}

/** Tabela oficial de escalões para a época 2026/2027 (Ponto 4 do Documento Orientador) */
export const TROFEU_ESCALOES_2026_2027 = [
  { escalao: 'Sub-12', years: '2016–2018', estrada: '450m–800m', cortaMato: '450m–800m' },
  { escalao: 'Sub-14', years: '2014–2015', estrada: '1000m–1500m', cortaMato: '1000m–1500m' },
  { escalao: 'Sub-16', years: '2012–2013', estrada: '2000m–3000m', cortaMato: '2000m–3000m' },
  { escalao: 'Sub-18', years: '2010–2011', estrada: '3000m–4500m', cortaMato: '2500m–4000m' },
  { escalao: 'Sub-20', years: '2008–2009', estrada: 'M: 6–9km | F: 3–4,5km', cortaMato: 'M: 2,5–6km | F: 2,5–4km' },
  { escalao: 'Sub-23', years: '2005–2007', estrada: 'M: 6–9km | F: 3–4,5km', cortaMato: 'M: 4–6km | F: 2,5–4km' },
  { escalao: 'Seniores', years: '1993–2004', estrada: 'M: 6–9km | F: 3–4,5km', cortaMato: 'M: 4–6km | F: 2,5–4km' },
  { escalao: 'M35 / F35', years: '1988–1992', estrada: 'M: 6–9km | F: 3–4,5km', cortaMato: 'M: 4–6km | F: 2,5–4km' },
  { escalao: 'M40 / F40', years: '1983–1987', estrada: 'M: 6–9km | F: 3–4,5km', cortaMato: 'M: 4–6km | F: 2,5–4km' },
  { escalao: 'M45 / F45', years: '1978–1982', estrada: 'M: 6–9km | F: 3–4,5km', cortaMato: 'M: 4–6km | F: 2,5–4km' },
  { escalao: 'M50 / F50', years: '1973–1977', estrada: 'M: 6–9km | F: 3–4,5km', cortaMato: 'M: 4–6km | F: 2,5–4km' },
  { escalao: 'M55 / F55', years: '1968–1972', estrada: 'M: 6–9km | F: 3–4,5km', cortaMato: 'M: 4–6km | F: 2,5–4km' },
  { escalao: 'M60 / F60', years: '1963–1967', estrada: '3000m–4500m', cortaMato: '2500m–4000m' },
  { escalao: 'M65 / F65', years: '1958–1962', estrada: '3000m–4500m', cortaMato: '2500m–4000m' },
  { escalao: 'M70 / F70', years: '1953–1957 (F <=1957)', estrada: '3000m–4500m', cortaMato: '2500m–4000m' },
  { escalao: 'M75', years: '1948–1952', estrada: '3000m–4500m', cortaMato: '2500m–4000m' },
  { escalao: 'M80', years: '<= 1947', estrada: '3000m–4500m', cortaMato: '2500m–4000m' },
]

/** Calcula o escalão oficial 2026/2027 pelo ano de nascimento e género (Ponto 4) */
export function getTrofeuEscalao2026(birthYear: number, gender: 'M' | 'F'): string {
  if (birthYear >= 2016) return 'Sub-12'
  if (birthYear >= 2014) return 'Sub-14'
  if (birthYear >= 2012) return 'Sub-16'
  if (birthYear >= 2010) return 'Sub-18'
  if (birthYear >= 2008) return 'Sub-20'
  if (birthYear >= 2005) return gender === 'F' ? 'Sub-23 F' : 'Sub-23 M'
  if (birthYear >= 1993) return gender === 'F' ? 'Seniores F' : 'Seniores M'
  if (birthYear >= 1988) return gender === 'F' ? 'F35' : 'M35'
  if (birthYear >= 1983) return gender === 'F' ? 'F40' : 'M40'
  if (birthYear >= 1978) return gender === 'F' ? 'F45' : 'M45'
  if (birthYear >= 1973) return gender === 'F' ? 'F50' : 'M50'
  if (birthYear >= 1968) return gender === 'F' ? 'F55' : 'M55'
  if (birthYear >= 1963) return gender === 'F' ? 'F60' : 'M60'
  if (birthYear >= 1958) return gender === 'F' ? 'F65' : 'M65'
  if (gender === 'F') return 'F70'
  if (birthYear >= 1953) return 'M70'
  if (birthYear >= 1948) return 'M75'
  return 'M80'
}

/** Converte o escalão do Troféu para o padrão de `ESCALOES_ATLETISMO` na app */
export function mapTrofeuEscalaoToApp(trofeuEscalao: string, gender: 'M' | 'F'): string {
  const clean = trofeuEscalao.replace(/\s*\((Masculino|Feminino)\)/i, '').trim()
  if (clean.startsWith('Sub-12')) return 'Benjamins B (Sub-12)'
  if (clean.startsWith('Sub-14')) return 'Infantis (Sub-14)'
  if (clean.startsWith('Sub-16')) return 'Iniciados (Sub-16)'
  if (clean.startsWith('Sub-18')) return 'Juvenis (Sub-18)'
  if (clean.startsWith('Sub-20')) return 'Juniores (Sub-20)'
  if (clean.startsWith('Sub-23')) return gender === 'F' ? 'Sub-23 F' : 'Sub-23 M'
  if (clean.startsWith('Seniores')) return gender === 'F' ? 'Seniores F' : 'Seniores M'
  if (clean === 'M35' || clean === 'F35') return `Veteranos ${clean}`
  if (clean === 'M40' || clean === 'F40') return `Veteranos ${clean}`
  if (clean === 'M45' || clean === 'F45') return `Veteranos ${clean}`
  if (clean === 'M50' || clean === 'F50') return `Veteranos ${clean}`
  if (clean === 'M55' || clean === 'F55') return `Veteranos ${clean}`
  return gender === 'F' ? 'Veteranos F60+' : 'Veteranos M60+'
}

/** Calcula o prazo limite de inscrição: 3º dia útil anterior (quarta-feira para provas ao domingo — Ponto 3.2) */
export function calculateDeadlineISO(raceDateISO: string): string {
  const [y, m, d] = raceDateISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  let businessDays = 0
  while (businessDays < 3) {
    dt.setDate(dt.getDate() - 1)
    const dow = dt.getDay()
    if (dow !== 0 && dow !== 6) businessDays++
  }
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

interface RawStageDef {
  id: string
  stage_number: number
  title: string
  date: string
  location: string
  organizer: string
  trofeu_competition_id?: number
  distances: string[]
  children_distances: string[]
  description: string
  documents: RaceDocument[]
}

const REG_DOC: RaceDocument = {
  id: 'doc-reg-geral-26-27',
  title: 'Regulamento Geral do Troféu 2026/2027 (PDF)',
  type: 'regulamento_geral',
  url: TROFEU_REGULATION_2026_2027_URL,
  detected_at: '2026-11-10T09:00:00Z',
}

/** As 13 etapas oficiais do Calendário 2026/2027 (Ponto 12 do Documento Orientador) */
export const TROFEU_2026_2027_STAGE_DEFS: RawStageDef[] = [
  {
    id: 'race-trofeu-1-2026',
    stage_number: 1,
    trofeu_competition_id: 920,
    title: '1º Grande Prémio do Bairro Irene',
    date: '2026-11-22',
    location: 'Bairro Irene — Alcabideche',
    organizer: 'Associação Moradores Bairro Irene',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description:
      '1ª etapa do 34º Troféu de Atletismo de Cascais 2026/2027! Partida às 09:30 pelos escalões com distâncias maiores até Sub-12.',
    documents: [
      REG_DOC,
      {
        id: 'doc-920-reg-prova',
        title: 'Regulamento e Notas — 1º GP Bairro Irene',
        type: 'regulamento_prova',
        url: 'https://trofeuatletismocascais.pt/Competicoes/920',
        detected_at: '2026-11-15T10:00:00Z',
      },
      {
        id: 'doc-920-croqui',
        title: 'Croqui do Percurso — 1º GP Bairro Irene',
        type: 'croqui',
        url: 'https://trofeuatletismocascais.pt/Competicoes/920',
        detected_at: '2026-11-20T09:00:00Z',
        is_new: true,
      },
      {
        id: 'doc-920-resultados',
        title: 'Resultados e Classificações (Direto)',
        type: 'classificacao',
        url: 'https://trofeuatletismocascais.pt/Classificacao/920/1',
        detected_at: '2026-11-22T14:00:00Z',
      },
    ],
  },
  {
    id: 'race-trofeu-2-2026',
    stage_number: 2,
    title: 'Corrida da Padroeira',
    date: '2026-12-08',
    location: 'Abóboda',
    organizer: 'Núcleo de Atletismo da Zona da Abóboda',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description:
      '2ª jornada do Troféu de Atletismo de Cascais 2026/2027 na Abóboda (feriado de 8 de Dezembro). Confirma a tua inscrição e dos jovens até ao 3º dia útil anterior.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-3-2027',
    stage_number: 3,
    title: 'Corta-Mato do NAZA',
    date: '2027-01-10',
    location: 'Abóboda',
    organizer: 'Núcleo de Atletismo da Zona da Abóboda',
    distances: ['Corta-Mato Principal (2,5–6 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description: '3ª jornada do Troféu de Cascais — Prova de Corta-Mato organizada pelo NAZA na Abóboda.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-4-2027',
    stage_number: 4,
    title: 'Corrida CCD Cascais',
    date: '2027-01-24',
    location: 'Cascais',
    organizer: 'CCD Pessoal Município de Cascais',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description: '4ª jornada do Troféu de Atletismo de Cascais 2026/2027 em Cascais.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-5-2027',
    stage_number: 5,
    title: 'Grande Prémio de Atletismo do Monte Real',
    date: '2027-02-14',
    location: 'Bairro Conde Monte Real — Tires',
    organizer: 'Desportivo Monte Real',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description: '5ª jornada do Troféu de Cascais 2026/2027 no Bairro Conde Monte Real, Tires.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-6-2027',
    stage_number: 6,
    title: '1º Grande Prémio de Atletismo Livramento',
    date: '2027-02-21',
    location: 'Livramento',
    organizer: 'Associação Moradores do Livramento',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description: '6ª jornada do Troféu de Cascais 2026/2027 no Livramento.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-7-2027',
    stage_number: 7,
    title: 'Grande Prémio de Atletismo Os Galgos',
    date: '2027-03-14',
    location: 'Tires',
    organizer: 'Clube Desportivo "Os Galgos Audazes"',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description: '7ª jornada do Troféu de Cascais 2026/2027 organizada pelos Galgos Audazes em Tires.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-8-2027',
    stage_number: 8,
    title: 'Grande Prémio At. "António Riscado" Charneca',
    date: '2027-03-21',
    location: 'Charneca (Em Casa!)',
    organizer: 'União Recreativa da Charneca',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description:
      '8ª jornada do Troféu — A nossa prova em casa organizada pela União Recreativa da Charneca! Mobilização total da Armada Azul.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-9-2027',
    stage_number: 9,
    title: 'Légua de Janes',
    date: '2027-04-04',
    location: 'Janes',
    organizer: 'Sociedade de Instrução e Recreio de Janes e Malveira',
    distances: ['Légua (aprox. 5 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description: '9ª jornada do Troféu de Cascais 2026/2027 — Clássica Légua de Janes (exceção de distância).',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-10-2027',
    stage_number: 10,
    title: 'Corrida da Juventude',
    date: '2027-04-25',
    location: 'Bairro de Massapés — S. Domingos de Rana',
    organizer: 'Junta de Freguesia de S. Domingos de Rana',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description: '10ª jornada do Troféu de Cascais 2026/2027 no dia 25 de Abril em São Domingos de Rana.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-11-2027',
    stage_number: 11,
    title: 'Milha Urbana de SDRana',
    date: '2027-05-16',
    location: 'Abóboda — S. Domingos de Rana',
    organizer: 'Núcleo de Atletismo da Zona da Abóboda',
    distances: ['Milha Urbana (1609 m)'],
    children_distances: ['Milha / Escalões Jovens'],
    description: '11ª jornada do Troféu de Cascais 2026/2027 — Milha Urbana rápida organizada pelo NAZA.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-12-2027',
    stage_number: 12,
    title: 'Grande P. Atl. Clube Desp. Arneiro "Alcindo Moreira"',
    date: '2027-05-23',
    location: 'Arneiro',
    organizer: 'Clube Desportivo do Arneiro',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description: '12ª jornada do Troféu de Cascais 2026/2027 organizada pelo Clube Desportivo do Arneiro.',
    documents: [REG_DOC],
  },
  {
    id: 'race-trofeu-13-2027',
    stage_number: 13,
    title: 'Grande Prémio Atibá "Luis Candeias"',
    date: '2027-06-13',
    location: 'Atibá',
    organizer: 'Associação de Moradores da Atibá',
    distances: ['Corrida Principal (3–9 km)'],
    children_distances: ['Escalões Jovens (Sub-12 a Sub-18)'],
    description: '13ª e última etapa do Troféu de Atletismo de Cascais 2026/2027 na Atibá!',
    documents: [REG_DOC],
  },
]

export function buildTrofeuRaces2026_2027(syncTimestamp = new Date().toISOString()): Race[] {
  return TROFEU_2026_2027_STAGE_DEFS.map((def) => ({
    id: def.id,
    title: `${def.stage_number}ª Etapa Troféu — ${def.title}`,
    category: 'trofeu_cascais',
    date: def.date,
    start_time: '09:30',
    location: def.location,
    meeting_point: 'Tenda da U.R. Charneca junto à partida/meta',
    meeting_time: '08:30',
    distances: def.distances,
    open_to_children: true,
    children_distances: def.children_distances,
    registration_deadline: calculateDeadlineISO(def.date),
    external_url: def.trofeu_competition_id
      ? `https://trofeuatletismocascais.pt/Competicoes/${def.trofeu_competition_id}`
      : TROFEU_SITE_URL,
    description: `${def.description}\nOrganização: ${def.organizer}.`,
    van_available: false,
    van_capacity: 0,
    vehicles: [],
    van_departure_time: '08:00',
    van_departure_location: 'Sociedade U.R. Charneca',
    bib_pickup_info:
      'O dorsal com chip do Troféu de Cascais é o mesmo para toda a época (Ponto 6.6). Novos inscritos recebem o dorsal na quinta-feira anterior.',
    counts_for_trophy: true,
    trophy_stage_number: def.stage_number,
    trofeu_competition_id: def.trofeu_competition_id,
    organizer: def.organizer,
    documents: def.documents,
    last_doc_check_at: syncTimestamp,
    created_by: 'system-trofeu-sync',
    created_by_name: 'Sincronização Troféu Cascais',
  }))
}

export const TROFEU_2026_2027_STAGES: TrofeuSeasonStage[] = TROFEU_2026_2027_STAGE_DEFS.map((d) => ({
  code: `P${d.stage_number}`,
  stage_number: d.stage_number,
  race_id: d.id,
  title: d.title,
  date: d.date,
  location: d.location,
  organizer: d.organizer,
  completed: d.date <= '2026-11-22',
}))

export const TROFEU_2025_2026_STAGES: TrofeuSeasonStage[] = [
  { code: 'P1', stage_number: 1, title: '1ª Etapa 2025/26', date: '2025-11-23', location: 'Cascais', organizer: 'CM Cascais', completed: true },
  { code: 'P2', stage_number: 2, title: '2ª Etapa 2025/26', date: '2025-12-08', location: 'Abóboda', organizer: 'NAZA', completed: true },
  { code: 'P3', stage_number: 3, title: '3ª Etapa 2025/26', date: '2026-01-11', location: 'Abóboda', organizer: 'NAZA', completed: true },
  { code: 'P4', stage_number: 4, title: '4ª Etapa 2025/26', date: '2026-01-25', location: 'Cascais', organizer: 'CCD Cascais', completed: true },
  { code: 'P5', stage_number: 5, title: '5ª Etapa 2025/26', date: '2026-02-15', location: 'Tires', organizer: 'Monte Real', completed: true },
  { code: 'P6', stage_number: 6, title: '6ª Etapa 2025/26', date: '2026-02-22', location: 'Livramento', organizer: 'AM Livramento', completed: true },
  { code: 'P7', stage_number: 7, title: '7ª Etapa 2025/26', date: '2026-03-15', location: 'Tires', organizer: 'Os Galgos', completed: true },
  { code: 'P8', stage_number: 8, title: '8ª Etapa 2025/26 (Charneca)', date: '2026-03-22', location: 'Charneca', organizer: 'UR Charneca', completed: true },
  { code: 'P9', stage_number: 9, title: '9ª Etapa 2025/26 (Janes)', date: '2026-04-12', location: 'Janes', organizer: 'SIR Janes', completed: true },
  { code: 'P10', stage_number: 10, title: '10ª Etapa 2025/26', date: '2026-05-10', location: 'S.D. Rana', organizer: 'JF S.D. Rana', completed: true },
  { code: 'P11', stage_number: 11, title: '11ª Etapa 2025/26 (Atibá)', date: '2026-06-14', location: 'Atibá', organizer: 'AM Atibá', completed: true },
]

/** Dados reais da Classificação Coletiva da época concluída 2025/2026 (extraídos de /Trofeu/17) */
export const CLUBS_2025_2026: TrofeuClubStanding[] = [
  { season: '2025/2026', pos: 1, team: 'Núcleo Atletismo Zona Abóboda', points_per_stage: { P1: 701, P2: 662, P3: 688, P4: 717, P5: 721, P6: 666, P7: 635, P8: 731, P9: 680, P10: 688, P11: 620 }, total: 7509, is_urc: false, prize_amount_eur: 2000 },
  { season: '2025/2026', pos: 2, team: 'OS GALGOS', points_per_stage: { P1: 587, P2: 539, P3: 500, P4: 495, P5: 588, P6: 476, P7: 458, P8: 533, P9: 462, P10: 520, P11: 421 }, total: 5579, is_urc: false, prize_amount_eur: 1600 },
  { season: '2025/2026', pos: 3, team: 'ASSOCIAÇÃO DE MORADORES DA ATIBÁ', points_per_stage: { P1: 442, P2: 391, P3: 328, P4: 386, P5: 378, P6: 408, P7: 444, P8: 450, P9: 386, P10: 365, P11: 478 }, total: 4456, is_urc: false, prize_amount_eur: 1300 },
  { season: '2025/2026', pos: 4, team: 'UNIÃO RECREATIVA DA CHARNECA', points_per_stage: { P1: 165, P2: 200, P3: 205, P4: 226, P5: 183, P6: 259, P7: 189, P8: 154, P9: 184, P10: 176, P11: 245 }, total: 2186, is_urc: true, prize_amount_eur: 1100 },
  { season: '2025/2026', pos: 5, team: 'CCD PESSOAL M. CASCAIS', points_per_stage: { P1: 164, P2: 203, P3: 209, P4: 207, P5: 187, P6: 198, P7: 231, P8: 178, P9: 157, P10: 209, P11: 159 }, total: 2102, is_urc: false, prize_amount_eur: 900 },
  { season: '2025/2026', pos: 6, team: 'CLUBE DESPORTIVO DO ARNEIRO', points_per_stage: { P1: 205, P2: 135, P3: 134, P4: 149, P5: 143, P6: 152, P7: 157, P8: 128, P9: 158, P10: 174, P11: 139 }, total: 1674, is_urc: false, prize_amount_eur: 700 },
  { season: '2025/2026', pos: 7, team: 'DESPORTIVO MONTE REAL', points_per_stage: { P1: 120, P2: 86, P3: 94, P4: 163, P5: 124, P6: 138, P7: 128, P8: 122, P9: 107, P10: 130, P11: 120 }, total: 1332, is_urc: false, prize_amount_eur: 500 },
  { season: '2025/2026', pos: 8, team: 'Núcleo de Atletismo Os Papagaios de Cascais', points_per_stage: { P1: 125, P2: 64, P3: 86, P4: 103, P5: 102, P6: 93, P7: 128, P8: 97, P9: 152, P10: 92, P11: 106 }, total: 1148, is_urc: false, prize_amount_eur: 300 },
  { season: '2025/2026', pos: 9, team: 'OCR PORTUGAL LAB CLUB', points_per_stage: { P1: 2, P2: 199, P3: 172, P4: 135, P5: 208, P6: 67, P7: 29, P8: 49, P9: 69, P10: 78, P11: 68 }, total: 1110, is_urc: false, prize_amount_eur: 300 },
  { season: '2025/2026', pos: 10, team: 'A. MORADORES DO LIVRAMENTO', points_per_stage: { P1: 109, P2: 65, P3: 82, P4: 95, P5: 99, P6: 74, P7: 114, P8: 92, P9: 117, P10: 109, P11: 70 }, total: 1026, is_urc: false, prize_amount_eur: 300 },
  { season: '2025/2026', pos: 11, team: 'Vitória de Janes', points_per_stage: { P1: 75, P2: 73, P3: 93, P4: 85, P5: 53, P6: 83, P7: 125, P8: 69, P9: 46, P10: 76, P11: 82 }, total: 860, is_urc: false, prize_amount_eur: 300 },
  { season: '2025/2026', pos: 12, team: 'ASSOCIAÇÃO MORADORES BAIRRO IRENE', points_per_stage: { P6: 26, P7: 78, P8: 79, P9: 76, P10: 42, P11: 81 }, total: 382, is_urc: false, prize_amount_eur: 300 },
  { season: '2025/2026', pos: 13, team: 'FUNDAÇÃO SALESIANOS', points_per_stage: { P1: 17, P2: 31, P3: 32, P4: 27, P5: 1, P6: 30, P7: 13, P8: 28, P9: 43, P10: 25, P11: 30 }, total: 277, is_urc: false, prize_amount_eur: 300 },
  { season: '2025/2026', pos: 14, team: 'GMD9ABRILTRAJOUCE', points_per_stage: { P7: 18, P8: 10, P9: 46, P10: 20, P11: 45 }, total: 139, is_urc: false, prize_amount_eur: 300 },
]

interface RawAthleteEntry {
  escalaoRaw: string
  pos: number
  name: string
  year: number
  pts: Record<string, number>
  total: number
  dorsal?: string
}

/** Dados reais de 2025/2026 com os respetivos dorsais oficiais dessa época (/Inscritos/808) */
const RAW_URC_2025_2026: RawAthleteEntry[] = []

function normalizeRawEntries(
  entries: RawAthleteEntry[],
  season: string,
  seasonStatus: 'open' | 'completed',
  totalSeasonStages: number
): TrofeuAthleteStanding[] {
  return entries.map((e, i) => {
    const isFem = /\(Feminino\)|\bF\d{2}\b|\bF$/i.test(e.escalaoRaw)
    const gender: 'M' | 'F' = isFem ? 'F' : 'M'
    const escalaoClean = e.escalaoRaw.replace(/\s*\((Masculino|Feminino)\)/i, '').trim()
    const stagesParticipated = Object.keys(e.pts).length
    const isYouth = e.year >= 2009 || /^Sub-(12|14|16|18)/i.test(escalaoClean)
    // Regra 5.3.1: elegível para prémios finais com 70% das provas concluídas
    const eligible = stagesParticipated / Math.max(1, totalSeasonStages) >= 0.7
    return {
      id: `st-${season}-${i}-${e.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      season,
      season_status: seasonStatus,
      escalao: `${escalaoClean} ${gender === 'F' && !escalaoClean.startsWith('F') ? '(F)' : gender === 'M' && !escalaoClean.startsWith('M') ? '(M)' : ''}`.trim(),
      gender,
      pos: e.pos,
      name: e.name,
      birth_year: e.year,
      team: 'UNIÃO RECREATIVA DA CHARNECA',
      dorsal: e.dorsal,
      points_per_stage: e.pts,
      total: e.total,
      stages_participated: stagesParticipated,
      total_season_stages: totalSeasonStages,
      eligible_for_prize: eligible,
      is_urc: true,
      is_youth: isYouth,
    }
  })
}

const slugifyName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const ATHLETES_2025_2026: TrofeuAthleteStanding[] = normalizeRawEntries(
  RAW_URC_2025_2026,
  '2025/2026',
  'completed',
  11
).map((st) => ({
  ...st,
  matched_profile_id: st.is_youth
    ? `dep-trofeu-${slugifyName(st.name)}-${st.birth_year}`
    : `ath-trofeu-${slugifyName(st.name)}-${st.birth_year}`,
}))

/**
 * Época Atual 2026/2027 (34º Troféu de Atletismo de Cascais — Em Curso / Aberto).
 * Dados oficiais após a 1ª etapa (22-11-2026, 1º GP do Bairro Irene) em /Coletiva/920/1 e /Classificacao/920/1.
 * Os pontos NÃO acumulam anos anteriores e são específicos desta época.
 */
export const CLUBS_2026_2027_OPEN: TrofeuClubStanding[] = [
  { season: '2026/2027', pos: 1, team: 'Núcleo Atletismo Zona Abóboda', points_per_stage: { P1: 566 }, total: 566, is_urc: false },
  { season: '2026/2027', pos: 2, team: 'OS GALGOS', points_per_stage: { P1: 462 }, total: 462, is_urc: false },
  { season: '2026/2027', pos: 3, team: 'ASSOCIAÇÃO DE MORADORES DA ATIBÁ', points_per_stage: { P1: 393 }, total: 393, is_urc: false },
  { season: '2026/2027', pos: 4, team: 'UNIÃO RECREATIVA DA CHARNECA', points_per_stage: { P1: 251 }, total: 251, is_urc: true },
  { season: '2026/2027', pos: 5, team: 'ASSOCIAÇÃO MORADORES BAIRRO IRENE', points_per_stage: { P1: 227 }, total: 227, is_urc: false },
  { season: '2026/2027', pos: 6, team: 'OCR PORTUGAL LAB CLUB', points_per_stage: { P1: 226 }, total: 226, is_urc: false },
  { season: '2026/2027', pos: 7, team: 'CCD PESSOAL M. CASCAIS', points_per_stage: { P1: 176 }, total: 176, is_urc: false },
  { season: '2026/2027', pos: 8, team: 'CLUBE DESPORTIVO DO ARNEIRO', points_per_stage: { P1: 162 }, total: 162, is_urc: false },
  { season: '2026/2027', pos: 9, team: 'DESPORTIVO MONTE REAL', points_per_stage: { P1: 106 }, total: 106, is_urc: false },
  { season: '2026/2027', pos: 10, team: 'Vitória de Janes', points_per_stage: { P1: 102 }, total: 102, is_urc: false },
  { season: '2026/2027', pos: 11, team: 'A. MORADORES DO LIVRAMENTO', points_per_stage: { P1: 99 }, total: 99, is_urc: false },
  { season: '2026/2027', pos: 12, team: 'RUN TEJO - PREVENT SPRAIN', points_per_stage: { P1: 84 }, total: 84, is_urc: false },
  { season: '2026/2027', pos: 13, team: 'Núcleo de Atletismo Os Papagaios de Cascais', points_per_stage: { P1: 72 }, total: 72, is_urc: false },
  { season: '2026/2027', pos: 14, team: 'GMD9ABRILTRAJOUCE', points_per_stage: { P1: 62 }, total: 62, is_urc: false },
  { season: '2026/2027', pos: 15, team: 'KM0 - RUNNING CLUB', points_per_stage: { P1: 56 }, total: 56, is_urc: false },
  { season: '2026/2027', pos: 16, team: 'C. BENFICA ALGUEIRÃO M.MARTINS', points_per_stage: { P1: 47 }, total: 47, is_urc: false },
  { season: '2026/2027', pos: 17, team: 'FUNDAÇÃO SALESIANOS', points_per_stage: { P1: 33 }, total: 33, is_urc: false },
  { season: '2026/2027', pos: 18, team: 'JOMA', points_per_stage: { P1: 32 }, total: 32, is_urc: false },
  { season: '2026/2027', pos: 19, team: 'LINDA-A-PASTORA S C', points_per_stage: { P1: 28 }, total: 28, is_urc: false },
  { season: '2026/2027', pos: 20, team: 'ASSOCIAÇÃO CULTURAL DA LAGE', points_per_stage: { P1: 28 }, total: 28, is_urc: false },
  { season: '2026/2027', pos: 21, team: 'CRD QUENENA', points_per_stage: { P1: 17 }, total: 17, is_urc: false },
  { season: '2026/2027', pos: 22, team: 'ADM BICESSE', points_per_stage: { P1: 16 }, total: 16, is_urc: false },
  { season: '2026/2027', pos: 23, team: 'CASCAIS PANDILHA REDUX', points_per_stage: { P1: 12 }, total: 12, is_urc: false },
  { season: '2026/2027', pos: 24, team: 'RUNWITHUS', points_per_stage: { P1: 8 }, total: 8, is_urc: false },
]

/**
 * Classificação Individual Oficial 2026/2027 dos 74 atletas inscritos da U.R. Charneca (/Inscritos/920 e /Classificacao/920/1).
 * Cada atleta usa o seu dorsal exclusivo desta época (diferente dos anos anteriores e exclusivo do Troféu de Cascais).
 */
export const ATHLETES_2026_2027_OPEN: TrofeuAthleteStanding[] = []

/** Único administrador inicial: administrador de arranque; os atletas reais vivem só na base de dados. */
export const TROFEU_SEED_ADULT_PROFILES: AthleteProfile[] = [
  { id: 'ath-admin', name: 'Administrador', nickname: 'Admin', email: 'admin@exemplo.pt', phone: '', role: 'admin', login_authorized: true, gender: 'M', birth_date: '1980-01-01', escalao: 'Veteranos M40', nif: '', cc_number: '', shirt_size: 'M', has_official_kit: false, dorsais_trofeu: {}, created_from_trofeu: false, needs_admin_review: false, trofeu_seasons: [], dependents: [] },
]

/** Atletas menores reais provenientes do Troféu de Cascais (por omissão geridos por até 2 adultos). */
export const TROFEU_SEED_YOUTH_ATHLETES: YouthAthlete[] = []

export const INITIAL_TROFEU_SEASONS: TrofeuSeasonData[] = [
  {
    season: '2026/2027',
    edition_number: 34,
    status: 'open',
    regulation_url: TROFEU_REGULATION_2026_2027_URL,
    stages: TROFEU_2026_2027_STAGES,
    club_standings: CLUBS_2026_2027_OPEN,
    athlete_standings: ATHLETES_2026_2027_OPEN,
    last_synced_at: '2026-11-22T22:55:00Z',
  },
  {
    season: '2025/2026',
    edition_number: 33,
    status: 'completed',
    regulation_url: 'https://trofeuatletismocascais.pt/Trofeu/17',
    awarded_individual_pdf: 'https://trofeuatletismocascais.pt/Docs/480/33_trofeu_classificacao_individual_Premiados.pdf',
    awarded_collective_pdf: 'https://trofeuatletismocascais.pt/Docs/480/33_trofeu_classificacao_coletiva_Premiados.pdf',
    stages: TROFEU_2025_2026_STAGES,
    club_standings: CLUBS_2025_2026,
    athlete_standings: ATHLETES_2025_2026,
    last_synced_at: '2026-06-20T18:00:00Z',
  },
  {
    season: '2024/2025',
    edition_number: 32,
    status: 'completed',
    regulation_url: 'https://trofeuatletismocascais.pt/Docs/480/DOTCascais2025_01.pdf',
    awarded_individual_pdf: 'https://trofeuatletismocascais.pt/Docs/480/32_Trofeu_Atletismo_Cascais_classificacao_Individual_atletas_Cascais_Premiados.pdf',
    awarded_collective_pdf: 'https://trofeuatletismocascais.pt/Docs/480/32_Trofeu_Atletismo_Cascais_classificacao_Coletiva_Premiados.pdf',
    stages: [],
    club_standings: [],
    athlete_standings: [],
    last_synced_at: '2025-06-20T18:00:00Z',
  },
  {
    season: '2023/2024',
    edition_number: 31,
    status: 'completed',
    regulation_url: 'https://trofeuatletismocascais.pt/Docs/480/DOTCascais2024_01.pdf',
    awarded_individual_pdf: 'https://trofeuatletismocascais.pt/Docs/480/31_trofeu_classificacao_individual_Premiados.pdf',
    awarded_collective_pdf: 'https://trofeuatletismocascais.pt/Docs/480/31_trofeu_classificacao_coletiva_Premiados.pdf',
    stages: [],
    club_standings: [],
    athlete_standings: [],
    last_synced_at: '2024-06-20T18:00:00Z',
  },
  {
    season: '2022/2023',
    edition_number: 30,
    status: 'completed',
    regulation_url: 'https://trofeuatletismocascais.pt/Docs/480/DOTCascais2023_01.pdf',
    awarded_individual_pdf: 'https://trofeuatletismocascais.pt/Docs/480/30_trofeu_classificacao_individual_Premiados.pdf',
    awarded_collective_pdf: 'https://trofeuatletismocascais.pt/Docs/480/30_trofeu_classificacao_coletiva_Premiados.pdf',
    stages: [],
    club_standings: [],
    athlete_standings: [],
    last_synced_at: '2023-06-20T18:00:00Z',
  },
]
