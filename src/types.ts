export type UserRole = 'admin' | 'athlete'

export type RaceCategory = 'trofeu_cascais' | 'equipa' | 'individual'

export type RegistrationStatus =
  | 'interested'         // Atleta pediu inscrição pela equipa (aguarda inscrição pelo admin)
  | 'enrolled_by_admin'  // Admin já confirmou/efetuou a inscrição pela equipa
  | 'self_enrolled'      // Inscrito individualmente ("Também vou!")
  | 'cancelled'          // Cancelado / desistiu

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
  birth_date: string
  escalao: string
  nif: string
  cc_number?: string
  shirt_size?: string
  emergency_notes?: string
  medical_notes?: string
  /** IDs dos perfis de adultos responsáveis (máximo 2 adultos!) */
  associated_adult_ids: string[]
}

/** Compatibilidade com código prévio */
export type DependentAthlete = YouthAthlete

export interface AthleteProfile {
  id: string
  name: string
  nickname: string
  email: string
  phone: string
  role: UserRole
  gender?: 'M' | 'F'
  birth_date: string
  escalao: string
  nif: string
  cc_number: string
  club_member_number?: string
  federation_number?: string
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
  van_departure_time?: string
  van_departure_location?: string
  bib_pickup_info?: string
  counts_for_trophy?: boolean
  trophy_stage_number?: number
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
  individual: 'Sugeridas por Atletas',
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
    label: 'Sugerida por Atleta',
    badge: 'Sugerida',
    desc: 'Prova sugerida por um atleta. Cada um faz a sua inscrição e marca aqui presença para irmos juntos.',
  },
}

export const TRANSPORT_LABELS: Record<TransportMode, { label: string; short: string; usesVanSeat: boolean }> = {
  van_roundtrip: {
    label: 'Carrinha da Charneca (Ida e Volta)',
    short: 'Carrinha (Ida/Volta)',
    usesVanSeat: true,
  },
  van_return_only: {
    label: 'Carrinha da Charneca (Só Regresso)',
    short: 'Carrinha (Só Regresso)',
    usesVanSeat: true,
  },
  meeting_point: {
    label: 'Ponto de Encontro (ex: Comboio / Partida)',
    short: 'Ponto de Encontro',
    usesVanSeat: false,
  },
  carpool_offer: {
    label: 'Levo Carro e dou Boleia',
    short: 'Dou Boleia',
    usesVanSeat: false,
  },
  carpool_need: {
    label: 'Preciso de Boleia de Colega',
    short: 'Precisa Boleia',
    usesVanSeat: false,
  },
  own_transport: {
    label: 'Vou direto por meios próprios',
    short: 'Meios Próprios',
    usesVanSeat: false,
  },
}

export const BIB_STATUS_LABELS: Record<BibStatus, { label: string; short: string }> = {
  pending: { label: 'Sem dorsal', short: 'Sem dorsal' },
  at_club: { label: 'No clube', short: 'No clube' },
  delivered: { label: 'Entregue', short: 'Entregue' },
}
