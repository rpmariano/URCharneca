export type UserRole = 'admin' | 'athlete'

export type RaceCategory = 'trofeu_cascais' | 'equipa' | 'individual'

export type RegistrationStatus =
  | 'interested'         // Atleta pediu inscrição pela equipa (aguarda inscrição pelo admin)
  | 'enrolled_by_admin'  // Admin já confirmou/efetuou a inscrição pela equipa
  | 'self_enrolled'      // Inscrito individualmente ("Também vou!")
  | 'cancelled'          // Cancelado / desistiu

/** Rótulo e tom de cada estado de uma inscrição: os mesmos em todos os ecrãs. */
export const REG_STATUS_LABELS: Record<RegistrationStatus, { label: string; tone: 'ok' | 'warn' | 'info' | 'neutral' }> = {
  interested: { label: 'Pedido enviado', tone: 'warn' },
  enrolled_by_admin: { label: 'Inscrito', tone: 'ok' },
  self_enrolled: { label: 'Por conta própria', tone: 'info' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

export type TransportMode =
  | 'van_roundtrip'      // Carrinha da Charneca (Ida e Volta)
  | 'van_return_only'    // Carrinha da Charneca (Só Regresso)
  | 'carpool_offer'      // Levo carro / Dou boleia
  | 'carpool_need'       // Preciso de boleia
  | 'meeting_point'      // Ponto de encontro (ex: Estação Comboio / Partida)
  | 'own_transport'      // Transporte próprio direto

/** Dorsal: `pending` = ainda sem dorsal (inicial); depois só há dois estados, no clube e entregue. */
export type BibStatus = 'pending' | 'at_club' | 'delivered'

export interface YouthAthlete {
  id: string
  name: string
  /** Foto (data URL JPEG ~256 px, comprimida no cliente). '' = removida; undefined = sem foto / não alterada */
  photo_url?: string
  gender?: 'M' | 'F'
  birth_date: string
  escalao: string
  nif: string
  cc_number?: string
  shirt_size?: string
  emergency_notes?: string
  medical_notes?: string
  /** ID de dorsal oficial da época atual (2026/2027) do Troféu de Cascais (muda todos os anos e só conta para o Troféu) */
  dorsal_trofeu?: string
  /**
   * Mapa de dorsais oficiais do Troféu de Cascais por época (ex: { '2026/2027': '1129', '2025/2026': '966' }).
   * Todos os anos o dorsal é diferente e este dorsal só conta para provas do Troféu de Cascais.
   */
  dorsais_trofeu?: Record<string, string>
  /** Perfil criado automaticamente pela sincronização com o site do Troféu */
  created_from_trofeu?: boolean
  /** Alerta ativo para o administrador validar e atribuir dorsal */
  needs_admin_review?: boolean
  /** Épocas do Troféu em que o atleta tem participação registada */
  trofeu_seasons?: string[]
  /**
   * Opção gerida pelo Administrador:
   * - `true`: o menor pode fazer login autónomo e gerir a sua própria conta.
   * - `false` / `undefined`: o menor é gerido por no máximo 2 adultos responsáveis (`associated_adult_ids`).
   */
  can_self_manage?: boolean
  email?: string
  phone?: string
  /** ID do utilizador no Supabase Auth após o 1.º login */
  auth_user_id?: string
  /** Email escolhido pelo atleta autorizado no 1.º login (Google ou outro email) */
  login_email?: string
  login_provider?: 'google' | 'email'
  login_activated_at?: string
  /** IDs dos perfis de adultos responsáveis (máximo 2 adultos!) */
  associated_adult_ids: string[]
}

/** Compatibilidade com código prévio */
export type DependentAthlete = YouthAthlete

export interface AthleteProfile {
  id: string
  name: string
  /** Foto (data URL JPEG ~256 px, comprimida no cliente). '' = removida; undefined = sem foto / não alterada */
  photo_url?: string
  nickname: string
  email: string
  phone: string
  role: UserRole
  /** Autorização expressa pelo Admin na ficha do atleta para poder fazer login na app */
  login_authorized?: boolean
  auth_user_id?: string
  login_email?: string
  login_provider?: 'google' | 'email'
  login_activated_at?: string
  /** Verdadeiro quando a sessão ativa corresponde a um menor com login autónomo autorizado pelo admin */
  is_minor_account?: boolean
  gender?: 'M' | 'F'
  birth_date: string
  escalao: string
  nif: string
  cc_number: string
  club_member_number?: string
  federation_number?: string
  /** ID de dorsal oficial da época atual (2026/2027) do Troféu de Cascais (muda todos os anos e só conta para o Troféu) */
  dorsal_trofeu?: string
  /**
   * Mapa de dorsais oficiais do Troféu de Cascais por época (ex: { '2026/2027': '1129', '2025/2026': '966' }).
   * Todos os anos o dorsal é diferente e este dorsal só conta para provas do Troféu de Cascais.
   */
  dorsais_trofeu?: Record<string, string>
  /** Perfil criado automaticamente pela sincronização com o site do Troféu */
  created_from_trofeu?: boolean
  /** Alerta ativo para o administrador validar e atribuir dorsal */
  needs_admin_review?: boolean
  /** Épocas do Troféu em que o atleta tem participação registada */
  trofeu_seasons?: string[]
  // Contactos
  address?: string
  city?: string
  postal_code?: string
  // Contacto de Emergência
  emergency_name?: string
  emergency_phone?: string
  emergency_relation?: string
  // Equipamento & Físico
  shirt_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'Criança'
  shorts_size?: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
  height_cm?: number
  weight_kg?: number
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Desconhecido'
  medical_notes?: string
  has_official_kit: boolean
  dependents: YouthAthlete[]
}

export type RaceDocumentType =
  | 'regulamento_geral'
  | 'regulamento_prova'
  | 'croqui'
  | 'classificacao'
  | 'inscritos'
  | 'comunicado'

export interface RaceDocument {
  id: string
  title: string
  type: RaceDocumentType
  url: string
  detected_at: string
  is_new?: boolean
}

export interface RaceVehicle {
  id: string
  /** Nome ou identificação do veículo (ex: "Carrinha URC 1", "Carrinha 2") */
  name: string
  /** Lotação de lugares disponíveis para inscrição de atletas neste veículo */
  seats: number
  /** ID do perfil do atleta condutor (se selecionado da lista da equipa) */
  driver_athlete_id?: string
  /** Nome do condutor atribuído a este veículo */
  driver_name?: string
}

export interface Race {
  id: string
  title: string
  category: RaceCategory
  date: string // YYYY-MM-DD
  start_time: string // HH:mm
  location: string
  meeting_point?: string
  meeting_time?: string
  distances: string[]
  registration_deadline?: string // YYYY-MM-DD
  external_url?: string
  /** Link de uma imagem de capa (opcional). Sem ele, usa-se a capa gerada pelo tipo de prova. */
  image_url?: string
  description?: string
  van_available: boolean
  van_capacity: number
  /** Lista de veículos (carrinhas / viaturas) disponibilizados pelo clube para esta prova */
  vehicles?: RaceVehicle[]
  van_departure_time?: string
  van_departure_location?: string
  bib_pickup_info?: string
  counts_for_trophy?: boolean
  trophy_stage_number?: number
  /** ID oficial da competição no site do Troféu de Cascais */
  trofeu_competition_id?: number
  /** Entidade organizadora da etapa */
  organizer?: string
  /** Documentos oficiais sincronizados do site (croqui, regulamento, classificação...) */
  documents?: RaceDocument[]
  last_doc_check_at?: string
  next_doc_check_at?: string
  /** Prova com escalões/distâncias para crianças (permite inscrever perfis infantis) */
  open_to_children?: boolean
  /** Distâncias/escalões jovens disponíveis (se vazio usa `distances`) */
  children_distances?: string[]
  created_by: string
  created_by_name: string
}

export interface RaceRegistration {
  id: string
  race_id: string
  athlete_id: string
  athlete_name: string
  is_dependent: boolean
  dependent_id?: string
  parent_name?: string
  escalao: string
  distance: string
  status: RegistrationStatus
  transport_mode: TransportMode
  /** ID do veículo escolhido pelo atleta (quando aplicável) */
  vehicle_id?: string
  carpool_seats?: number
  bib_number?: string
  bib_status: BibStatus
  bib_pickup_by?: string
  bib_transfer_available: boolean
  bib_transferred_from?: string
  result_time?: string
  trophy_points?: number
  notes?: string
  created_at: string
  /** Quando pediu lugar na carrinha (define a ordem da lista de espera); sem valor usa `created_at`. */
  van_requested_at?: string
}

export type TeamEventType = 'training' | 'social' | 'meeting'

export const EVENT_TYPE_LABELS: Record<TeamEventType, { label: string; short: string }> = {
  training: { label: 'Treino', short: 'Treino' },
  social: { label: 'Evento / Convívio', short: 'Evento' },
  meeting: { label: 'Reunião', short: 'Reunião' },
}

/**
 * Tipos de atividade usados nos filtros da agenda.
 * Provas: Troféu de Cascais, promovidas pelo clube, sugeridas por atletas.
 * Agenda da equipa: treinos e eventos (convívios/reuniões).
 */
export type ActivityKind = 'training' | 'trofeu_cascais' | 'equipa' | 'individual' | 'event'

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  training: 'Treinos',
  trofeu_cascais: 'Troféu de Cascais',
  equipa: 'Provas do Clube',
  individual: 'Provas da Comunidade',
  event: 'Eventos',
}

export interface EventAttendee {
  athlete_id: string
  athlete_name: string
  status: 'going' | 'maybe' | 'not_going'
  guests_count?: number
  note?: string
}

export interface TeamEvent {
  id: string
  title: string
  type: TeamEventType
  date: string
  time: string
  location: string
  description: string
  workout_plan?: string
  requires_official_kit?: boolean
  /** Link de uma imagem de capa (opcional). */
  image_url?: string
  created_by_name: string
  attendees: EventAttendee[]
}

export type NotificationType =
  | 'race_open'
  | 'deadline'
  | 'bibs_ready'
  | 'transport'
  | 'general'
  | 'individual_share'
  | 'trofeu_sync'
  | 'athlete_detected'
  | 'new_document'

export type TrofeuSeasonStatus = 'open' | 'completed'

export interface TrofeuSeasonStage {
  code: string // 'P1' .. 'P13'
  stage_number: number
  race_id?: string
  title: string
  date: string
  location: string
  organizer: string
  completed: boolean
}

export interface TrofeuClubStanding {
  season: string
  pos: number
  team: string
  points_per_stage: Record<string, number>
  total: number
  is_urc: boolean
  prize_amount_eur?: number
}

/** Resultado de um atleta numa prova do Troféu; `pos` é o lugar nessa prova dentro do escalão. */
export interface TrofeuStageResult {
  pos: number
  points: number
  time?: string
  competition_id?: number
  race_id?: string
}

export interface TrofeuAthleteStanding {
  id: string
  season: string
  season_status: TrofeuSeasonStatus
  escalao: string
  gender: 'M' | 'F'
  pos: number
  name: string
  birth_year: number
  team: string
  dorsal?: string
  points_per_stage: Record<string, number>
  /** Resultado por prova ('P1', 'P2'...), preenchido pela sincronização automática com o site oficial */
  stage_results?: Record<string, TrofeuStageResult>
  total: number
  stages_participated: number
  total_season_stages: number
  eligible_for_prize: boolean
  is_urc: boolean
  matched_profile_id?: string
  is_youth?: boolean
}

export interface TrofeuSeasonData {
  season: string
  edition_number: number
  status: TrofeuSeasonStatus
  regulation_url: string
  awarded_individual_pdf?: string
  awarded_collective_pdf?: string
  stages: TrofeuSeasonStage[]
  club_standings: TrofeuClubStanding[]
  athlete_standings: TrofeuAthleteStanding[]
  last_synced_at: string
  /** Última vez que as classificações oficiais foram lidas do site (quando o servidor a regista) */
  results_synced_at?: string
}

export interface TrofeuSyncLog {
  id: string
  timestamp: string
  trigger: 'auto_biweekly' | 'manual_admin' | 'startup'
  races_created: number
  races_updated: number
  new_documents_found: number
  new_athletes_created: number
  summary: string
}

export interface AppNotification {
  id: string
  title: string
  message: string
  type: NotificationType
  related_race_id?: string
  created_by_name: string
  created_at: string
  pinned?: boolean
  read_by: string[]
}

export const ESCALOES_ATLETISMO = [
  'Benjamins A (Sub-10)',
  'Benjamins B (Sub-12)',
  'Infantis (Sub-14)',
  'Iniciados (Sub-16)',
  'Juvenis (Sub-18)',
  'Juniores (Sub-20)',
  'Sub-23 M',
  'Sub-23 F',
  'Seniores M',
  'Seniores F',
  'Veteranos M35',
  'Veteranos F35',
  'Veteranos M40',
  'Veteranos F40',
  'Veteranos M45',
  'Veteranos F45',
  'Veteranos M50',
  'Veteranos F50',
  'Veteranos M55',
  'Veteranos F55',
  'Veteranos M60+',
  'Veteranos F60+',
] as const

export const CATEGORIA_LABELS: Record<RaceCategory, { label: string; badge: string; desc: string }> = {
  trofeu_cascais: {
    label: 'Troféu de Cascais',
    badge: 'Troféu',
    desc: 'Prova oficial do Troféu de Atletismo de Cascais. Inscrição tratada pela equipa e transporte na carrinha do clube.',
  },
  equipa: {
    label: 'Prova do Clube',
    badge: 'Clube',
    desc: 'Prova promovida pelo clube: a administração inscreve os atletas interessados, levanta os dorsais e organiza a carrinha.',
  },
  individual: {
    label: 'Prova da Comunidade',
    badge: 'Comunidade',
    desc: 'Prova proposta por um atleta da comunidade. Cada um faz a sua inscrição e marca aqui presença para irmos juntos.',
  },
}

export const TRANSPORT_LABELS: Record<TransportMode, { label: string; short: string; usesVanSeat: boolean }> = {
  van_roundtrip: {
    label: 'Carrinha, ida e volta',
    short: 'Carrinha (Ida/Volta)',
    usesVanSeat: true,
  },
  van_return_only: {
    label: 'Carrinha, só regresso',
    short: 'Carrinha (Só Regresso)',
    usesVanSeat: true,
  },
  meeting_point: {
    label: 'Ponto de encontro',
    short: 'Ponto de Encontro',
    usesVanSeat: false,
  },
  carpool_offer: {
    label: 'Levo carro e dou boleia',
    short: 'Dou Boleia',
    usesVanSeat: false,
  },
  carpool_need: {
    label: 'Preciso de boleia',
    short: 'Precisa Boleia',
    usesVanSeat: false,
  },
  own_transport: {
    label: 'Vou por meios próprios',
    short: 'Meios Próprios',
    usesVanSeat: false,
  },
}

export const BIB_STATUS_LABELS: Record<BibStatus, { label: string; short: string }> = {
  pending: { label: 'Sem dorsal', short: 'Sem dorsal' },
  at_club: { label: 'No clube', short: 'No clube' },
  delivered: { label: 'Entregue', short: 'Entregue' },
}

/** Linha da vista `team_directory`: só dados não sensíveis (nunca data de nascimento, NIF ou contactos). */
export interface DirectoryEntry {
  id: string
  name: string
  nickname: string
  gender?: 'M' | 'F'
  escalao: string
  kind: 'adult' | 'youth'
}
