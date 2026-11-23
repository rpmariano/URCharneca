import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type {
  AthleteProfile,
  YouthAthlete,
  Race,
  RaceRegistration,
  TeamEvent,
  AppNotification,
  TrofeuSeasonData,
  TrofeuSyncLog,
} from '../types'

export interface HydratedSupabaseData {
  profiles: AthleteProfile[]
  youthAthletes: YouthAthlete[]
  races: Race[]
  registrations: RaceRegistration[]
  events: TeamEvent[]
  notifications: AppNotification[]
  trofeuSeasons: TrofeuSeasonData[]
  trofeuSyncLogs: TrofeuSyncLog[]
}

const toProfileRow = (p: AthleteProfile) => ({
  id: p.id,
  auth_user_id: p.auth_user_id ?? null,
  name: p.name,
  nickname: p.nickname ?? '',
  email: p.email ?? '',
  phone: p.phone ?? '',
  role: p.role,
  login_authorized: Boolean(p.login_authorized || p.role === 'admin'),
  login_email: p.login_email ?? null,
  login_provider: p.login_provider ?? null,
  login_activated_at: p.login_activated_at ?? null,
  is_minor_account: Boolean(p.is_minor_account),
  gender: p.gender ?? null,
  birth_date: p.birth_date ?? '',
  escalao: p.escalao ?? 'Seniores M',
  nif: p.nif ?? '',
  cc_number: p.cc_number ?? '',
  club_member_number: p.club_member_number ?? null,
  federation_number: p.federation_number ?? null,
  dorsal_trofeu: p.dorsal_trofeu ?? null,
  dorsais_trofeu: p.dorsais_trofeu ?? {},
  created_from_trofeu: Boolean(p.created_from_trofeu),
  needs_admin_review: Boolean(p.needs_admin_review),
  trofeu_seasons: p.trofeu_seasons ?? [],
  address: p.address ?? null,
  city: p.city ?? null,
  postal_code: p.postal_code ?? null,
  emergency_name: p.emergency_name ?? null,
  emergency_phone: p.emergency_phone ?? null,
  emergency_relation: p.emergency_relation ?? null,
  shirt_size: p.shirt_size ?? 'M',
  shorts_size: p.shorts_size ?? null,
  height_cm: p.height_cm ?? null,
  weight_kg: p.weight_kg ?? null,
  blood_type: p.blood_type ?? null,
  medical_notes: p.medical_notes ?? null,
  has_official_kit: p.has_official_kit ?? true,
  updated_at: new Date().toISOString(),
})

const fromProfileRow = (row: Record<string, unknown>): AthleteProfile => ({
  id: String(row.id),
  auth_user_id: row.auth_user_id ? String(row.auth_user_id) : undefined,
  name: String(row.name ?? ''),
  nickname: String(row.nickname ?? ''),
  email: String(row.email ?? ''),
  phone: String(row.phone ?? ''),
  role: row.role === 'admin' ? 'admin' : 'athlete',
  login_authorized: Boolean(row.login_authorized || row.role === 'admin'),
  login_email: row.login_email ? String(row.login_email) : undefined,
  login_provider: row.login_provider === 'google' || row.login_provider === 'email' ? row.login_provider : undefined,
  login_activated_at: row.login_activated_at ? String(row.login_activated_at) : undefined,
  login_password_hash: row.login_password_hash ? String(row.login_password_hash) : undefined,
  is_minor_account: Boolean(row.is_minor_account),
  gender: row.gender === 'M' || row.gender === 'F' ? row.gender : undefined,
  birth_date: String(row.birth_date ?? ''),
  escalao: String(row.escalao ?? 'Seniores M'),
  nif: String(row.nif ?? ''),
  cc_number: String(row.cc_number ?? ''),
  club_member_number: row.club_member_number ? String(row.club_member_number) : undefined,
  federation_number: row.federation_number ? String(row.federation_number) : undefined,
  dorsal_trofeu: row.dorsal_trofeu ? String(row.dorsal_trofeu) : undefined,
  dorsais_trofeu:
    row.dorsais_trofeu && typeof row.dorsais_trofeu === 'object' && Object.keys(row.dorsais_trofeu as object).length > 0
      ? (row.dorsais_trofeu as Record<string, string>)
      : undefined,
  created_from_trofeu: Boolean(row.created_from_trofeu),
  needs_admin_review: Boolean(row.needs_admin_review),
  trofeu_seasons: Array.isArray(row.trofeu_seasons) ? (row.trofeu_seasons as string[]) : undefined,
  address: row.address ? String(row.address) : undefined,
  city: row.city ? String(row.city) : undefined,
  postal_code: row.postal_code ? String(row.postal_code) : undefined,
  emergency_name: row.emergency_name ? String(row.emergency_name) : undefined,
  emergency_phone: row.emergency_phone ? String(row.emergency_phone) : undefined,
  emergency_relation: row.emergency_relation ? String(row.emergency_relation) : undefined,
  shirt_size: (row.shirt_size as AthleteProfile['shirt_size']) || 'M',
  shorts_size: row.shorts_size ? (row.shorts_size as AthleteProfile['shorts_size']) : undefined,
  height_cm: typeof row.height_cm === 'number' ? row.height_cm : undefined,
  weight_kg: typeof row.weight_kg === 'number' ? row.weight_kg : undefined,
  blood_type: row.blood_type ? (row.blood_type as AthleteProfile['blood_type']) : undefined,
  medical_notes: row.medical_notes ? String(row.medical_notes) : undefined,
  has_official_kit: Boolean(row.has_official_kit ?? true),
  dependents: [],
})

const toYouthRow = (y: YouthAthlete) => ({
  id: y.id,
  auth_user_id: y.auth_user_id ?? null,
  name: y.name,
  gender: y.gender ?? null,
  birth_date: y.birth_date ?? '',
  escalao: y.escalao ?? 'Benjamins A (Sub-10)',
  nif: y.nif ?? '',
  cc_number: y.cc_number ?? null,
  shirt_size: y.shirt_size ?? 'Criança',
  emergency_notes: y.emergency_notes ?? null,
  medical_notes: y.medical_notes ?? null,
  dorsal_trofeu: y.dorsal_trofeu ?? null,
  dorsais_trofeu: y.dorsais_trofeu ?? {},
  created_from_trofeu: Boolean(y.created_from_trofeu),
  needs_admin_review: Boolean(y.needs_admin_review),
  trofeu_seasons: y.trofeu_seasons ?? [],
  can_self_manage: Boolean(y.can_self_manage),
  email: y.email ?? null,
  phone: y.phone ?? null,
  login_email: y.login_email ?? null,
  login_provider: y.login_provider ?? null,
  login_activated_at: y.login_activated_at ?? null,
  associated_adult_ids: (y.associated_adult_ids ?? []).slice(0, 2),
  updated_at: new Date().toISOString(),
})

const fromYouthRow = (row: Record<string, unknown>): YouthAthlete => ({
  id: String(row.id),
  auth_user_id: row.auth_user_id ? String(row.auth_user_id) : undefined,
  name: String(row.name ?? ''),
  gender: row.gender === 'M' || row.gender === 'F' ? row.gender : undefined,
  birth_date: String(row.birth_date ?? ''),
  escalao: String(row.escalao ?? 'Benjamins A (Sub-10)'),
  nif: String(row.nif ?? ''),
  cc_number: row.cc_number ? String(row.cc_number) : undefined,
  shirt_size: row.shirt_size ? String(row.shirt_size) : undefined,
  emergency_notes: row.emergency_notes ? String(row.emergency_notes) : undefined,
  medical_notes: row.medical_notes ? String(row.medical_notes) : undefined,
  dorsal_trofeu: row.dorsal_trofeu ? String(row.dorsal_trofeu) : undefined,
  dorsais_trofeu:
    row.dorsais_trofeu && typeof row.dorsais_trofeu === 'object' && Object.keys(row.dorsais_trofeu as object).length > 0
      ? (row.dorsais_trofeu as Record<string, string>)
      : undefined,
  created_from_trofeu: Boolean(row.created_from_trofeu),
  needs_admin_review: Boolean(row.needs_admin_review),
  trofeu_seasons: Array.isArray(row.trofeu_seasons) ? (row.trofeu_seasons as string[]) : undefined,
  can_self_manage: Boolean(row.can_self_manage),
  email: row.email ? String(row.email) : undefined,
  phone: row.phone ? String(row.phone) : undefined,
  login_email: row.login_email ? String(row.login_email) : undefined,
  login_provider: row.login_provider === 'google' || row.login_provider === 'email' ? row.login_provider : undefined,
  login_activated_at: row.login_activated_at ? String(row.login_activated_at) : undefined,
  login_password_hash: row.login_password_hash ? String(row.login_password_hash) : undefined,
  associated_adult_ids: Array.isArray(row.associated_adult_ids) ? (row.associated_adult_ids as string[]) : [],
})

const toRaceRow = (r: Race) => ({
  id: r.id,
  title: r.title,
  category: r.category,
  date: r.date,
  start_time: r.start_time,
  location: r.location,
  meeting_point: r.meeting_point ?? null,
  meeting_time: r.meeting_time ?? null,
  distances: r.distances ?? ['10 km'],
  registration_deadline: r.registration_deadline ?? null,
  external_url: r.external_url ?? null,
  image_url: r.image_url ?? null,
  description: r.description ?? null,
  van_available: Boolean(r.van_available),
  van_capacity: r.van_capacity ?? 0,
  vehicles: r.vehicles ?? [],
  van_departure_time: r.van_departure_time ?? null,
  van_departure_location: r.van_departure_location ?? 'Sociedade U.R. Charneca',
  bib_pickup_info: r.bib_pickup_info ?? null,
  counts_for_trophy: Boolean(r.counts_for_trophy),
  trophy_stage_number: r.trophy_stage_number ?? null,
  trofeu_competition_id: r.trofeu_competition_id ?? null,
  organizer: r.organizer ?? null,
  documents: r.documents ?? [],
  last_doc_check_at: r.last_doc_check_at ?? null,
  next_doc_check_at: r.next_doc_check_at ?? null,
  open_to_children: Boolean(r.open_to_children),
  children_distances: r.children_distances ?? [],
  created_by: r.created_by,
  created_by_name: r.created_by_name,
  updated_at: new Date().toISOString(),
})

const fromRaceRow = (row: Record<string, unknown>): Race => ({
  id: String(row.id),
  title: String(row.title ?? ''),
  category: row.category as Race['category'],
  date: String(row.date ?? ''),
  start_time: String(row.start_time ?? ''),
  location: String(row.location ?? ''),
  meeting_point: row.meeting_point ? String(row.meeting_point) : undefined,
  meeting_time: row.meeting_time ? String(row.meeting_time) : undefined,
  distances: Array.isArray(row.distances) ? (row.distances as string[]) : ['10 km'],
  registration_deadline: row.registration_deadline ? String(row.registration_deadline) : undefined,
  external_url: row.external_url ? String(row.external_url) : undefined,
  image_url: row.image_url ? String(row.image_url) : undefined,
  description: row.description ? String(row.description) : undefined,
  van_available: Boolean(row.van_available),
  van_capacity: Number(row.van_capacity ?? 0),
  vehicles: Array.isArray(row.vehicles) ? (row.vehicles as Race['vehicles']) : [],
  van_departure_time: row.van_departure_time ? String(row.van_departure_time) : undefined,
  van_departure_location: row.van_departure_location ? String(row.van_departure_location) : undefined,
  bib_pickup_info: row.bib_pickup_info ? String(row.bib_pickup_info) : undefined,
  counts_for_trophy: Boolean(row.counts_for_trophy),
  trophy_stage_number: typeof row.trophy_stage_number === 'number' ? row.trophy_stage_number : undefined,
  trofeu_competition_id: typeof row.trofeu_competition_id === 'number' ? row.trofeu_competition_id : undefined,
  organizer: row.organizer ? String(row.organizer) : undefined,
  documents: Array.isArray(row.documents) ? (row.documents as Race['documents']) : [],
  last_doc_check_at: row.last_doc_check_at ? String(row.last_doc_check_at) : undefined,
  next_doc_check_at: row.next_doc_check_at ? String(row.next_doc_check_at) : undefined,
  open_to_children: Boolean(row.open_to_children),
  children_distances: Array.isArray(row.children_distances) ? (row.children_distances as string[]) : undefined,
  created_by: String(row.created_by ?? 'ath-rui-mariano'),
  created_by_name: String(row.created_by_name ?? 'Administrador'),
})

const toRegistrationRow = (r: RaceRegistration) => ({
  id: r.id,
  race_id: r.race_id,
  athlete_id: r.athlete_id,
  athlete_name: r.athlete_name,
  is_dependent: Boolean(r.is_dependent),
  dependent_id: r.dependent_id ?? null,
  parent_name: r.parent_name ?? null,
  escalao: r.escalao,
  distance: r.distance,
  status: r.status,
  transport_mode: r.transport_mode,
  vehicle_id: r.vehicle_id ?? null,
  carpool_seats: r.carpool_seats ?? null,
  bib_number: r.bib_number ?? null,
  bib_status: r.bib_status,
  bib_pickup_by: r.bib_pickup_by ?? null,
  bib_transfer_available: Boolean(r.bib_transfer_available),
  bib_transferred_from: r.bib_transferred_from ?? null,
  result_time: r.result_time ?? null,
  trophy_points: r.trophy_points ?? null,
  notes: r.notes ?? null,
  van_requested_at: r.van_requested_at ?? null,
  created_at: r.created_at,
})

const fromRegistrationRow = (row: Record<string, unknown>): RaceRegistration => ({
  id: String(row.id),
  race_id: String(row.race_id),
  athlete_id: String(row.athlete_id),
  athlete_name: String(row.athlete_name ?? ''),
  is_dependent: Boolean(row.is_dependent),
  dependent_id: row.dependent_id ? String(row.dependent_id) : undefined,
  parent_name: row.parent_name ? String(row.parent_name) : undefined,
  escalao: String(row.escalao ?? ''),
  distance: String(row.distance ?? ''),
  status: row.status as RaceRegistration['status'],
  transport_mode: row.transport_mode as RaceRegistration['transport_mode'],
  vehicle_id: row.vehicle_id ? String(row.vehicle_id) : undefined,
  carpool_seats: typeof row.carpool_seats === 'number' ? row.carpool_seats : undefined,
  bib_number: row.bib_number ? String(row.bib_number) : undefined,
  bib_status: row.bib_status as RaceRegistration['bib_status'],
  bib_pickup_by: row.bib_pickup_by ? String(row.bib_pickup_by) : undefined,
  bib_transfer_available: Boolean(row.bib_transfer_available),
  bib_transferred_from: row.bib_transferred_from ? String(row.bib_transferred_from) : undefined,
  result_time: row.result_time ? String(row.result_time) : undefined,
  trophy_points: typeof row.trophy_points === 'number' ? row.trophy_points : undefined,
  notes: row.notes ? String(row.notes) : undefined,
  van_requested_at: row.van_requested_at ? String(row.van_requested_at) : undefined,
  created_at: String(row.created_at ?? new Date().toISOString()),
})

const toEventRow = (e: TeamEvent) => ({
  id: e.id,
  title: e.title,
  type: e.type,
  date: e.date,
  time: e.time,
  location: e.location,
  description: e.description ?? '',
  workout_plan: e.workout_plan ?? null,
  requires_official_kit: Boolean(e.requires_official_kit),
  image_url: e.image_url ?? null,
  created_by_name: e.created_by_name,
  attendees: e.attendees ?? [],
})

const fromEventRow = (row: Record<string, unknown>): TeamEvent => ({
  id: String(row.id),
  title: String(row.title ?? ''),
  type: row.type as TeamEvent['type'],
  date: String(row.date ?? ''),
  time: String(row.time ?? ''),
  location: String(row.location ?? ''),
  description: String(row.description ?? ''),
  workout_plan: row.workout_plan ? String(row.workout_plan) : undefined,
  requires_official_kit: Boolean(row.requires_official_kit),
  image_url: row.image_url ? String(row.image_url) : undefined,
  created_by_name: String(row.created_by_name ?? ''),
  attendees: Array.isArray(row.attendees) ? (row.attendees as TeamEvent['attendees']) : [],
})

const toNotificationRow = (n: AppNotification) => ({
  id: n.id,
  title: n.title,
  message: n.message,
  type: n.type,
  related_race_id: n.related_race_id ?? null,
  created_by_name: n.created_by_name,
  created_at: n.created_at,
  pinned: Boolean(n.pinned),
  read_by: n.read_by ?? [],
})

const fromNotificationRow = (row: Record<string, unknown>): AppNotification => ({
  id: String(row.id),
  title: String(row.title ?? ''),
  message: String(row.message ?? ''),
  type: row.type as AppNotification['type'],
  related_race_id: row.related_race_id ? String(row.related_race_id) : undefined,
  created_by_name: String(row.created_by_name ?? ''),
  created_at: String(row.created_at ?? ''),
  pinned: Boolean(row.pinned),
  read_by: Array.isArray(row.read_by) ? (row.read_by as string[]) : [],
})

const toTrofeuSeasonRow = (s: TrofeuSeasonData) => ({
  season: s.season,
  edition_number: s.edition_number,
  status: s.status,
  regulation_url: s.regulation_url,
  awarded_individual_pdf: s.awarded_individual_pdf ?? null,
  awarded_collective_pdf: s.awarded_collective_pdf ?? null,
  stages: s.stages ?? [],
  club_standings: s.club_standings ?? [],
  athlete_standings: s.athlete_standings ?? [],
  last_synced_at: s.last_synced_at,
})

const fromTrofeuSeasonRow = (row: Record<string, unknown>): TrofeuSeasonData => ({
  season: String(row.season ?? ''),
  edition_number: Number(row.edition_number ?? 46),
  status: row.status === 'completed' ? 'completed' : 'open',
  regulation_url: String(row.regulation_url ?? ''),
  awarded_individual_pdf: row.awarded_individual_pdf ? String(row.awarded_individual_pdf) : undefined,
  awarded_collective_pdf: row.awarded_collective_pdf ? String(row.awarded_collective_pdf) : undefined,
  stages: Array.isArray(row.stages) ? (row.stages as TrofeuSeasonData['stages']) : [],
  club_standings: Array.isArray(row.club_standings) ? (row.club_standings as TrofeuSeasonData['club_standings']) : [],
  athlete_standings: Array.isArray(row.athlete_standings)
    ? (row.athlete_standings as TrofeuSeasonData['athlete_standings'])
    : [],
  last_synced_at: String(row.last_synced_at ?? ''),
})

const toSyncLogRow = (l: TrofeuSyncLog) => ({
  id: l.id,
  timestamp: l.timestamp,
  trigger: l.trigger,
  races_created: l.races_created,
  races_updated: l.races_updated,
  new_documents_found: l.new_documents_found,
  new_athletes_created: l.new_athletes_created,
  summary: l.summary,
})

const fromSyncLogRow = (row: Record<string, unknown>): TrofeuSyncLog => ({
  id: String(row.id),
  timestamp: String(row.timestamp ?? ''),
  trigger: row.trigger as TrofeuSyncLog['trigger'],
  races_created: Number(row.races_created ?? 0),
  races_updated: Number(row.races_updated ?? 0),
  new_documents_found: Number(row.new_documents_found ?? 0),
  new_athletes_created: Number(row.new_athletes_created ?? 0),
  summary: String(row.summary ?? ''),
})

function logSupabaseError(op: string, error: { message: string } | null) {
  if (error) {
    console.warn(`[Supabase] Erro em ${op}:`, error.message)
  }
}

export async function upsertProfiles(profiles: AthleteProfile[]) {
  if (!isSupabaseConfigured || profiles.length === 0) return
  const { error } = await supabase.from('profiles').upsert(profiles.map(toProfileRow), { onConflict: 'id' })
  logSupabaseError('upsertProfiles', error)
}

export async function deleteProfileById(id: string) {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  logSupabaseError('deleteProfileById', error)
}

export async function upsertYouthAthletes(youth: YouthAthlete[]) {
  if (!isSupabaseConfigured || youth.length === 0) return
  const { error } = await supabase.from('youth_athletes').upsert(youth.map(toYouthRow), { onConflict: 'id' })
  logSupabaseError('upsertYouthAthletes', error)
}

export async function deleteYouthById(id: string) {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('youth_athletes').delete().eq('id', id)
  logSupabaseError('deleteYouthById', error)
}

export async function upsertRaces(races: Race[]) {
  if (!isSupabaseConfigured || races.length === 0) return
  const { error } = await supabase.from('races').upsert(races.map(toRaceRow), { onConflict: 'id' })
  logSupabaseError('upsertRaces', error)
}

export async function deleteRaceById(id: string) {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('races').delete().eq('id', id)
  logSupabaseError('deleteRaceById', error)
}

export async function upsertRegistrations(regs: RaceRegistration[]) {
  if (!isSupabaseConfigured || regs.length === 0) return
  const { error } = await supabase.from('race_registrations').upsert(regs.map(toRegistrationRow), { onConflict: 'id' })
  logSupabaseError('upsertRegistrations', error)
}

export async function deleteRegistrationById(id: string) {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('race_registrations').delete().eq('id', id)
  logSupabaseError('deleteRegistrationById', error)
}

export async function upsertEvents(events: TeamEvent[]) {
  if (!isSupabaseConfigured || events.length === 0) return
  const { error } = await supabase.from('team_events').upsert(events.map(toEventRow), { onConflict: 'id' })
  logSupabaseError('upsertEvents', error)
}

export async function deleteEventById(id: string) {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('team_events').delete().eq('id', id)
  logSupabaseError('deleteEventById', error)
}

export async function upsertNotifications(notifs: AppNotification[]) {
  if (!isSupabaseConfigured || notifs.length === 0) return
  const { error } = await supabase.from('notifications').upsert(notifs.map(toNotificationRow), { onConflict: 'id' })
  logSupabaseError('upsertNotifications', error)
}

export async function deleteNotificationById(id: string) {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  logSupabaseError('deleteNotificationById', error)
}

export async function upsertTrofeuSeasons(seasons: TrofeuSeasonData[]) {
  if (!isSupabaseConfigured || seasons.length === 0) return
  const { error } = await supabase
    .from('trofeu_seasons')
    .upsert(seasons.map(toTrofeuSeasonRow), { onConflict: 'season' })
  logSupabaseError('upsertTrofeuSeasons', error)
}

export async function insertTrofeuSyncLog(log: TrofeuSyncLog) {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('trofeu_sync_logs').upsert(toSyncLogRow(log), { onConflict: 'id' })
  logSupabaseError('insertTrofeuSyncLog', error)
}

export async function seedSupabaseDatabase(seed: Omit<HydratedSupabaseData, 'trofeuSyncLogs'>) {
  if (!isSupabaseConfigured) return
  await Promise.all([
    upsertProfiles(seed.profiles),
    upsertYouthAthletes(seed.youthAthletes),
    upsertRaces(seed.races),
    upsertEvents(seed.events),
    upsertNotifications(seed.notifications),
    upsertTrofeuSeasons(seed.trofeuSeasons),
  ])
  if (seed.registrations.length > 0) {
    await upsertRegistrations(seed.registrations)
  }
}

export async function resetAllSupabaseData(seed: Omit<HydratedSupabaseData, 'trofeuSyncLogs'>) {
  if (!isSupabaseConfigured) return
  await Promise.all([
    supabase.from('race_registrations').delete().neq('id', ''),
    supabase.from('notifications').delete().neq('id', ''),
    supabase.from('team_events').delete().neq('id', ''),
    supabase.from('trofeu_sync_logs').delete().neq('id', ''),
    supabase.from('youth_athletes').delete().neq('id', ''),
  ])
  await supabase.from('races').delete().neq('id', '')
  await supabase.from('profiles').delete().neq('id', '')
  await supabase.from('trofeu_seasons').delete().neq('season', '')
  await seedSupabaseDatabase(seed)
}

export async function fetchAllFromSupabase(
  seedFallback: Omit<HydratedSupabaseData, 'trofeuSyncLogs'>
): Promise<HydratedSupabaseData | null> {
  if (!isSupabaseConfigured) return null
  try {
    const [profilesRes, youthRes, racesRes, regsRes, eventsRes, notifsRes, seasonsRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('name', { ascending: true }),
      supabase.from('youth_athletes').select('*').order('name', { ascending: true }),
      supabase.from('races').select('*').order('date', { ascending: true }).order('start_time', { ascending: true }),
      supabase.from('race_registrations').select('*').order('created_at', { ascending: true }),
      supabase.from('team_events').select('*').order('date', { ascending: true }).order('time', { ascending: true }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
      supabase.from('trofeu_seasons').select('*').order('edition_number', { ascending: false }),
      supabase.from('trofeu_sync_logs').select('*').order('timestamp', { ascending: false }).limit(20),
    ])

    const firstError =
      profilesRes.error ||
      youthRes.error ||
      racesRes.error ||
      regsRes.error ||
      eventsRes.error ||
      notifsRes.error ||
      seasonsRes.error ||
      logsRes.error

    if (firstError) {
      logSupabaseError('fetchAllFromSupabase', firstError)
      return null
    }

    const profiles = (profilesRes.data ?? []).map((r) => fromProfileRow(r as Record<string, unknown>))
    const youthAthletes = (youthRes.data ?? []).map((r) => fromYouthRow(r as Record<string, unknown>))
    const races = (racesRes.data ?? []).map((r) => fromRaceRow(r as Record<string, unknown>))
    const registrations = (regsRes.data ?? []).map((r) => fromRegistrationRow(r as Record<string, unknown>))
    const events = (eventsRes.data ?? []).map((r) => fromEventRow(r as Record<string, unknown>))
    const notifications = (notifsRes.data ?? []).map((r) => fromNotificationRow(r as Record<string, unknown>))
    const trofeuSeasons = (seasonsRes.data ?? []).map((r) => fromTrofeuSeasonRow(r as Record<string, unknown>))
    const trofeuSyncLogs = (logsRes.data ?? []).map((r) => fromSyncLogRow(r as Record<string, unknown>))

    if (profiles.length === 0 && races.length === 0) {
      await seedSupabaseDatabase(seedFallback)
      return {
        ...seedFallback,
        trofeuSyncLogs: [],
      }
    }

    return {
      profiles,
      youthAthletes,
      races,
      registrations,
      events,
      notifications,
      trofeuSeasons: trofeuSeasons.length > 0 ? trofeuSeasons : seedFallback.trofeuSeasons,
      trofeuSyncLogs,
    }
  } catch (err) {
    console.warn('[Supabase] Falha ao carregar dados:', err)
    return null
  }
}
