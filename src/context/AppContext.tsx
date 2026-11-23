import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AthleteProfile,
  YouthAthlete,
  Race,
  RaceRegistration,
  TeamEvent,
  AppNotification,
  UserRole,
  TransportMode,
  BibStatus,
  RegistrationStatus,
  TrofeuSeasonData,
  TrofeuSyncLog,
} from '../types'
import {
  INITIAL_PROFILES,
  INITIAL_YOUTH_ATHLETES,
  INITIAL_RACES,
  INITIAL_REGISTRATIONS,
  INITIAL_EVENTS,
  INITIAL_NOTIFICATIONS,
} from '../data/seedData'
import { INITIAL_TROFEU_SEASONS } from '../data/trofeuData'
import { computeNextBiweeklyCheck, isBiweeklyCheckDue, runTrofeuSync } from '../services/trofeuSyncService'
import {
  deleteEventById,
  deleteNotificationById,
  deleteProfileById,
  deleteRaceById,
  deleteRegistrationById,
  deleteYouthById,
  fetchAllFromSupabase,
  insertTrofeuSyncLog,
  resetAllSupabaseData,
  upsertEvents,
  upsertNotifications,
  upsertProfiles,
  upsertRaces,
  upsertRegistrations,
  upsertTrofeuSeasons,
  upsertYouthAthletes,
} from '../services/supabaseSyncService'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { TRANSPORT_LABELS } from '../types'
import { computeVanAllocation } from '../utils/formatters'
import { todayISO } from '../utils/dates'

/** v7: gestão de múltiplos veículos, lugares vagos e condutores por prova */
const STORAGE_KEYS = {
  PROFILES: 'urc_profiles_v7',
  YOUTH_ATHLETES: 'urc_youth_athletes_v7',
  RACES: 'urc_races_v7',
  REGISTRATIONS: 'urc_registrations_v7',
  EVENTS: 'urc_events_v7',
  NOTIFICATIONS: 'urc_notifications_v7',
  CURRENT_USER_ID: 'urc_current_user_id_v7',
  AUTHENTICATED_USER_ID: 'urc_authenticated_user_id_v7',
  ACTIVE_VIEW_ROLE: 'urc_active_view_role_v7',
  THEME: 'urc_theme_mode',
  TROFEU_SEASONS: 'urc_trofeu_seasons_v7',
  TROFEU_SYNC_LOGS: 'urc_trofeu_sync_logs_v7',
}

async function hashPassword(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(`urc_salt_${raw}`)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return btoa(unescape(encodeURIComponent(`urc_salt_${raw}`)))
}

const normalizeEmail = (email?: string | null) => (email || '').trim().toLowerCase()

export type ThemeMode = 'balanced' | 'light' | 'dark'

interface ToastMessage {
  id: string
  text: string
  type: 'success' | 'info' | 'warning'
}

export interface RegisterForRaceInput {
  race_id: string
  /** Adulto responsável pela inscrição (o próprio atleta, ou o encarregado no caso de crianças) */
  athlete_id: string
  athlete_name: string
  is_dependent: boolean
  dependent_id?: string
  parent_name?: string
  escalao: string
  distance: string
  transport_mode: TransportMode
  vehicle_id?: string
  carpool_seats?: number
  notes?: string
}

export interface ActionResult {
  success: boolean
  message: string
  fallbackToEmailFlow?: boolean
}

type NewRace = Omit<Race, 'id' | 'created_by' | 'created_by_name'>
type NewEvent = Omit<TeamEvent, 'id' | 'created_by_name' | 'attendees'>
type NewNotification = Omit<AppNotification, 'id' | 'created_at' | 'created_by_name' | 'read_by'>
type NewChild = Omit<YouthAthlete, 'id' | 'associated_adult_ids'>

interface AppContextValue {
  profiles: AthleteProfile[]
  youthAthletes: YouthAthlete[]
  races: Race[]
  registrations: RaceRegistration[]
  events: TeamEvent[]
  notifications: AppNotification[]
  currentUser: AthleteProfile
  /** Sessão e Autenticação (estritamente pelo email associado na ficha e autorizado pelo admin) */
  isAuthenticated: boolean
  authLoading: boolean
  loginWithEmail: (
    email: string,
    password: string,
    providerHint?: 'email' | 'google'
  ) => Promise<ActionResult>
  loginWithGoogle: () => Promise<ActionResult>
  logout: () => Promise<void>
  setAthleteLoginAuthorization: (athleteId: string, authorized: boolean, emailOverride?: string) => ActionResult
  resetPersonLoginPassword: (personId: string, isYouth: boolean) => void
  /** Papel ativo na UI. Um administrador pode alternar para a vista de atleta. */
  activeRole: UserRole
  isAdminView: boolean
  unreadNotificationsCount: number
  toasts: ToastMessage[]
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void
  setCurrentUserById: (id: string) => void
  setActiveRole: (role: UserRole) => void
  // Atletas (admin)
  updateProfile: (updated: AthleteProfile) => void
  addAthleteProfile: (profile: Omit<AthleteProfile, 'id' | 'dependents'>) => AthleteProfile | null
  removeAthleteProfile: (id: string) => void
  setAthleteRole: (athleteId: string, role: UserRole) => void
  // Crianças / Menores
  /** Cria um perfil de menor. Por omissão fica associado ao utilizador atual (máx. 2 adultos). */
  addYouthAthlete: (child: NewChild, adultIds?: string[]) => YouthAthlete
  updateYouthAthlete: (child: YouthAthlete) => void
  removeYouthAthlete: (childId: string) => void
  associateChildToAdult: (childId: string, adultId: string) => ActionResult
  disassociateChildFromAdult: (childId: string, adultId: string) => void
  /** Opção exclusiva do administrador: ativa/desativa o login e gestão autónoma da conta pelo menor (requer email associado). */
  setYouthManagementMode: (childId: string, canSelfManage: boolean, emailOverride?: string) => ActionResult
  // Provas
  createRace: (race: NewRace) => Race
  updateRace: (race: Race) => void
  deleteRace: (raceId: string) => void
  registerForRace: (input: RegisterForRaceInput) => ActionResult
  cancelRegistration: (regId: string) => void
  updateRegistrationByAdmin: (
    regId: string,
    patch: Partial<
      Pick<
        RaceRegistration,
        'status' | 'bib_number' | 'bib_status' | 'bib_pickup_by' | 'transport_mode' | 'result_time' | 'trophy_points' | 'notes'
      >
    >
  ) => void
  confirmAllPendingForRace: (raceId: string) => void
  /** Ação do admin sobre inscrições escolhidas: confirmar, dorsal no clube ou dorsal entregue. */
  applyToRegistrations: (raceId: string, regIds: string[], action: RegistrationBulkAction) => void
  markAllBibsAtClubForRace: (raceId: string, pickupBy: string) => void
  // Treinos e eventos
  createEvent: (evt: NewEvent) => TeamEvent | null
  updateEvent: (evt: TeamEvent) => void
  deleteEvent: (eventId: string) => void
  rsvpEvent: (eventId: string, status: 'going' | 'maybe' | 'not_going', note?: string) => void
  // Comunicados
  sendNotification: (notif: NewNotification) => void
  deleteNotification: (notifId: string) => void
  togglePinNotification: (notifId: string) => void
  markNotificationRead: (notifId: string) => void
  markAllNotificationsRead: () => void
  // Troféu de Cascais (Sincronização automatizada, Dorsais e Classificações por Época)
  trofeuSeasons: TrofeuSeasonData[]
  trofeuSyncLogs: TrofeuSyncLog[]
  isSyncingTrofeu: boolean
  pendingDorsalAthletesCount: number
  syncTrofeuCascais: (trigger?: TrofeuSyncLog['trigger']) => Promise<TrofeuSyncLog>
  assignTrofeuDorsal: (personId: string, isYouth: boolean, dorsal: string, season?: string) => void
  checkRaceDocumentsNow: (raceId: string) => Promise<void>
  resetDemoData: () => void
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

export type RegistrationBulkAction = 'confirm' | 'bib_at_club' | 'bib_delivered'

const AppContext = createContext<AppContextValue | undefined>(undefined)

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

/** Os `dependents` de cada perfil são sempre derivados da lista de crianças. */
const withDependents = (profiles: AthleteProfile[], youth: YouthAthlete[]): AthleteProfile[] =>
  profiles.map((p) => ({
    ...p,
    dependents: youth.filter((c) => c.associated_adult_ids.includes(p.id)),
  }))

/** Projeta um menor com login autónomo autorizado (`can_self_manage: true`) para sessão ativa. */
const youthToAthleteProfile = (y: YouthAthlete): AthleteProfile => ({
  id: y.id,
  name: y.name,
  nickname: y.name.split(' ')[0] || y.name,
  email: y.email || '',
  phone: y.phone || '',
  role: 'athlete',
  is_minor_account: true,
  gender: y.gender,
  birth_date: y.birth_date,
  escalao: y.escalao,
  nif: y.nif,
  cc_number: y.cc_number || '',
  shirt_size: 'Criança',
  medical_notes: y.medical_notes,
  has_official_kit: true,
  dorsal_trofeu: y.dorsais_trofeu?.['2026/2027'] || y.dorsal_trofeu,
  dorsais_trofeu: y.dorsais_trofeu,
  created_from_trofeu: y.created_from_trofeu,
  needs_admin_review: y.needs_admin_review,
  trofeu_seasons: y.trofeu_seasons,
  dependents: [],
})

const sortByDate = <T extends { date: string }>(list: T[], timeKey: keyof T) =>
  [...list].sort((a, b) => `${a.date} ${String(a[timeKey] ?? '')}`.localeCompare(`${b.date} ${String(b[timeKey] ?? '')}`))

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [youthAthletes, setYouthAthletes] = useState<YouthAthlete[]>(() =>
    loadFromStorage(STORAGE_KEYS.YOUTH_ATHLETES, INITIAL_YOUTH_ATHLETES)
  )
  const [baseProfiles, setProfiles] = useState<AthleteProfile[]>(() =>
    loadFromStorage(STORAGE_KEYS.PROFILES, INITIAL_PROFILES)
  )
  const [races, setRaces] = useState<Race[]>(() => loadFromStorage(STORAGE_KEYS.RACES, INITIAL_RACES))
  const [registrations, setRegistrations] = useState<RaceRegistration[]>(() =>
    loadFromStorage(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS)
  )
  const [events, setEvents] = useState<TeamEvent[]>(() => loadFromStorage(STORAGE_KEYS.EVENTS, INITIAL_EVENTS))
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  )
  const [currentUserId, setCurrentUserId] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.CURRENT_USER_ID, 'ath-rui-mariano')
  )
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(() =>
    loadFromStorage<string | null>(STORAGE_KEYS.AUTHENTICATED_USER_ID, null)
  )
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured)
  const [activeRole, setActiveRoleState] = useState<UserRole>(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_VIEW_ROLE, 'admin')
  )
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => (loadFromStorage<ThemeMode>(STORAGE_KEYS.THEME, 'balanced') === 'dark' ? 'dark' : 'balanced'))
  const [trofeuSeasons, setTrofeuSeasons] = useState<TrofeuSeasonData[]>(() =>
    loadFromStorage(STORAGE_KEYS.TROFEU_SEASONS, INITIAL_TROFEU_SEASONS)
  )
  const [trofeuSyncLogs, setTrofeuSyncLogs] = useState<TrofeuSyncLog[]>(() =>
    loadFromStorage(STORAGE_KEYS.TROFEU_SYNC_LOGS, [])
  )
  const [isSyncingTrofeu, setIsSyncingTrofeu] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const autoSyncedRef = useRef(false)
  const supabaseHydratedRef = useRef(false)

  // Persistência local
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(baseProfiles)), [baseProfiles])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.YOUTH_ATHLETES, JSON.stringify(youthAthletes)), [youthAthletes])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races)), [races])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations)), [registrations])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events)), [events])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications)), [notifications])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId)), [currentUserId])
  useEffect(() => {
    if (authenticatedUserId) {
      localStorage.setItem(STORAGE_KEYS.AUTHENTICATED_USER_ID, JSON.stringify(authenticatedUserId))
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTHENTICATED_USER_ID)
    }
  }, [authenticatedUserId])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW_ROLE, JSON.stringify(activeRole)), [activeRole])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.TROFEU_SEASONS, JSON.stringify(trofeuSeasons)), [trofeuSeasons])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.TROFEU_SYNC_LOGS, JSON.stringify(trofeuSyncLogs)), [trofeuSyncLogs])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(themeMode))
    document.documentElement.setAttribute('data-theme', themeMode)
  }, [themeMode])

  const profiles = useMemo(() => withDependents(baseProfiles, youthAthletes), [baseProfiles, youthAthletes])

  const isPersonAuthorizedForLogin = (personId: string, listProfiles = baseProfiles, listYouth = youthAthletes): boolean => {
    const adult = listProfiles.find((p) => p.id === personId)
    if (adult) {
      const hasEmail = Boolean(normalizeEmail(adult.login_email || adult.email))
      return hasEmail && Boolean(adult.login_authorized || adult.role === 'admin')
    }
    const minor = listYouth.find((y) => y.id === personId)
    if (!minor) return false
    const hasEmail = Boolean(normalizeEmail(minor.login_email || minor.email))
    return hasEmail && Boolean(minor.can_self_manage)
  }

  const isAuthenticated = useMemo(() => {
    if (!authenticatedUserId) return false
    return isPersonAuthorizedForLogin(authenticatedUserId, baseProfiles, youthAthletes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedUserId, baseProfiles, youthAthletes])

  const currentUser = useMemo(() => {
    const targetId = authenticatedUserId && isPersonAuthorizedForLogin(authenticatedUserId) ? authenticatedUserId : currentUserId
    const adult = profiles.find((p) => p.id === targetId)
    if (adult) return adult
    const minor = youthAthletes.find((y) => y.id === targetId && y.can_self_manage)
    if (minor) return youthToAthleteProfile(minor)
    return profiles[0]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, youthAthletes, currentUserId, authenticatedUserId])

  // Um atleta sem papel de admin nunca pode ver a vista de administração
  const isAdminView = activeRole === 'admin' && currentUser.role === 'admin'

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = uid('toast')
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3600)
  }

  const requireAdmin = (action: string): boolean => {
    if (isAdminView) return true
    showToast(`Apenas administradores podem ${action}.`, 'warning')
    return false
  }

  const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode)

  const setCurrentUserById = (id: string) => {
    const target = profiles.find((p) => p.id === id)
    if (target) {
      if (!target.login_authorized && target.role !== 'admin') {
        showToast('Este atleta ainda não tem login autorizado pelo administrador.', 'warning')
        return
      }
      setCurrentUserId(id)
      setAuthenticatedUserId(id)
      setActiveRoleState(target.role)
      showToast(`Sessão: ${target.name} (${target.role === 'admin' ? 'Administrador' : 'Atleta'})`, 'info')
      return
    }
    const minor = youthAthletes.find((y) => y.id === id)
    if (minor) {
      if (!minor.can_self_manage) {
        showToast('Este menor não tem login próprio ativo (é gerido pelos adultos responsáveis).', 'warning')
        return
      }
      setCurrentUserId(id)
      setAuthenticatedUserId(id)
      setActiveRoleState('athlete')
      showToast(`Sessão: ${minor.name} (Conta Jovem Autónoma)`, 'info')
    }
  }

  // ---------------------------------------------------------------------------
  // Autorização de Login na Ficha (Email obrigatório) & Autenticação
  // ---------------------------------------------------------------------------
  const isEmailUsedByOther = (cleanEmail: string, excludePersonId: string): boolean =>
    baseProfiles.some(
      (p) => p.id !== excludePersonId && (normalizeEmail(p.login_email) === cleanEmail || normalizeEmail(p.email) === cleanEmail)
    ) ||
    youthAthletes.some(
      (y) => y.id !== excludePersonId && (normalizeEmail(y.login_email) === cleanEmail || normalizeEmail(y.email) === cleanEmail)
    )

  const setAthleteLoginAuthorization = (
    athleteId: string,
    authorized: boolean,
    emailOverride?: string
  ): ActionResult => {
    if (!requireAdmin('autorizar ou bloquear logins')) {
      return { success: false, message: 'Apenas administradores podem alterar esta opção.' }
    }
    const target = baseProfiles.find((p) => p.id === athleteId)
    if (!target) return { success: false, message: 'Atleta não encontrado.' }
    if (!authorized && target.role === 'admin') {
      const msg = 'Um administrador mantém autorização de login ativa enquanto tiver perfil Admin.'
      showToast(msg, 'warning')
      return { success: false, message: msg }
    }

    const candidateEmail = normalizeEmail(emailOverride !== undefined ? emailOverride : target.login_email || target.email)
    if (authorized && (!candidateEmail || !candidateEmail.includes('@'))) {
      const msg = 'Para autorizar o login, o atleta tem de ter um email válido associado na ficha.'
      showToast(msg, 'warning')
      return { success: false, message: msg }
    }
    if (candidateEmail && isEmailUsedByOther(candidateEmail, athleteId)) {
      const msg = 'Este email já está associado a outro atleta na equipa.'
      showToast(msg, 'warning')
      return { success: false, message: msg }
    }

    const emailChanged = Boolean(candidateEmail && normalizeEmail(target.login_email) !== candidateEmail)
    const updatedTarget: AthleteProfile = {
      ...target,
      email: candidateEmail || target.email,
      login_email: candidateEmail || undefined,
      login_authorized: authorized,
      login_password_hash: emailChanged ? undefined : target.login_password_hash,
      auth_user_id: emailChanged ? undefined : target.auth_user_id,
      dependents: [],
    }
    setProfiles((prev) => prev.map((p) => (p.id === athleteId ? updatedTarget : p)))
    void upsertProfiles([updatedTarget])
    if (!authorized && authenticatedUserId === athleteId) {
      setAuthenticatedUserId(null)
    }
    const msg = authorized
      ? `${target.name} (${candidateEmail}) autorizado(a) a fazer login na aplicação.`
      : `Acesso de login de ${target.name} bloqueado.`
    showToast(msg, 'info')
    return { success: true, message: msg }
  }

  const resetPersonLoginPassword = (personId: string, isYouth: boolean) => {
    if (!requireAdmin('repor palavra-passe de login')) return
    if (isYouth) {
      const y = youthAthletes.find((item) => item.id === personId)
      if (!y) return
      const updated: YouthAthlete = {
        ...y,
        auth_user_id: undefined,
        login_provider: undefined,
        login_activated_at: undefined,
        login_password_hash: undefined,
      }
      setYouthAthletes((prev) => prev.map((item) => (item.id === personId ? updated : item)))
      void upsertYouthAthletes([updated])
      showToast(`Palavra-passe de ${y.name} reposta. Pode definir nova senha no próximo login com ${y.login_email || y.email}.`, 'info')
      return
    }
    const p = baseProfiles.find((item) => item.id === personId)
    if (!p) return
    const updated: AthleteProfile = {
      ...p,
      auth_user_id: undefined,
      login_provider: undefined,
      login_activated_at: undefined,
      login_password_hash: undefined,
      dependents: [],
    }
    setProfiles((prev) => prev.map((item) => (item.id === personId ? updated : item)))
    void upsertProfiles([updated])
    showToast(`Palavra-passe de ${p.name} reposta. Pode definir nova senha no próximo login com ${p.login_email || p.email}.`, 'info')
  }

  const signInAuthorizedPerson = (
    personId: string,
    email: string,
    provider: 'google' | 'email',
    authUserId?: string,
    passwordHash?: string,
    listProfiles = baseProfiles,
    listYouth = youthAthletes
  ): ActionResult => {
    const cleanEmail = normalizeEmail(email)
    const adult = listProfiles.find((p) => p.id === personId)
    if (adult) {
      if (!adult.login_authorized && adult.role !== 'admin') {
        return {
          success: false,
          message: `${adult.name} não tem autorização de login ativa na ficha do atleta. Pede ao administrador para autorizar primeiro.`,
        }
      }
      const updatedAdult: AthleteProfile = {
        ...adult,
        login_authorized: true,
        login_email: cleanEmail,
        login_provider: provider,
        login_activated_at: adult.login_activated_at || new Date().toISOString(),
        auth_user_id: authUserId || adult.auth_user_id,
        login_password_hash: passwordHash || adult.login_password_hash,
        email: adult.email || cleanEmail,
        dependents: [],
      }
      setProfiles((prev) => prev.map((p) => (p.id === personId ? updatedAdult : p)))
      void upsertProfiles([updatedAdult])
      setCurrentUserId(personId)
      setAuthenticatedUserId(personId)
      setActiveRoleState(updatedAdult.role)
      showToast(`Bem-vindo(a), ${updatedAdult.name}!`)
      return { success: true, message: `Sessão iniciada como ${updatedAdult.name}.` }
    }

    const minor = listYouth.find((y) => y.id === personId)
    if (minor) {
      if (!minor.can_self_manage) {
        return {
          success: false,
          message: `O perfil de ${minor.name} está gerido pelos adultos responsáveis. O administrador tem de ativar "Login próprio" na ficha.`,
        }
      }
      const updatedMinor: YouthAthlete = {
        ...minor,
        login_email: cleanEmail,
        login_provider: provider,
        login_activated_at: minor.login_activated_at || new Date().toISOString(),
        auth_user_id: authUserId || minor.auth_user_id,
        login_password_hash: passwordHash || minor.login_password_hash,
        email: minor.email || cleanEmail,
      }
      setYouthAthletes((prev) => prev.map((y) => (y.id === personId ? updatedMinor : y)))
      void upsertYouthAthletes([updatedMinor])
      setCurrentUserId(personId)
      setAuthenticatedUserId(personId)
      setActiveRoleState('athlete')
      showToast(`Bem-vindo(a), ${updatedMinor.name}!`)
      return { success: true, message: `Sessão iniciada como ${updatedMinor.name}.` }
    }

    return { success: false, message: 'Ficha de atleta não encontrada.' }
  }

  const resolveEmailOwner = (
    email: string,
    listProfiles = baseProfiles,
    listYouth = youthAthletes
  ): { kind: 'adult' | 'youth'; id: string; authorized: boolean; hasBoundLogin: boolean; hash?: string } | null => {
    const clean = normalizeEmail(email)
    if (!clean) return null

    const adultByLogin = listProfiles.find((p) => normalizeEmail(p.login_email) === clean)
    if (adultByLogin) {
      return {
        kind: 'adult',
        id: adultByLogin.id,
        authorized: Boolean(adultByLogin.login_authorized || adultByLogin.role === 'admin'),
        hasBoundLogin: Boolean(adultByLogin.login_password_hash || adultByLogin.auth_user_id),
        hash: adultByLogin.login_password_hash,
      }
    }
    const youthByLogin = listYouth.find((y) => normalizeEmail(y.login_email) === clean)
    if (youthByLogin) {
      return {
        kind: 'youth',
        id: youthByLogin.id,
        authorized: Boolean(youthByLogin.can_self_manage),
        hasBoundLogin: Boolean(youthByLogin.login_password_hash || youthByLogin.auth_user_id),
        hash: youthByLogin.login_password_hash,
      }
    }
    const adultByContact = listProfiles.find((p) => normalizeEmail(p.email) === clean)
    if (adultByContact) {
      return {
        kind: 'adult',
        id: adultByContact.id,
        authorized: Boolean(adultByContact.login_authorized || adultByContact.role === 'admin'),
        hasBoundLogin: Boolean(adultByContact.login_password_hash || adultByContact.auth_user_id),
        hash: adultByContact.login_password_hash,
      }
    }
    const youthByContact = listYouth.find((y) => normalizeEmail(y.email) === clean)
    if (youthByContact) {
      return {
        kind: 'youth',
        id: youthByContact.id,
        authorized: Boolean(youthByContact.can_self_manage),
        hasBoundLogin: Boolean(youthByContact.login_password_hash || youthByContact.auth_user_id),
        hash: youthByContact.login_password_hash,
      }
    }
    return null
  }

  const loginWithEmail = async (
    email: string,
    password: string,
    providerHint: 'email' | 'google' = 'email'
  ): Promise<ActionResult> => {
    const cleanEmail = normalizeEmail(email)
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Indica um endereço de email válido.' }
    }
    if (!password || password.length < 6) {
      return { success: false, message: 'A palavra-passe deve ter pelo menos 6 caracteres.' }
    }

    const owner = resolveEmailOwner(cleanEmail)
    if (!owner) {
      return {
        success: false,
        message: 'Não existe nenhuma ficha de atleta com este email associado. Pede ao administrador para associar o teu email na tua ficha.',
      }
    }
    if (!owner.authorized) {
      return {
        success: false,
        message: 'O teu email está na ficha, mas o login ainda não foi expressamente autorizado pelo administrador.',
      }
    }

    const pwdHash = await hashPassword(password)
    const targetAdult = baseProfiles.find((p) => p.id === owner.id)
    const targetYouth = youthAthletes.find((y) => y.id === owner.id)
    const existingHash = targetAdult?.login_password_hash || targetYouth?.login_password_hash
    let authUserId = targetAdult?.auth_user_id || targetYouth?.auth_user_id

    if (isSupabaseConfigured) {
      const signInRes = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (!signInRes.error && signInRes.data.user) {
        authUserId = signInRes.data.user.id
      } else if (!existingHash) {
        // 1.º acesso do atleta cujo email foi associado e autorizado pelo admin
        const signUpRes = await supabase.auth.signUp({ email: cleanEmail, password })
        if (!signUpRes.error && signUpRes.data.user) {
          authUserId = signUpRes.data.user.id
        } else if (
          signUpRes.error &&
          !signUpRes.error.message.toLowerCase().includes('already registered') &&
          !signUpRes.error.message.toLowerCase().includes('confirm')
        ) {
          return { success: false, message: signUpRes.error.message }
        }
      } else if (existingHash !== pwdHash) {
        return { success: false, message: 'Palavra-passe incorreta para este email.' }
      }
    } else if (existingHash && existingHash !== pwdHash) {
      return { success: false, message: 'Palavra-passe incorreta para este email.' }
    }

    return signInAuthorizedPerson(owner.id, cleanEmail, providerHint, authUserId, existingHash || pwdHash)
  }

  const loginWithGoogle = async (): Promise<ActionResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        fallbackToEmailFlow: true,
        message: 'Configuração Supabase indisponível. Entra com o email associado na tua ficha e palavra-passe.',
      }
    }
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error || !data?.url) {
      return {
        success: false,
        fallbackToEmailFlow: true,
        message:
          'O fornecedor Google OAuth ainda não está ativo no painel Auth do Supabase. Podes entrar já abaixo com o email associado à tua ficha e palavra-passe.',
      }
    }
    return { success: true, message: 'A redirecionar para o Google…' }
  }

  const logout = async () => {
    setAuthenticatedUserId(null)
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    showToast('Sessão terminada.', 'info')
  }

  const setActiveRole = (role: UserRole) => {
    if (role === 'admin' && currentUser.role !== 'admin') {
      showToast('Este utilizador não tem perfil de administrador.', 'warning')
      return
    }
    setActiveRoleState(role)
    showToast(role === 'admin' ? 'Vista de Administrador' : 'Vista de Atleta', 'info')
  }

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read_by.includes(currentUser.id)).length,
    [notifications, currentUser.id]
  )

  const pushNotification = (n: Omit<AppNotification, 'id' | 'created_at' | 'created_by_name' | 'read_by'>) => {
    const notif: AppNotification = {
      ...n,
      id: uid('notif'),
      created_by_name: currentUser.name,
      created_at: new Date().toISOString(),
      read_by: [currentUser.id],
    }
    setNotifications((prev) => [notif, ...prev])
    void upsertNotifications([notif])
    return notif
  }

  // ---------------------------------------------------------------------------
  // Atletas
  // ---------------------------------------------------------------------------
  const updateProfile = (updated: AthleteProfile) => {
    const isSelf = updated.id === currentUser.id
    if (!isSelf && !requireAdmin('editar outros atletas')) return

    // Caso seja uma conta jovem autónoma (`YouthAthlete` com login próprio)
    const minorOrig = youthAthletes.find((y) => y.id === updated.id)
    if (minorOrig) {
      const updatedYouth: YouthAthlete = {
        ...minorOrig,
        name: updated.name,
        gender: updated.gender,
        birth_date: updated.birth_date,
        escalao: updated.escalao,
        nif: updated.nif,
        cc_number: updated.cc_number,
        email: updated.email,
        phone: updated.phone,
        medical_notes: updated.medical_notes,
        dorsal_trofeu: updated.dorsal_trofeu,
        needs_admin_review: updated.dorsal_trofeu ? false : minorOrig.needs_admin_review,
      }
      setYouthAthletes((prev) => prev.map((y) => (y.id === minorOrig.id ? updatedYouth : y)))
      void upsertYouthAthletes([updatedYouth])
      showToast(isSelf ? 'Perfil atualizado.' : `Ficha de ${updated.name} atualizada.`)
      return
    }

    // Um atleta não pode promover-se a admin
    const original = baseProfiles.find((p) => p.id === updated.id)
    const safe = !isAdminView && original ? { ...updated, role: original.role } : updated
    const cleanProfile = { ...safe, dependents: [] }
    setProfiles((prev) => prev.map((p) => (p.id === safe.id ? cleanProfile : p)))
    void upsertProfiles([cleanProfile])
    showToast(isSelf ? 'Perfil atualizado.' : `Ficha de ${updated.name} atualizada.`)
  }

  const setAthleteRole = (athleteId: string, role: UserRole) => {
    if (!requireAdmin('alterar perfis de administrador')) return
    const target = baseProfiles.find((p) => p.id === athleteId)
    if (!target) return
    if (role === 'athlete' && target.role === 'admin') {
      const otherAdmins = baseProfiles.filter((p) => p.id !== athleteId && p.role === 'admin')
      if (otherAdmins.length === 0) {
        showToast('Tem de existir pelo menos um administrador na equipa.', 'warning')
        return
      }
      if (athleteId === currentUser.id) setActiveRoleState('athlete')
    }
    const updatedTarget = { ...target, role, dependents: [] }
    setProfiles((prev) => prev.map((p) => (p.id === athleteId ? { ...p, role } : p)))
    void upsertProfiles([updatedTarget])
    showToast(
      role === 'admin'
        ? `${target.name} é agora Administrador da equipa.`
        : `${target.name} passou para perfil de Atleta.`,
      'info'
    )
  }

  const addAthleteProfile = (profile: Omit<AthleteProfile, 'id' | 'dependents'>) => {
    if (!requireAdmin('criar atletas')) return null
    const newProfile: AthleteProfile = { ...profile, id: uid('ath'), dependents: [] }
    setProfiles((prev) => [...prev, newProfile])
    void upsertProfiles([newProfile])
    showToast(`${newProfile.name} adicionado(a) à equipa.`)
    return newProfile
  }

  const removeAthleteProfile = (id: string) => {
    if (!requireAdmin('remover atletas')) return
    if (id === currentUser.id) {
      showToast('Não podes remover o teu próprio perfil.', 'warning')
      return
    }
    const p = baseProfiles.find((x) => x.id === id)
    const affectedYouth = youthAthletes
      .filter((c) => c.associated_adult_ids.includes(id))
      .map((c) => ({ ...c, associated_adult_ids: c.associated_adult_ids.filter((a) => a !== id) }))
    setProfiles((prev) => prev.filter((x) => x.id !== id))
    setYouthAthletes((prev) =>
      prev.map((c) => ({ ...c, associated_adult_ids: c.associated_adult_ids.filter((a) => a !== id) }))
    )
    setRegistrations((prev) => prev.filter((r) => r.athlete_id !== id))
    void deleteProfileById(id)
    if (affectedYouth.length > 0) void upsertYouthAthletes(affectedYouth)
    registrations.filter((r) => r.athlete_id === id).forEach((r) => void deleteRegistrationById(r.id))
    showToast(`${p?.name || 'Atleta'} removido(a) da equipa.`, 'info')
  }

  // ---------------------------------------------------------------------------
  // Crianças / Menores (geridos por até 2 adultos ou com login próprio gerido pelo admin)
  // ---------------------------------------------------------------------------
  const addYouthAthlete = (childInput: NewChild, adultIds?: string[]): YouthAthlete => {
    const newChild: YouthAthlete = {
      ...childInput,
      can_self_manage: isAdminView ? Boolean(childInput.can_self_manage) : false,
      id: uid('dep'),
      associated_adult_ids: (adultIds ?? (currentUser.is_minor_account ? [] : [currentUser.id])).slice(0, 2),
    }
    setYouthAthletes((prev) => [...prev, newChild])
    void upsertYouthAthletes([newChild])
    showToast(`Perfil de ${newChild.name} criado.`)
    return newChild
  }

  const canManageChild = (child: YouthAthlete) =>
    isAdminView ||
    child.associated_adult_ids.includes(currentUser.id) ||
    Boolean(child.can_self_manage && child.id === currentUser.id)

  const updateYouthAthlete = (updatedChild: YouthAthlete) => {
    const original = youthAthletes.find((c) => c.id === updatedChild.id)
    if (!original || !canManageChild(original)) {
      showToast('Só os responsáveis, o próprio autorizado ou um admin podem editar este menor.', 'warning')
      return
    }
    // Apenas administradores podem ativar/desativar o login próprio do menor
    const safeChild: YouthAthlete = isAdminView
      ? updatedChild
      : { ...updatedChild, can_self_manage: original.can_self_manage }
    setYouthAthletes((prev) => prev.map((c) => (c.id === safeChild.id ? safeChild : c)))
    void upsertYouthAthletes([safeChild])
    showToast(`Ficha de ${safeChild.name} atualizada.`)
  }

  const setYouthManagementMode = (childId: string, canSelfManage: boolean, emailOverride?: string): ActionResult => {
    if (!requireAdmin('alterar o modo de acesso de menores')) {
      return { success: false, message: 'Apenas administradores podem alterar esta opção.' }
    }
    const child = youthAthletes.find((c) => c.id === childId)
    if (!child) return { success: false, message: 'Menor não encontrado.' }

    const candidateEmail = normalizeEmail(emailOverride !== undefined ? emailOverride : child.login_email || child.email)
    if (canSelfManage && (!candidateEmail || !candidateEmail.includes('@'))) {
      const msg = 'Associa primeiro um email válido na ficha do menor para poderes ativar o Login próprio.'
      showToast(msg, 'warning')
      return { success: false, message: msg }
    }
    if (candidateEmail && isEmailUsedByOther(candidateEmail, childId)) {
      const msg = 'Este email já está associado a outro atleta na equipa.'
      showToast(msg, 'warning')
      return { success: false, message: msg }
    }

    const emailChanged = Boolean(candidateEmail && normalizeEmail(child.login_email) !== candidateEmail)
    const updatedChild: YouthAthlete = {
      ...child,
      can_self_manage: canSelfManage,
      email: candidateEmail || child.email,
      login_email: candidateEmail || undefined,
      login_password_hash: emailChanged ? undefined : child.login_password_hash,
      auth_user_id: emailChanged ? undefined : child.auth_user_id,
    }
    setYouthAthletes((prev) =>
      prev.map((c) => (c.id === childId ? updatedChild : c))
    )
    void upsertYouthAthletes([updatedChild])
    if (!canSelfManage && currentUserId === childId) {
      const admin = baseProfiles.find((p) => p.role === 'admin') || baseProfiles[0]
      setCurrentUserId(admin.id)
      setActiveRoleState(admin.role)
    }
    const msg = canSelfManage
      ? `${child.name} (${candidateEmail}) pode agora fazer login e gerir a sua própria conta.`
      : `${child.name} passou para gestão pelos adultos responsáveis (máx. 2).`
    showToast(msg, 'info')
    return { success: true, message: msg }
  }

  const removeYouthAthlete = (childId: string) => {
    const child = youthAthletes.find((c) => c.id === childId)
    if (!child || !canManageChild(child)) return
    setYouthAthletes((prev) => prev.filter((c) => c.id !== childId))
    setRegistrations((prev) => prev.filter((r) => r.dependent_id !== childId))
    void deleteYouthById(childId)
    registrations.filter((r) => r.dependent_id === childId).forEach((r) => void deleteRegistrationById(r.id))
    showToast(`Perfil de ${child.name} removido.`, 'info')
  }

  const associateChildToAdult = (childId: string, adultId: string): ActionResult => {
    const child = youthAthletes.find((c) => c.id === childId)
    if (!child) return { success: false, message: 'Criança não encontrada.' }
    if (child.associated_adult_ids.includes(adultId)) {
      return { success: false, message: `${child.name} já está associada a este adulto.` }
    }
    if (child.associated_adult_ids.length >= 2) {
      const msg = `${child.name} já tem 2 adultos responsáveis.`
      showToast(msg, 'warning')
      return { success: false, message: msg }
    }
    const updatedChild = { ...child, associated_adult_ids: [...child.associated_adult_ids, adultId] }
    setYouthAthletes((prev) =>
      prev.map((c) => (c.id === childId ? updatedChild : c))
    )
    void upsertYouthAthletes([updatedChild])
    showToast(`${child.name} associada com sucesso.`)
    return { success: true, message: 'Criança associada.' }
  }

  const disassociateChildFromAdult = (childId: string, adultId: string) => {
    const child = youthAthletes.find((c) => c.id === childId)
    if (!child) return
    const updatedChild = { ...child, associated_adult_ids: child.associated_adult_ids.filter((id) => id !== adultId) }
    setYouthAthletes((prev) =>
      prev.map((c) =>
        c.id === childId ? updatedChild : c
      )
    )
    void upsertYouthAthletes([updatedChild])
    showToast(`${child?.name || 'Criança'} desassociada.`, 'info')
  }

  // ---------------------------------------------------------------------------
  // Provas
  // ---------------------------------------------------------------------------
  const createRace = (raceInput: NewRace): Race => {
    // Atletas só podem sugerir provas (inscrição individual)
    const category = isAdminView ? raceInput.category : 'individual'
    const newRace: Race = {
      ...raceInput,
      category,
      counts_for_trophy: category === 'trofeu_cascais',
      van_available: isAdminView ? raceInput.van_available : false,
      van_capacity: isAdminView ? raceInput.van_capacity : 0,
      id: uid('race'),
      created_by: currentUser.id,
      created_by_name: currentUser.name,
    }
    setRaces((prev) => sortByDate([...prev, newRace], 'start_time'))
    void upsertRaces([newRace])

    const suggested = category === 'individual'
    pushNotification({
      title: suggested ? `Prova sugerida por ${currentUser.name}: ${newRace.title}` : `Inscrições abertas: ${newRace.title}`,
      message: suggested
        ? `${currentUser.name} sugeriu "${newRace.title}" (${newRace.date}, ${newRace.location}). Inscrição individual — marca presença na app para irmos juntos.`
        : `Já te podes inscrever em "${newRace.title}" (${newRace.date}, ${newRace.location}).${
            newRace.van_available ? ` Carrinha do clube com ${newRace.van_capacity} lugares.` : ''
          }${newRace.open_to_children ? ' Aberta a crianças.' : ''}`,
      type: suggested ? 'individual_share' : 'race_open',
      related_race_id: newRace.id,
      pinned: category === 'trofeu_cascais',
    })
    showToast(suggested ? `Prova "${newRace.title}" sugerida à equipa.` : `Prova "${newRace.title}" publicada.`)
    return newRace
  }

  const updateRace = (updated: Race) => {
    if (!isAdminView && updated.created_by !== currentUser.id) {
      showToast('Só o autor ou um admin pode editar esta prova.', 'warning')
      return
    }
    setRaces((prev) => sortByDate(prev.map((r) => (r.id === updated.id ? updated : r)), 'start_time'))
    void upsertRaces([updated])
    showToast('Prova atualizada.')
  }

  const deleteRace = (raceId: string) => {
    const race = races.find((r) => r.id === raceId)
    if (!race) return
    if (!isAdminView && race.created_by !== currentUser.id) {
      showToast('Só o autor ou um admin pode remover esta prova.', 'warning')
      return
    }
    const updatedNotifs = notifications
      .filter((n) => n.related_race_id === raceId)
      .map((n) => ({ ...n, related_race_id: undefined }))
    setRaces((prev) => prev.filter((r) => r.id !== raceId))
    setRegistrations((prev) => prev.filter((reg) => reg.race_id !== raceId))
    setNotifications((prev) => prev.map((n) => (n.related_race_id === raceId ? { ...n, related_race_id: undefined } : n)))
    void deleteRaceById(raceId)
    if (updatedNotifs.length > 0) void upsertNotifications(updatedNotifs)
    showToast('Prova removida.', 'info')
  }

  /** Atletas só mexem em inscrições antes da prova e (fora das sugeridas) antes do prazo; o admin pode sempre. */
  const registrationOpenFor = (race: Race) => {
    if (isAdminView) return true
    const todayLocal = todayISO()
    if (race.date < todayLocal) return false
    return !(race.category !== 'individual' && race.registration_deadline && race.registration_deadline < todayLocal)
  }

  const registerForRace = (input: RegisterForRaceInput): ActionResult => {
    const race = races.find((r) => r.id === input.race_id)
    if (!race) return { success: false, message: 'Prova não encontrada.' }

    if (!registrationOpenFor(race)) {
      const msg = race.date < todayISO() ? 'Esta prova já se realizou.' : 'O prazo de inscrição terminou.'
      showToast(msg, 'warning')
      return { success: false, message: msg }
    }

    const actingForOther = input.athlete_id !== currentUser.id
    if (actingForOther && !isAdminView) {
      // Um responsável secundário pode inscrever a criança que partilha
      const child = input.dependent_id ? youthAthletes.find((c) => c.id === input.dependent_id) : undefined
      if (!child || !child.associated_adult_ids.includes(currentUser.id)) {
        const msg = 'Só podes inscrever-te a ti ou às crianças a teu cargo.'
        showToast(msg, 'warning')
        return { success: false, message: msg }
      }
    }

    if (input.is_dependent && !race.open_to_children) {
      const msg = 'Esta prova não está aberta a crianças.'
      showToast(msg, 'warning')
      return { success: false, message: msg }
    }

    // Carrinha só existe em provas com carrinha
    const transport =
      !race.van_available && (input.transport_mode === 'van_roundtrip' || input.transport_mode === 'van_return_only')
        ? 'own_transport'
        : input.transport_mode

    // Uma criança/menor só tem uma inscrição por prova, quer seja inscrito pelo adulto ou autonomamente
    const targetMinorId = input.dependent_id || (currentUser.is_minor_account && input.athlete_id === currentUser.id ? currentUser.id : undefined)
    const existing = registrations.find((reg) => {
      if (reg.race_id !== input.race_id) return false
      if (targetMinorId) {
        return reg.dependent_id === targetMinorId || (!reg.is_dependent && reg.athlete_id === targetMinorId)
      }
      return !reg.is_dependent && reg.athlete_id === input.athlete_id
    })

    const initialStatus: RegistrationStatus =
      race.category === 'individual' ? 'self_enrolled' : isAdminView ? 'enrolled_by_admin' : 'interested'

    // O dorsal do Troféu muda todos os anos e só conta para provas oficiais do Troféu de Cascais
    const personForBib = targetMinorId
      ? youthAthletes.find((y) => y.id === targetMinorId)
      : baseProfiles.find((p) => p.id === input.athlete_id)
    const trofeuDorsal =
      race.category === 'trofeu_cascais'
        ? personForBib?.dorsais_trofeu?.['2026/2027'] || personForBib?.dorsal_trofeu
        : undefined

    const wantsVan = TRANSPORT_LABELS[transport]?.usesVanSeat
    if (existing) {
      const hadVan = TRANSPORT_LABELS[existing.transport_mode]?.usesVanSeat
      const updatedReg: RaceRegistration = {
        ...existing,
        distance: input.distance,
        transport_mode: transport,
        vehicle_id: wantsVan ? input.vehicle_id : undefined,
        // a fila da carrinha conta a partir do momento em que se pede lugar
        van_requested_at: wantsVan ? (hadVan && existing.van_requested_at ? existing.van_requested_at : new Date().toISOString()) : undefined,
        carpool_seats: input.carpool_seats,
        bib_number: trofeuDorsal ? trofeuDorsal : existing.bib_number,
        bib_status: trofeuDorsal && existing.bib_status === 'pending' ? 'delivered' : existing.bib_status,
        notes: input.notes,
        status: existing.status === 'cancelled' ? initialStatus : existing.status,
      }
      setRegistrations((prev) => prev.map((reg) => (reg.id === existing.id ? updatedReg : reg)))
      void upsertRegistrations([updatedReg])
      showToast('Inscrição atualizada.')
      return { success: true, message: 'Inscrição atualizada.' }
    }

    const newReg: RaceRegistration = {
      id: uid('reg'),
      race_id: input.race_id,
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      is_dependent: input.is_dependent,
      dependent_id: input.dependent_id,
      parent_name: input.parent_name,
      escalao: input.escalao,
      distance: input.distance,
      status: initialStatus,
      transport_mode: transport,
      vehicle_id: wantsVan ? input.vehicle_id : undefined,
      van_requested_at: wantsVan ? new Date().toISOString() : undefined,
      carpool_seats: input.carpool_seats,
      bib_number: trofeuDorsal || undefined,
      bib_status: trofeuDorsal ? 'delivered' : 'pending',
      bib_transfer_available: false,
      notes: input.notes,
      created_at: new Date().toISOString(),
    }
    setRegistrations((prev) => [...prev, newReg])
    void upsertRegistrations([newReg])
    const msg =
      race.category === 'individual'
        ? `${input.athlete_name}: presença marcada.`
        : initialStatus === 'enrolled_by_admin'
        ? `${input.athlete_name} inscrito(a).`
        : `Pedido de inscrição de ${input.athlete_name} enviado ao clube.`
    showToast(msg)
    return { success: true, message: msg }
  }

  const cancelRegistration = (regId: string) => {
    const reg = registrations.find((r) => r.id === regId)
    if (!reg) return
    const child = reg.dependent_id ? youthAthletes.find((c) => c.id === reg.dependent_id) : undefined
    const allowed =
      isAdminView ||
      reg.athlete_id === currentUser.id ||
      (currentUser.is_minor_account && reg.dependent_id === currentUser.id) ||
      Boolean(child?.associated_adult_ids.includes(currentUser.id))
    if (!allowed) return
    const race = races.find((r) => r.id === reg.race_id)
    if (race && !registrationOpenFor(race)) {
      showToast(race.date < todayISO() ? 'Esta prova já se realizou.' : 'O prazo terminou: fala com o clube para cancelar.', 'warning')
      return
    }
    // lugar na carrinha libertado: quem está em lista de espera sobe
    let promoted = ''
    if (race && TRANSPORT_LABELS[reg.transport_mode]?.usesVanSeat) {
      const active = registrations.filter((r) => r.race_id === race.id && r.status !== 'cancelled')
      const before = computeVanAllocation(race, active)
      if (before.confirmedPassengers.some((p) => p.id === reg.id) && before.waitlistPassengers.length > 0) {
        promoted = before.waitlistPassengers[0].athlete_name
      }
    }
    setRegistrations((prev) => prev.filter((r) => r.id !== regId))
    void deleteRegistrationById(regId)
    // o clube já tinha tratado desta inscrição (ou tem a carrinha em jogo): avisa a equipa, para o admin saber
    if (race && !isAdminView && (reg.status === 'enrolled_by_admin' || reg.bib_status !== 'pending' || promoted)) {
      pushNotification({
        title: `Cancelamento: ${race.title}`,
        message: `${reg.athlete_name} cancelou a inscrição${reg.status === 'enrolled_by_admin' ? ' que o clube já tinha confirmado' : ''}${
          reg.bib_status !== 'pending' ? ' (o dorsal já estava no clube)' : ''
        }.${promoted ? ` ${promoted} sobe da lista de espera da carrinha.` : ''} O clube deve verificar.`,
        type: 'general',
        related_race_id: race.id,
      })
    }
    showToast(`Inscrição de ${reg.athlete_name} cancelada.${promoted ? ` ${promoted} sobe da lista de espera.` : ''}`, 'info')
  }

  const updateRegistrationByAdmin: AppContextValue['updateRegistrationByAdmin'] = (regId, patch) => {
    if (!requireAdmin('gerir inscrições')) return
    const target = registrations.find((r) => r.id === regId)
    if (!target) return
    const updated = { ...target, ...patch }
    setRegistrations((prev) => prev.map((r) => (r.id === regId ? updated : r)))
    void upsertRegistrations([updated])
  }

  const confirmAllPendingForRace = (raceId: string) => {
    if (!requireAdmin('confirmar inscrições')) return
    const race = races.find((r) => r.id === raceId)
    const pendingRegs = registrations.filter((r) => r.race_id === raceId && r.status === 'interested')
    const count = pendingRegs.length
    if (!race || count === 0) {
      showToast('Não há inscrições pendentes nesta prova.', 'info')
      return
    }
    const updatedRegs = pendingRegs.map((r) => ({ ...r, status: 'enrolled_by_admin' as RegistrationStatus }))
    setRegistrations((prev) =>
      prev.map((r) => (r.race_id === raceId && r.status === 'interested' ? { ...r, status: 'enrolled_by_admin' } : r))
    )
    void upsertRegistrations(updatedRegs)
    pushNotification({
      title: `Inscrições efetuadas: ${race.title}`,
      message: `O clube confirmou a inscrição de ${count} atleta(s) em "${race.title}".`,
      type: 'race_open',
      related_race_id: raceId,
    })
    showToast(`${count} inscrição(ões) confirmada(s).`)
  }

  const applyToRegistrations = (raceId: string, regIds: string[], action: RegistrationBulkAction) => {
    if (!requireAdmin('gerir inscrições')) return
    const race = races.find((r) => r.id === raceId)
    const chosen = registrations.filter((r) => r.race_id === raceId && regIds.includes(r.id) && r.status !== 'cancelled')
    if (!race || chosen.length === 0) return
    const eligible = chosen.filter((r) =>
      action === 'confirm' ? r.status === 'interested' : action === 'bib_at_club' ? r.bib_status === 'pending' : r.bib_status !== 'delivered'
    )
    if (eligible.length === 0) {
      showToast('Nenhuma das inscrições escolhidas precisa desta ação.', 'info')
      return
    }
    const ids = new Set(eligible.map((r) => r.id))
    const transformReg = (r: RaceRegistration): RaceRegistration => {
      if (action === 'confirm') return { ...r, status: 'enrolled_by_admin' as RegistrationStatus }
      if (action === 'bib_at_club') return { ...r, bib_status: 'at_club' as BibStatus, bib_pickup_by: currentUser.name }
      return { ...r, bib_status: 'delivered' as BibStatus }
    }
    const updatedRegs = eligible.map(transformReg)
    setRegistrations((prev) =>
      prev.map((r) => (ids.has(r.id) ? transformReg(r) : r))
    )
    void upsertRegistrations(updatedRegs)
    const names = eligible.map((r) => r.athlete_name).join(', ')
    if (action === 'confirm') {
      pushNotification({
        title: `Inscrições efetuadas: ${race.title}`,
        message: `O clube confirmou a inscrição de ${names} em "${race.title}".`,
        type: 'race_open',
        related_race_id: raceId,
      })
      showToast(`${eligible.length} inscrição(ões) confirmada(s).`)
    } else if (action === 'bib_at_club') {
      pushNotification({
        title: `Dorsais no clube: ${race.title}`,
        message: `Os dorsais de ${names} em "${race.title}" estão no clube (levantados por ${currentUser.name}) e prontos a entregar.`,
        type: 'bibs_ready',
        related_race_id: raceId,
      })
      showToast(`${eligible.length} dorsal(ais) marcado(s) como no clube.`)
    } else {
      showToast(`${eligible.length} dorsal(ais) marcado(s) como entregue(s).`)
    }
  }

  const markAllBibsAtClubForRace = (raceId: string, pickupBy: string) => {
    if (!requireAdmin('gerir dorsais')) return
    const race = races.find((r) => r.id === raceId)
    const pendingBibs = registrations.filter((r) => r.race_id === raceId && r.bib_status === 'pending')
    const count = pendingBibs.length
    if (!race || count === 0) return
    const updatedRegs = pendingBibs.map((r) => ({ ...r, bib_status: 'at_club' as BibStatus, bib_pickup_by: pickupBy }))
    setRegistrations((prev) =>
      prev.map((r) =>
        r.race_id === raceId && r.bib_status === 'pending'
          ? { ...r, bib_status: 'at_club' as BibStatus, bib_pickup_by: pickupBy }
          : r
      )
    )
    void upsertRegistrations(updatedRegs)
    pushNotification({
      title: `Dorsais no clube: ${race.title}`,
      message: `Os dorsais de "${race.title}" estão no clube (levantados por ${pickupBy}) e prontos a entregar.`,
      type: 'bibs_ready',
      related_race_id: raceId,
      pinned: true,
    })
    showToast(`${count} dorsais marcados como no clube.`)
  }

  // ---------------------------------------------------------------------------
  // Treinos e eventos (apenas admin cria)
  // ---------------------------------------------------------------------------
  const createEvent = (evtInput: NewEvent): TeamEvent | null => {
    if (!requireAdmin('criar treinos e eventos')) return null
    const newEvt: TeamEvent = { ...evtInput, id: uid('evt'), created_by_name: currentUser.name, attendees: [] }
    setEvents((prev) => sortByDate([...prev, newEvt], 'time'))
    void upsertEvents([newEvt])
    showToast(`"${newEvt.title}" agendado.`)
    return newEvt
  }

  const updateEvent = (evt: TeamEvent) => {
    if (!requireAdmin('editar eventos')) return
    setEvents((prev) => sortByDate(prev.map((e) => (e.id === evt.id ? evt : e)), 'time'))
    void upsertEvents([evt])
    showToast('Evento atualizado.')
  }

  const deleteEvent = (eventId: string) => {
    if (!requireAdmin('remover eventos')) return
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
    void deleteEventById(eventId)
    showToast('Evento removido.', 'info')
  }

  const rsvpEvent = (eventId: string, status: 'going' | 'maybe' | 'not_going', note?: string) => {
    const evt = events.find((e) => e.id === eventId)
    if (!evt) return
    const updatedEvt: TeamEvent = {
      ...evt,
      attendees: [
        ...evt.attendees.filter((a) => a.athlete_id !== currentUser.id),
        { athlete_id: currentUser.id, athlete_name: currentUser.name, status, note },
      ],
    }
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvt : e)))
    void upsertEvents([updatedEvt])
    showToast(status === 'going' ? 'Presença confirmada.' : status === 'maybe' ? 'Marcado como talvez.' : 'Indicaste que não vais.')
  }

  // ---------------------------------------------------------------------------
  // Comunicados (apenas admin cria)
  // ---------------------------------------------------------------------------
  const sendNotification = (notifInput: NewNotification) => {
    if (!requireAdmin('publicar comunicados')) return
    const notif = pushNotification(notifInput)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notif.title, { body: notif.message, icon: `${import.meta.env.BASE_URL}favicon.svg` })
      } catch {
        // ignorar
      }
    }
    showToast('Comunicado publicado.')
  }

  const deleteNotification = (notifId: string) => {
    if (!requireAdmin('remover comunicados')) return
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
    void deleteNotificationById(notifId)
    showToast('Comunicado removido.', 'info')
  }

  const togglePinNotification = (notifId: string) => {
    if (!requireAdmin('fixar comunicados')) return
    const target = notifications.find((n) => n.id === notifId)
    if (!target) return
    const updated = { ...target, pinned: !target.pinned }
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? updated : n)))
    void upsertNotifications([updated])
  }

  const markNotificationRead = (notifId: string) => {
    const target = notifications.find((n) => n.id === notifId)
    if (!target || target.read_by.includes(currentUser.id)) return
    const updated = { ...target, read_by: [...target.read_by, currentUser.id] }
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? updated : n)))
    void upsertNotifications([updated])
  }

  const markAllNotificationsRead = () => {
    const updated = notifications
      .filter((n) => !n.read_by.includes(currentUser.id))
      .map((n) => ({ ...n, read_by: [...n.read_by, currentUser.id] }))
    setNotifications((prev) =>
      prev.map((n) => (n.read_by.includes(currentUser.id) ? n : { ...n, read_by: [...n.read_by, currentUser.id] }))
    )
    if (updated.length > 0) void upsertNotifications(updated)
    showToast('Comunicados marcados como lidos.', 'info')
  }

  // ---------------------------------------------------------------------------
  // Troféu de Cascais: Sincronização, Procura Bissemanal e Gestão de Dorsais
  // ---------------------------------------------------------------------------
  const pendingDorsalAthletesCount = useMemo(() => {
    const adultsPending = baseProfiles.filter(
      (p) => p.needs_admin_review || (!(p.dorsais_trofeu?.['2026/2027'] || p.dorsal_trofeu) && p.trofeu_seasons?.includes('2026/2027'))
    ).length
    const youthPending = youthAthletes.filter(
      (y) => y.needs_admin_review || (!(y.dorsais_trofeu?.['2026/2027'] || y.dorsal_trofeu) && y.trofeu_seasons?.includes('2026/2027'))
    ).length
    return adultsPending + youthPending
  }, [baseProfiles, youthAthletes])

  const syncTrofeuCascais = async (trigger: TrofeuSyncLog['trigger'] = 'manual_admin'): Promise<TrofeuSyncLog> => {
    setIsSyncingTrofeu(true)
    try {
      const result = await runTrofeuSync({
        currentRaces: races,
        currentProfiles: baseProfiles,
        currentYouthAthletes: youthAthletes,
        currentSeasons: trofeuSeasons,
        trigger,
        today: todayISO(),
        actorName: trigger === 'manual_admin' ? currentUser.name : 'Automação Troféu',
      })

      const cleanSyncProfiles = result.profiles.map((p) => ({ ...p, dependents: [] }))
      setRaces(result.races)
      setProfiles(cleanSyncProfiles)
      setYouthAthletes(result.youthAthletes)
      setTrofeuSeasons(result.seasons)
      setTrofeuSyncLogs((prev) => [result.log, ...prev].slice(0, 20))

      const createdAt = new Date().toISOString()
      const toPush: AppNotification[] = result.newNotifications.map((n) => ({
        ...n,
        id: uid('notif'),
        created_at: createdAt,
        read_by: [],
      }))
      if (toPush.length > 0) {
        setNotifications((prev) => [...toPush, ...prev])
      }

      if (isSupabaseConfigured && supabaseHydratedRef.current) {
        void Promise.all([
          upsertRaces(result.races),
          upsertProfiles(cleanSyncProfiles),
          upsertYouthAthletes(result.youthAthletes),
          upsertTrofeuSeasons(result.seasons),
          insertTrofeuSyncLog(result.log),
          toPush.length > 0 ? upsertNotifications(toPush) : Promise.resolve(),
        ])
      }

      if (trigger === 'manual_admin') {
        showToast(`Troféu sincronizado: ${result.log.summary}`)
      }
      return result.log
    } finally {
      setIsSyncingTrofeu(false)
    }
  }

  // Hidratação a partir do Supabase no arranque e sincronização automática bissemanal
  useEffect(() => {
    if (autoSyncedRef.current) return
    autoSyncedRef.current = true

    const bootstrap = async () => {
      let activeProfiles = baseProfiles
      let activeYouth = youthAthletes
      let currentRaces = races
      let currentLogs = trofeuSyncLogs

      if (isSupabaseConfigured) {
        const remote = await fetchAllFromSupabase({
          profiles: INITIAL_PROFILES,
          youthAthletes: INITIAL_YOUTH_ATHLETES,
          races: INITIAL_RACES,
          registrations: INITIAL_REGISTRATIONS,
          events: INITIAL_EVENTS,
          notifications: INITIAL_NOTIFICATIONS,
          trofeuSeasons: INITIAL_TROFEU_SEASONS,
        })
        if (remote) {
          const cleanRemoteProfiles = remote.profiles.map((p) => ({ ...p, dependents: [] }))
          setYouthAthletes(remote.youthAthletes)
          setProfiles(cleanRemoteProfiles)
          setRaces(remote.races)
          setRegistrations(remote.registrations)
          setEvents(remote.events)
          setNotifications(remote.notifications)
          setTrofeuSeasons(remote.trofeuSeasons)
          setTrofeuSyncLogs(remote.trofeuSyncLogs)
          activeProfiles = cleanRemoteProfiles
          activeYouth = remote.youthAthletes
          currentRaces = remote.races
          currentLogs = remote.trofeuSyncLogs
        }
        supabaseHydratedRef.current = true

        // Verificar sessão OAuth / Supabase Auth existente após carregar fichas atualizadas (estritamente pelo email)
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const authUser = sessionData.session?.user
          if (authUser?.email) {
            const owner = resolveEmailOwner(authUser.email, activeProfiles, activeYouth)
            if (owner && owner.authorized) {
              const provider = authUser.app_metadata?.provider === 'google' ? 'google' : 'email'
              signInAuthorizedPerson(
                owner.id,
                authUser.email,
                provider,
                authUser.id,
                undefined,
                activeProfiles,
                activeYouth
              )
            } else {
              await supabase.auth.signOut()
              setAuthenticatedUserId(null)
              showToast(
                owner
                  ? 'O login para este email ainda não foi autorizado pelo administrador na ficha do atleta.'
                  : 'Não existe nenhuma ficha de atleta com este email associado.',
                'warning'
              )
            }
          }
        } catch {
          // ignorar falha silenciosa de sessão
        } finally {
          setAuthLoading(false)
        }
      } else {
        setAuthLoading(false)
      }

      const trofeuRacesCount = currentRaces.filter((r) => r.category === 'trofeu_cascais').length
      const lastSync = currentLogs[0]?.timestamp
      if (trofeuRacesCount < 13 || isBiweeklyCheckDue(lastSync)) {
        await syncTrofeuCascais(trofeuRacesCount < 13 ? 'startup' : 'auto_biweekly')
      }
    }

    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const assignTrofeuDorsal = (personId: string, isYouth: boolean, dorsal: string, season = '2026/2027') => {
    if (!requireAdmin('atribuir dorsais do Troféu')) return
    const cleanDorsal = dorsal.trim()
    const applyPatch = <T extends { dorsal_trofeu?: string; dorsais_trofeu?: Record<string, string>; needs_admin_review?: boolean }>(
      item: T
    ): T => {
      const nextMap = { ...(item.dorsais_trofeu || {}) }
      if (cleanDorsal) nextMap[season] = cleanDorsal
      else delete nextMap[season]
      const hasAny = Object.keys(nextMap).length > 0
      return {
        ...item,
        dorsais_trofeu: hasAny ? nextMap : undefined,
        dorsal_trofeu: season === '2026/2027' ? cleanDorsal || undefined : item.dorsal_trofeu,
        needs_admin_review: !cleanDorsal && !hasAny,
      }
    }
    if (isYouth) {
      const target = youthAthletes.find((y) => y.id === personId)
      const updated = target ? applyPatch(target) : undefined
      setYouthAthletes((prev) => prev.map((y) => (y.id === personId ? applyPatch(y) : y)))
      if (updated) void upsertYouthAthletes([updated])
    } else {
      const target = baseProfiles.find((p) => p.id === personId)
      const updated = target ? applyPatch({ ...target, dependents: [] }) : undefined
      setProfiles((prev) => prev.map((p) => (p.id === personId ? applyPatch(p) : p)))
      if (updated) void upsertProfiles([updated])
    }
    // Atualizar apenas na classificação da época correspondente (cada época tem o seu dorsal)
    const nextSeasons = trofeuSeasons.map((s) =>
      s.season !== season
        ? s
        : {
            ...s,
            athlete_standings: s.athlete_standings.map((st) =>
              st.matched_profile_id === personId ? { ...st, dorsal: cleanDorsal || undefined } : st
            ),
          }
    )
    setTrofeuSeasons(nextSeasons)
    const changedSeason = nextSeasons.find((s) => s.season === season)
    if (changedSeason) void upsertTrofeuSeasons([changedSeason])
    showToast(cleanDorsal ? `Dorsal #${cleanDorsal} (${season}) associado.` : `Dorsal de ${season} removido.`)
  }

  const checkRaceDocumentsNow = async (raceId: string) => {
    const race = races.find((r) => r.id === raceId)
    if (!race) return
    const now = new Date()
    const nextCheck = computeNextBiweeklyCheck(now)
    const log = await syncTrofeuCascais('manual_admin')
    const updatedRace: Race = {
      ...race,
      last_doc_check_at: now.toISOString(),
      next_doc_check_at: race.date >= todayISO() ? nextCheck : race.next_doc_check_at,
    }
    setRaces((prev) => prev.map((r) => (r.id === raceId ? updatedRace : r)))
    void upsertRaces([updatedRace])
    if (log.new_documents_found === 0) {
      showToast(`Documentação de "${race.title}" verificada no site do Troféu (tudo atualizado).`, 'info')
    }
  }

  const resetDemoData = () => {
    setYouthAthletes(INITIAL_YOUTH_ATHLETES)
    setProfiles(INITIAL_PROFILES)
    setRaces(INITIAL_RACES)
    setRegistrations(INITIAL_REGISTRATIONS)
    setEvents(INITIAL_EVENTS)
    setNotifications(INITIAL_NOTIFICATIONS)
    setTrofeuSeasons(INITIAL_TROFEU_SEASONS)
    setTrofeuSyncLogs([])
    setCurrentUserId('ath-rui-mariano')
    setActiveRoleState('admin')
    void resetAllSupabaseData({
      profiles: INITIAL_PROFILES,
      youthAthletes: INITIAL_YOUTH_ATHLETES,
      races: INITIAL_RACES,
      registrations: INITIAL_REGISTRATIONS,
      events: INITIAL_EVENTS,
      notifications: INITIAL_NOTIFICATIONS,
      trofeuSeasons: INITIAL_TROFEU_SEASONS,
    })
    showToast('Dados limpos para o estado inicial do Troféu.', 'info')
  }

  return (
    <AppContext.Provider
      value={{
        profiles,
        youthAthletes,
        races,
        registrations,
        events,
        notifications,
        currentUser,
        isAuthenticated,
        authLoading,
        loginWithEmail,
        loginWithGoogle,
        logout,
        setAthleteLoginAuthorization,
        resetPersonLoginPassword,
        activeRole,
        isAdminView,
        unreadNotificationsCount,
        toasts,
        showToast,
        setCurrentUserById,
        setActiveRole,
        updateProfile,
        addAthleteProfile,
        removeAthleteProfile,
        setAthleteRole,
        addYouthAthlete,
        updateYouthAthlete,
        removeYouthAthlete,
        associateChildToAdult,
        disassociateChildFromAdult,
        setYouthManagementMode,
        createRace,
        updateRace,
        deleteRace,
        registerForRace,
        cancelRegistration,
        updateRegistrationByAdmin,
        confirmAllPendingForRace,
        applyToRegistrations,
        markAllBibsAtClubForRace,
        createEvent,
        updateEvent,
        deleteEvent,
        rsvpEvent,
        sendNotification,
        deleteNotification,
        togglePinNotification,
        markNotificationRead,
        markAllNotificationsRead,
        trofeuSeasons,
        trofeuSyncLogs,
        isSyncingTrofeu,
        pendingDorsalAthletesCount,
        syncTrofeuCascais,
        assignTrofeuDorsal,
        checkRaceDocumentsNow,
        resetDemoData,
        themeMode,
        setThemeMode,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
