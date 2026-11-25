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
  DirectoryEntry,
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
import { TROFEU_HISTORY_RACES } from '../data/trofeuHistory'
import { computeNextBiweeklyCheck, invokeTrofeuResultsSync, isBiweeklyCheckDue, isResultsSyncDue, runTrofeuSync } from '../services/trofeuSyncService'
import {
  deleteEventById,
  deleteNotificationById,
  deleteProfileById,
  deleteRaceById,
  deleteRegistrationById,
  deleteRegistrationsOfAthlete,
  deleteRegistrationsOfDependent,
  deleteYouthById,
  classifyError,
  describeFailure,
  fetchAllFromSupabase,
  fetchTrofeuSeasons,
  markNotificationsRead,
  runSequence,
  saveEvent,
  saveEventRsvp,
  saveNotification,
  saveProfile,
  saveRace,
  saveRegistration,
  saveRegistrationsAdmin,
  saveTrofeuSeasons,
  saveTrofeuSync,
  saveYouth,
  type DbResult,
  type HydratedSupabaseData,
} from '../services/supabaseSyncService'
import { clearTrofeuResultsCache } from '../services/trofeuResultsService'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { TRANSPORT_LABELS } from '../types'
import { computeVanAllocation, formatShortDate } from '../utils/formatters'
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
  /** Nomes de toda a equipa (vista `team_directory`); em demonstração, derivado das fichas locais */
  teamDirectory: DirectoryEntry[]
  /** Nome de qualquer pessoa da equipa (adulto ou menor), mesmo quando a ficha completa não é visível */
  personName: (id: string) => string | undefined
  /**
   * Falso para atletas em modo configurado: só recebem a própria ficha e os menores a cargo, por isso
   * datas de nascimento, NIF e afins de terceiros não existem (ex.: aniversários da equipa ficam escondidos).
   */
  canViewTeamPersonalData: boolean
  /** Sessão e Autenticação (estritamente pelo email associado na ficha e autorizado pelo admin) */
  isAuthenticated: boolean
  authLoading: boolean
  loginWithEmail: (email: string, password: string) => Promise<ActionResult>
  signUpWithEmail: (email: string, password: string) => Promise<ActionResult>
  requestPasswordReset: (email: string) => Promise<ActionResult>
  updatePassword: (password: string) => Promise<ActionResult>
  /** Verdadeiro quando o utilizador abriu a ligação de recuperação e tem de definir nova palavra-passe */
  recoveryMode: boolean
  loginWithGoogle: () => Promise<ActionResult>
  logout: () => Promise<void>
  setAthleteLoginAuthorization: (athleteId: string, authorized: boolean, emailOverride?: string) => ActionResult
  resetPersonLoginPassword: (personId: string, isYouth: boolean) => void | Promise<void>
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
  registerForRace: (input: RegisterForRaceInput, opts?: { race?: Race }) => ActionResult
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
  syncTrofeuResults: (auto?: boolean) => Promise<void>
  isSyncingTrofeuResults: boolean
  assignTrofeuDorsal: (personId: string, isYouth: boolean, dorsal: string, season?: string) => void
  checkRaceDocumentsNow: (raceId: string) => Promise<void>
  resetDemoData: () => void
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

export type RegistrationBulkAction = 'confirm' | 'bib_at_club' | 'bib_delivered'

const AppContext = createContext<AppContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// Modo configurado (Supabase): a base de dados é a fonte de verdade. O localStorage guarda só preferências
// (tema, papel ativo, onboarding) e uma cache de arranque que é apagada ao terminar a sessão.
// Modo demonstração (sem variáveis de ambiente): continua tudo em localStorage com os dados de exemplo.
// ---------------------------------------------------------------------------
const CACHE_KEY = 'urc_cache_v8'

interface DataCache {
  profiles: AthleteProfile[]
  youthAthletes: YouthAthlete[]
  races: Race[]
  registrations: RaceRegistration[]
  events: TeamEvent[]
  notifications: AppNotification[]
  trofeuSeasons: TrofeuSeasonData[]
  trofeuSyncLogs: TrofeuSyncLog[]
  directory: DirectoryEntry[]
}

const readDataCache = (): Partial<DataCache> => {
  if (!isSupabaseConfigured) return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Partial<DataCache>) : {}
  } catch {
    return {}
  }
}

const clearDataCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignorar
  }
}

/** Ficha vazia usada enquanto não há sessão/dados, para a UI nunca receber `undefined`. */
const GUEST_PROFILE: AthleteProfile = {
  id: 'guest',
  name: '',
  nickname: '',
  email: '',
  phone: '',
  role: 'athlete',
  birth_date: '',
  escalao: '',
  nif: '',
  cc_number: '',
  shirt_size: 'M',
  has_official_kit: true,
  dependents: [],
}

/** Repõe um item (ou remove-o, se não existia antes) quando a gravação no servidor falhou. */
function restoreItem<T extends { id: string }>(
  set: React.Dispatch<React.SetStateAction<T[]>>,
  id: string,
  prev: T | undefined
) {
  set((list) => {
    if (!prev) return list.filter((x) => x.id !== id)
    return list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? prev : x)) : [...list, prev]
  })
}

function restoreItems<T extends { id: string }>(set: React.Dispatch<React.SetStateAction<T[]>>, prevs: T[]) {
  for (const p of prevs) restoreItem(set, p.id, p)
}

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
  photo_url: y.photo_url,
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
  const configured = isSupabaseConfigured
  // Em modo configurado o estado inicial vem da cache de arranque (ou vazio); em demonstração, dos dados de exemplo
  const [cache] = useState<Partial<DataCache>>(readDataCache)
  const [youthAthletes, setYouthAthletes] = useState<YouthAthlete[]>(() =>
    configured ? cache.youthAthletes ?? [] : loadFromStorage(STORAGE_KEYS.YOUTH_ATHLETES, INITIAL_YOUTH_ATHLETES)
  )
  const [baseProfiles, setProfiles] = useState<AthleteProfile[]>(() =>
    configured ? cache.profiles ?? [] : loadFromStorage(STORAGE_KEYS.PROFILES, INITIAL_PROFILES)
  )
  const [races, setRaces] = useState<Race[]>(() =>
    configured ? cache.races ?? [] : loadFromStorage(STORAGE_KEYS.RACES, INITIAL_RACES)
  )
  const [registrations, setRegistrations] = useState<RaceRegistration[]>(() =>
    configured ? cache.registrations ?? [] : loadFromStorage(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS)
  )
  const [events, setEvents] = useState<TeamEvent[]>(() =>
    configured ? cache.events ?? [] : loadFromStorage(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
  )
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    configured ? cache.notifications ?? [] : loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  )
  const [directory, setDirectory] = useState<DirectoryEntry[]>(() => cache.directory ?? [])
  // A identidade vem da sessão do Supabase (nunca do localStorage) em modo configurado
  const [currentUserId, setCurrentUserId] = useState<string>(() =>
    configured ? '' : loadFromStorage(STORAGE_KEYS.CURRENT_USER_ID, 'ath-rui-mariano')
  )
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(() =>
    configured ? null : loadFromStorage<string | null>(STORAGE_KEYS.AUTHENTICATED_USER_ID, null)
  )
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [activeRole, setActiveRoleState] = useState<UserRole>(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_VIEW_ROLE, 'admin')
  )
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => (loadFromStorage<ThemeMode>(STORAGE_KEYS.THEME, 'balanced') === 'dark' ? 'dark' : 'balanced'))
  const [trofeuSeasons, setTrofeuSeasons] = useState<TrofeuSeasonData[]>(() =>
    configured ? cache.trofeuSeasons ?? INITIAL_TROFEU_SEASONS : loadFromStorage(STORAGE_KEYS.TROFEU_SEASONS, INITIAL_TROFEU_SEASONS)
  )
  const [trofeuSyncLogs, setTrofeuSyncLogs] = useState<TrofeuSyncLog[]>(() =>
    configured ? cache.trofeuSyncLogs ?? [] : loadFromStorage(STORAGE_KEYS.TROFEU_SYNC_LOGS, [])
  )
  const [isSyncingTrofeu, setIsSyncingTrofeu] = useState(false)
  const [isSyncingTrofeuResults, setIsSyncingTrofeuResults] = useState(false)
  const resultsSyncingRef = useRef(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [hydrated, setHydrated] = useState(false)
  const autoSyncedRef = useRef(false)
  const syncTrofeuResultsRef = useRef<(auto?: boolean) => Promise<void>>(async () => {})
  const supabaseHydratedRef = useRef(false)
  const authenticatedIdRef = useRef<string | null>(null)
  const sessionEndingRef = useRef(false)
  // Fila de gravações: executam por ordem (ex.: criar a prova antes da inscrição que a referencia)
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve())

  // Persistência local: em demonstração é a base de dados; em modo configurado só preferências + cache de arranque
  useEffect(() => {
    if (configured) return
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(baseProfiles))
  }, [configured, baseProfiles])
  useEffect(() => {
    if (configured) return
    localStorage.setItem(STORAGE_KEYS.YOUTH_ATHLETES, JSON.stringify(youthAthletes))
  }, [configured, youthAthletes])
  useEffect(() => {
    if (configured) return
    localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races))
  }, [configured, races])
  useEffect(() => {
    if (configured) return
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations))
  }, [configured, registrations])
  useEffect(() => {
    if (configured) return
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events))
  }, [configured, events])
  useEffect(() => {
    if (configured) return
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications))
  }, [configured, notifications])
  useEffect(() => {
    if (configured) return
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId))
  }, [configured, currentUserId])
  useEffect(() => {
    authenticatedIdRef.current = authenticatedUserId
    if (configured) return
    if (authenticatedUserId) {
      localStorage.setItem(STORAGE_KEYS.AUTHENTICATED_USER_ID, JSON.stringify(authenticatedUserId))
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTHENTICATED_USER_ID)
    }
  }, [configured, authenticatedUserId])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW_ROLE, JSON.stringify(activeRole)), [activeRole])
  useEffect(() => {
    if (configured) return
    localStorage.setItem(STORAGE_KEYS.TROFEU_SEASONS, JSON.stringify(trofeuSeasons))
  }, [configured, trofeuSeasons])
  useEffect(() => {
    if (configured) return
    localStorage.setItem(STORAGE_KEYS.TROFEU_SYNC_LOGS, JSON.stringify(trofeuSyncLogs))
  }, [configured, trofeuSyncLogs])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(themeMode))
    document.documentElement.setAttribute('data-theme', themeMode)
  }, [themeMode])
  // Cache de arranque: só depois de o servidor ter respondido e com sessão ativa
  useEffect(() => {
    if (!configured || !hydrated || !authenticatedUserId) return
    const bundle: DataCache = {
      profiles: baseProfiles,
      youthAthletes,
      races,
      registrations,
      events,
      notifications,
      trofeuSeasons,
      trofeuSyncLogs,
      directory,
    }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(bundle))
    } catch {
      // quota cheia: a cache é opcional
    }
  }, [
    configured,
    hydrated,
    authenticatedUserId,
    baseProfiles,
    youthAthletes,
    races,
    registrations,
    events,
    notifications,
    trofeuSeasons,
    trofeuSyncLogs,
    directory,
  ])

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
    return profiles[0] ?? GUEST_PROFILE
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, youthAthletes, currentUserId, authenticatedUserId])

  // Um atleta sem papel de admin nunca pode ver a vista de administração
  const isAdminView = activeRole === 'admin' && currentUser.role === 'admin'

  const canViewTeamPersonalData = !configured || currentUser.role === 'admin'

  const teamDirectory = useMemo<DirectoryEntry[]>(() => {
    if (configured) return directory
    return [
      ...baseProfiles.map((p) => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname,
        gender: p.gender,
        escalao: p.escalao,
        kind: 'adult' as const,
      })),
      ...youthAthletes.map((y) => ({
        id: y.id,
        name: y.name,
        nickname: '',
        gender: y.gender,
        escalao: y.escalao,
        kind: 'youth' as const,
      })),
    ]
  }, [configured, directory, baseProfiles, youthAthletes])

  const personName = (id: string): string | undefined =>
    baseProfiles.find((p) => p.id === id)?.name ??
    youthAthletes.find((y) => y.id === id)?.name ??
    teamDirectory.find((d) => d.id === id)?.name

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = uid('toast')
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3600)
  }

  // ---------------------------------------------------------------------------
  // Gravação no servidor: em modo configurado o Supabase decide. O estado local é aplicado de imediato,
  // mas se o servidor recusar (RLS, guarda, rede) é revertido e o utilizador é avisado.
  // ---------------------------------------------------------------------------
  /** Limpa dados pessoais e sessão local (nada do utilizador anterior fica no dispositivo). */
  const clearSessionData = () => {
    authenticatedIdRef.current = null
    supabaseHydratedRef.current = false
    setAuthenticatedUserId(null)
    setCurrentUserId('')
    setProfiles([])
    setYouthAthletes([])
    setRaces([])
    setRegistrations([])
    setEvents([])
    setNotifications([])
    setDirectory([])
    setTrofeuSyncLogs([])
    setHydrated(false)
    clearDataCache()
  }

  /** JWT expirado ou sessão inválida: termina a sessão e volta ao login. */
  const expireSession = () => {
    if (sessionEndingRef.current) return
    sessionEndingRef.current = true
    clearSessionData()
    void supabase.auth.signOut({ scope: 'local' }).finally(() => {
      sessionEndingRef.current = false
    })
    showToast('A tua sessão expirou. Entra de novo.', 'warning')
  }

  const reportFailure = (res: { kind: 'session' | 'permission' | 'network' | 'other'; message: string }) => {
    if (res.kind === 'session') expireSession()
    else showToast(describeFailure(res), 'warning')
  }

  /**
   * Grava no servidor (em série). Em demonstração não faz nada.
   * `rollback` repõe o estado local se falhar; `onSaved` recebe a linha final devolvida pelo servidor.
   */
  const persist = <T,>(op: () => Promise<DbResult<T>>, rollback: () => void, onSaved?: (data: T) => void) => {
    if (!configured) return
    const run = writeQueueRef.current.then(op, op)
    writeQueueRef.current = run.catch(() => undefined)
    void run
      .then((res) => {
        if (res.ok) {
          onSaved?.(res.data)
          return
        }
        if (authenticatedIdRef.current) rollback()
        reportFailure(res)
      })
      .catch(() => {
        if (authenticatedIdRef.current) rollback()
        showToast('Não foi possível guardar.', 'warning')
      })
  }

  /** Como `persist`, mas só corre `then` (ex.: avisar a equipa) depois de o servidor aceitar a alteração. */
  const persistThen = (op: () => Promise<DbResult<unknown>>, rollback: () => void, then: () => void) => {
    if (!configured) {
      then()
      return
    }
    persist(op, rollback, then)
  }

  const requireAdmin = (action: string): boolean => {
    if (isAdminView) return true
    showToast(`Apenas administradores podem ${action}.`, 'warning')
    return false
  }

  const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode)

  const setCurrentUserById = (id: string) => {
    if (configured) {
      // A identidade é a da sessão do Supabase: cada pessoa entra com a sua conta
      if (id !== currentUser.id) showToast('Cada pessoa entra com a sua própria conta.', 'info')
      return
    }
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
      auth_user_id: emailChanged ? undefined : target.auth_user_id,
      dependents: [],
    }
    setProfiles((prev) => prev.map((p) => (p.id === athleteId ? updatedTarget : p)))
    persist(
      () => saveProfile(updatedTarget, { create: false, asAdmin: true }),
      () => restoreItem(setProfiles, athleteId, target)
    )
    if (!authorized && authenticatedUserId === athleteId) {
      setAuthenticatedUserId(null)
    }
    const msg = authorized
      ? `${target.name} (${candidateEmail}) autorizado(a) a fazer login na aplicação.`
      : `Acesso de login de ${target.name} bloqueado.`
    showToast(msg, 'info')
    return { success: true, message: msg }
  }

  const authRedirect = () => `${window.location.origin}${import.meta.env.BASE_URL}`

  /** Envia ao atleta um email para definir (ou repor) a palavra-passe. */
  const resetPersonLoginPassword = async (personId: string, isYouth: boolean) => {
    if (!requireAdmin('repor palavra-passe de login')) return
    const target = isYouth ? youthAthletes.find((y) => y.id === personId) : baseProfiles.find((x) => x.id === personId)
    const mail = normalizeEmail(target?.login_email || target?.email)
    if (!target || !mail) {
      showToast('Esta ficha não tem email associado.', 'warning')
      return
    }
    if (!isSupabaseConfigured) {
      showToast('Indisponível em modo de demonstração.', 'info')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: authRedirect() })
    showToast(
      error ? 'Não foi possível enviar o email. Tenta mais tarde.' : `Enviámos a ${target.name} um email para definir a palavra-passe.`,
      error ? 'warning' : 'info'
    )
  }

  /** Aplica no estado os dados que o servidor devolveu (as políticas RLS já filtraram por papel). */
  const applyRemote = (remote: HydratedSupabaseData) => {
    const cleanProfiles = remote.profiles.map((p) => ({ ...p, dependents: [] }))
    setYouthAthletes(remote.youthAthletes)
    setProfiles(cleanProfiles)
    setRaces(remote.races)
    setRegistrations(remote.registrations)
    setEvents(remote.events)
    setNotifications(remote.notifications)
    setDirectory(remote.directory)
    // Sem épocas na base de dados usam-se as de referência (dados públicos do Troféu), só em memória
    setTrofeuSeasons(remote.trofeuSeasons.length > 0 ? remote.trofeuSeasons : INITIAL_TROFEU_SEASONS)
    setTrofeuSyncLogs(remote.trofeuSyncLogs)
    supabaseHydratedRef.current = true
    setHydrated(true)
    return { ...remote, profiles: cleanProfiles }
  }

  /** Depois de iniciar sessão: liga a conta à ficha (só emails autorizados pelo admin) e carrega os dados. */
  const establishSession = async (): Promise<ActionResult & { isAdmin?: boolean; races?: Race[]; logs?: TrofeuSyncLog[] }> => {
    const { data } = await supabase.auth.getSession()
    if (!data.session?.user) {
      clearSessionData()
      return { success: false, message: '' }
    }
    const { data: personId, error } = await supabase.rpc('claim_profile')
    if (error) {
      const kind = classifyError(error, (error as { status?: number }).status)
      if (kind === 'session') {
        await supabase.auth.signOut({ scope: 'local' })
        clearSessionData()
        return { success: false, message: 'A tua sessão expirou. Entra de novo.' }
      }
      if (kind === 'network') {
        // Sem rede não se sabe se o email está autorizado: não termina a sessão
        return { success: false, message: 'Sem ligação. Tenta novamente quando tiveres rede.' }
      }
    }
    if (error || !personId) {
      await supabase.auth.signOut()
      clearSessionData()
      return {
        success: false,
        message: 'Este email não está autorizado. Pede ao administrador para o associar e autorizar na tua ficha.',
      }
    }
    const res = await fetchAllFromSupabase()
    let remote: ReturnType<typeof applyRemote> | null = null
    if (res.ok) {
      remote = applyRemote(res.data)
    } else if (res.kind === 'session') {
      await supabase.auth.signOut({ scope: 'local' })
      clearSessionData()
      return { success: false, message: 'A tua sessão expirou. Entra de novo.' }
    } else {
      showToast('Não foi possível carregar os dados mais recentes.', 'warning')
    }
    const adult = (remote?.profiles ?? baseProfiles).find((x) => x.id === personId)
    sessionEndingRef.current = false
    setCurrentUserId(personId as string)
    setAuthenticatedUserId(personId as string)
    authenticatedIdRef.current = personId as string
    setActiveRoleState(adult?.role === 'admin' ? 'admin' : 'athlete')
    return {
      success: true,
      message: 'Sessão iniciada.',
      isAdmin: adult?.role === 'admin',
      races: remote?.races,
      logs: remote?.trofeuSyncLogs,
    }
  }
  const authErrorMessage = (message: string): string => {
    const m = message.toLowerCase()
    if (m.includes('invalid login')) return 'Email ou palavra-passe incorretos. Se é o teu primeiro acesso, cria a conta.'
    if (m.includes('not confirmed')) return 'Confirma primeiro o email (verifica a caixa de correio).'
    if (m.includes('database error') || m.includes('não foi autorizado')) return 'Este email não foi autorizado pelo administrador.'
    if (m.includes('already registered')) return 'Já existe uma conta com este email. Entra com a palavra-passe.'
    if (m.includes('rate limit')) return 'Demasiadas tentativas. Tenta daqui a alguns minutos.'
    return message
  }

  const loginWithEmail = async (email: string, password: string): Promise<ActionResult> => {
    const cleanEmail = normalizeEmail(email)
    if (!cleanEmail.includes('@')) return { success: false, message: 'Indica um endereço de email válido.' }
    if (!isSupabaseConfigured) return { success: false, message: 'Ligação à base de dados indisponível.' }
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) return { success: false, message: authErrorMessage(error.message) }
    const res = await establishSession()
    if (res.success) showToast('Sessão iniciada.')
    return res
  }

  /** Primeiro acesso por email: só funciona se o admin autorizou este email. */
  const signUpWithEmail = async (email: string, password: string): Promise<ActionResult> => {
    const cleanEmail = normalizeEmail(email)
    if (!cleanEmail.includes('@')) return { success: false, message: 'Indica um endereço de email válido.' }
    if (password.length < 8) return { success: false, message: 'A palavra-passe deve ter pelo menos 8 caracteres.' }
    if (!isSupabaseConfigured) return { success: false, message: 'Ligação à base de dados indisponível.' }
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { emailRedirectTo: authRedirect() },
    })
    if (error) return { success: false, message: authErrorMessage(error.message) }
    if (data.session) return establishSession()
    return { success: true, message: 'Enviámos um email de confirmação. Abre a ligação e depois entra aqui.' }
  }

  const requestPasswordReset = async (email: string): Promise<ActionResult> => {
    const cleanEmail = normalizeEmail(email)
    if (!cleanEmail.includes('@')) return { success: false, message: 'Indica um endereço de email válido.' }
    if (!isSupabaseConfigured) return { success: false, message: 'Ligação à base de dados indisponível.' }
    await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: authRedirect() })
    // Resposta igual quer o email exista ou não, para não revelar quem é da equipa
    return { success: true, message: 'Se o email estiver autorizado, enviámos uma ligação para definir a palavra-passe.' }
  }

  const updatePassword = async (password: string): Promise<ActionResult> => {
    if (password.length < 8) return { success: false, message: 'A palavra-passe deve ter pelo menos 8 caracteres.' }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { success: false, message: authErrorMessage(error.message) }
    setRecoveryMode(false)
    const res = await establishSession()
    return res.success ? { success: true, message: 'Palavra-passe atualizada.' } : res
  }

  const loginWithGoogle = async (): Promise<ActionResult> => {
    if (!isSupabaseConfigured) return { success: false, message: 'Ligação à base de dados indisponível.' }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirect(), queryParams: { prompt: 'select_account' } },
    })
    if (error || !data?.url) {
      return { success: false, message: 'O login com Google ainda não está ativo. Usa o email e a palavra-passe.' }
    }
    return { success: true, message: 'A redirecionar para o Google…' }
  }

  const logout = async () => {
    if (isSupabaseConfigured) {
      sessionEndingRef.current = true
      clearSessionData()
      await supabase.auth.signOut()
      sessionEndingRef.current = false
    } else {
      setAuthenticatedUserId(null)
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
    // Em modo configurado só um administrador publica comunicados (a base de dados recusa os restantes;
    // avisos automáticos de atletas, como "cancelou a inscrição", precisam de uma função no servidor)
    if (configured && currentUser.role !== 'admin') return notif
    setNotifications((prev) => [notif, ...prev])
    persist(
      () => saveNotification(notif, { create: true }),
      () => setNotifications((prev) => prev.filter((x) => x.id !== notif.id))
    )
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
        photo_url: updated.photo_url,
        dorsal_trofeu: updated.dorsal_trofeu,
        needs_admin_review: updated.dorsal_trofeu ? false : minorOrig.needs_admin_review,
      }
      setYouthAthletes((prev) => prev.map((y) => (y.id === minorOrig.id ? updatedYouth : y)))
      persist(
        () => saveYouth(updatedYouth, { create: false, asAdmin: currentUser.role === 'admin' }),
        () => restoreItem(setYouthAthletes, minorOrig.id, minorOrig)
      )
      showToast(isSelf ? 'Perfil atualizado.' : `Ficha de ${updated.name} atualizada.`)
      return
    }

    // Um atleta não pode promover-se a admin
    const original = baseProfiles.find((p) => p.id === updated.id)
    const safe = !isAdminView && original ? { ...updated, role: original.role } : updated
    const cleanProfile = { ...safe, dependents: [] }
    setProfiles((prev) => prev.map((p) => (p.id === safe.id ? cleanProfile : p)))
    persist(
      () => saveProfile(cleanProfile, { create: false, asAdmin: currentUser.role === 'admin' }),
      () => restoreItem(setProfiles, safe.id, original)
    )
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
    persist(
      () => saveProfile(updatedTarget, { create: false, asAdmin: true }),
      () => restoreItem(setProfiles, athleteId, target)
    )
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
    persist(
      () => saveProfile(newProfile, { create: true, asAdmin: true }),
      () => setProfiles((prev) => prev.filter((x) => x.id !== newProfile.id))
    )
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
    const removedRegs = registrations.filter((r) => r.athlete_id === id)
    const prevYouth = youthAthletes.filter((c) => c.associated_adult_ids.includes(id))
    setRegistrations((prev) => prev.filter((r) => r.athlete_id !== id))
    persist(
      () =>
        runSequence([
          () => deleteRegistrationsOfAthlete(id),
          ...affectedYouth.map((c) => () => saveYouth(c, { create: false, asAdmin: true })),
          () => deleteProfileById(id),
        ]),
      () => {
        if (p) restoreItem(setProfiles, id, p)
        restoreItems(setYouthAthletes, prevYouth)
        setRegistrations((prev) => [...prev, ...removedRegs.filter((r) => !prev.some((x) => x.id === r.id))])
      }
    )
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
    persist(
      () => saveYouth(newChild, { create: true, asAdmin: currentUser.role === 'admin' }),
      () => setYouthAthletes((prev) => prev.filter((x) => x.id !== newChild.id))
    )
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
    persist(
      () => saveYouth(safeChild, { create: false, asAdmin: currentUser.role === 'admin' }),
      () => restoreItem(setYouthAthletes, safeChild.id, original)
    )
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
      auth_user_id: emailChanged ? undefined : child.auth_user_id,
    }
    setYouthAthletes((prev) =>
      prev.map((c) => (c.id === childId ? updatedChild : c))
    )
    persist(
      () => saveYouth(updatedChild, { create: false, asAdmin: true }),
      () => restoreItem(setYouthAthletes, childId, child)
    )
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
    const removedRegs = registrations.filter((r) => r.dependent_id === childId)
    setRegistrations((prev) => prev.filter((r) => r.dependent_id !== childId))
    persist(
      () => runSequence([() => deleteRegistrationsOfDependent(childId), () => deleteYouthById(childId)]),
      () => {
        restoreItem(setYouthAthletes, childId, child)
        setRegistrations((prev) => [...prev, ...removedRegs.filter((r) => !prev.some((x) => x.id === r.id))])
      }
    )
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
    persist(
      () => saveYouth(updatedChild, { create: false, asAdmin: currentUser.role === 'admin' }),
      () => restoreItem(setYouthAthletes, childId, child)
    )
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
    persist(
      () => saveYouth(updatedChild, { create: false, asAdmin: currentUser.role === 'admin' }),
      () => restoreItem(setYouthAthletes, childId, child)
    )
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
    persist(
      () => saveRace(newRace, { create: true }),
      () => setRaces((prev) => prev.filter((x) => x.id !== newRace.id))
    )

    const suggested = category === 'individual'
    pushNotification({
      title: suggested ? `Prova sugerida por ${currentUser.name}: ${newRace.title}` : `Inscrições abertas: ${newRace.title}`,
      message: suggested
        ? `${currentUser.name} sugeriu "${newRace.title}" (${formatShortDate(newRace.date)}, ${newRace.location}). Inscrição individual — marca presença na app para irmos juntos.`
        : `Já te podes inscrever em "${newRace.title}" (${formatShortDate(newRace.date)}, ${newRace.location}).${
            newRace.van_available ? ` Há ${newRace.van_capacity} ${newRace.van_capacity === 1 ? 'vaga' : 'vagas'} de transporte.` : ''
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
    const prevRace = races.find((r) => r.id === updated.id)
    setRaces((prev) => sortByDate(prev.map((r) => (r.id === updated.id ? updated : r)), 'start_time'))
    persist(
      () => saveRace(updated, { create: false }),
      () => restoreItem(setRaces, updated.id, prevRace)
    )
    showToast('Prova atualizada.')
  }

  const deleteRace = (raceId: string) => {
    const race = races.find((r) => r.id === raceId)
    if (!race) return
    if (!isAdminView && race.created_by !== currentUser.id) {
      showToast('Só o autor ou um admin pode remover esta prova.', 'warning')
      return
    }
    const prevRegs = registrations.filter((reg) => reg.race_id === raceId)
    const prevNotifs = notifications.filter((n) => n.related_race_id === raceId)
    setRaces((prev) => prev.filter((r) => r.id !== raceId))
    setRegistrations((prev) => prev.filter((reg) => reg.race_id !== raceId))
    setNotifications((prev) => prev.map((n) => (n.related_race_id === raceId ? { ...n, related_race_id: undefined } : n)))
    // Em modo configurado o servidor apaga as inscrições (cascade) e desliga os comunicados (set null)
    persist(
      () => deleteRaceById(raceId),
      () => {
        restoreItem(setRaces, raceId, race)
        setRegistrations((prev) => [...prev, ...prevRegs.filter((r) => !prev.some((x) => x.id === r.id))])
        restoreItems(setNotifications, prevNotifs)
      }
    )
    showToast('Prova removida.', 'info')
  }

  /** Atletas só mexem em inscrições antes da prova e (fora das sugeridas) antes do prazo; o admin pode sempre. */
  const registrationOpenFor = (race: Race) => {
    if (isAdminView) return true
    const todayLocal = todayISO()
    if (race.date < todayLocal) return false
    return !(race.category !== 'individual' && race.registration_deadline && race.registration_deadline < todayLocal)
  }

  const registerForRace = (input: RegisterForRaceInput, opts?: { race?: Race }): ActionResult => {
    // `opts.race`: prova acabada de criar, que ainda não está na lista deste render
    const race = opts?.race ?? races.find((r) => r.id === input.race_id)
    if (!race) {
      showToast('Prova não encontrada. Tenta inscrever-te a partir da página da prova.', 'warning')
      return { success: false, message: 'Prova não encontrada.' }
    }

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
    // Em modo configurado os dorsais são geridos pelo administrador (a base de dados recusa-os a atletas)
    const canSetBib = !configured || currentUser.role === 'admin'
    const trofeuDorsal =
      canSetBib && race.category === 'trofeu_cascais'
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
      persist(
        () => saveRegistration(updatedReg, { create: false, asAdmin: currentUser.role === 'admin' }),
        () => restoreItem(setRegistrations, existing.id, existing),
        (saved) => setRegistrations((prev) => prev.map((reg) => (reg.id === saved.id ? saved : reg)))
      )
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
    persist(
      () => saveRegistration(newReg, { create: true, asAdmin: currentUser.role === 'admin' }),
      () => setRegistrations((prev) => prev.filter((x) => x.id !== newReg.id)),
      // o servidor pode acertar campos (ex.: hora do pedido de lugar na carrinha): fica a versão guardada
      (saved) => setRegistrations((prev) => prev.map((reg) => (reg.id === saved.id ? saved : reg)))
    )
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
    if (configured && currentUser.role !== 'admin') {
      // Só o admin apaga linhas: o atleta cancela marcando a inscrição como cancelada (as listas ignoram-nas)
      const cancelled: RaceRegistration = { ...reg, status: 'cancelled' }
      setRegistrations((prev) => prev.map((r) => (r.id === regId ? cancelled : r)))
      persist(
        () => saveRegistration(cancelled, { create: false, asAdmin: false }),
        () => restoreItem(setRegistrations, regId, reg)
      )
    } else {
      setRegistrations((prev) => prev.filter((r) => r.id !== regId))
      persist(
        () => deleteRegistrationById(regId),
        () => restoreItem(setRegistrations, regId, reg)
      )
    }
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
    persist(
      () => saveRegistrationsAdmin([updated]),
      () => restoreItem(setRegistrations, regId, target)
    )
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
    persistThen(
      () => saveRegistrationsAdmin(updatedRegs),
      () => restoreItems(setRegistrations, pendingRegs),
      () =>
        pushNotification({
          title: `Inscrições efetuadas: ${race.title}`,
          message: `O clube confirmou a inscrição de ${count} atleta(s) em "${race.title}".`,
          type: 'race_open',
          related_race_id: raceId,
        })
    )
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
    const names = eligible.map((r) => r.athlete_name).join(', ')
    const notice =
      action === 'confirm'
        ? () =>
            pushNotification({
              title: `Inscrições efetuadas: ${race.title}`,
              message: `O clube confirmou a inscrição de ${names} em "${race.title}".`,
              type: 'race_open',
              related_race_id: raceId,
            })
        : action === 'bib_at_club'
        ? () =>
            pushNotification({
              title: `Dorsais no clube: ${race.title}`,
              message: `Os dorsais de ${names} em "${race.title}" estão no clube (levantados por ${currentUser.name}) e prontos a entregar.`,
              type: 'bibs_ready',
              related_race_id: raceId,
            })
        : () => undefined
    persistThen(
      () => saveRegistrationsAdmin(updatedRegs),
      () => restoreItems(setRegistrations, eligible),
      notice
    )
    if (action === 'confirm') {
      showToast(`${eligible.length} inscrição(ões) confirmada(s).`)
    } else if (action === 'bib_at_club') {
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
    persistThen(
      () => saveRegistrationsAdmin(updatedRegs),
      () => restoreItems(setRegistrations, pendingBibs),
      () =>
        pushNotification({
          title: `Dorsais no clube: ${race.title}`,
          message: `Os dorsais de "${race.title}" estão no clube (levantados por ${pickupBy}) e prontos a entregar.`,
          type: 'bibs_ready',
          related_race_id: raceId,
          pinned: true,
        })
    )
    showToast(`${count} dorsais marcados como no clube.`)
  }

  // ---------------------------------------------------------------------------
  // Treinos e eventos (apenas admin cria)
  // ---------------------------------------------------------------------------
  const createEvent = (evtInput: NewEvent): TeamEvent | null => {
    if (!requireAdmin('criar treinos e eventos')) return null
    const newEvt: TeamEvent = { ...evtInput, id: uid('evt'), created_by_name: currentUser.name, attendees: [] }
    setEvents((prev) => sortByDate([...prev, newEvt], 'time'))
    persist(
      () => saveEvent(newEvt, { create: true }),
      () => setEvents((prev) => prev.filter((x) => x.id !== newEvt.id))
    )
    showToast(`"${newEvt.title}" agendado.`)
    return newEvt
  }

  const updateEvent = (evt: TeamEvent) => {
    if (!requireAdmin('editar eventos')) return
    const prevEvt = events.find((e) => e.id === evt.id)
    setEvents((prev) => sortByDate(prev.map((e) => (e.id === evt.id ? evt : e)), 'time'))
    persist(
      () => saveEvent(evt, { create: false }),
      () => restoreItem(setEvents, evt.id, prevEvt)
    )
    showToast('Evento atualizado.')
  }

  const deleteEvent = (eventId: string) => {
    if (!requireAdmin('remover eventos')) return
    const prevEvt = events.find((e) => e.id === eventId)
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
    persist(
      () => deleteEventById(eventId),
      () => {
        if (prevEvt) restoreItem(setEvents, eventId, prevEvt)
      }
    )
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
    const entry = { athlete_id: currentUser.id, athlete_name: currentUser.name, status, note }
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvt : e)))
    // Em modo configurado junta a minha presença às que já estão no servidor (não apaga as dos outros)
    persist(
      () => saveEventRsvp(eventId, entry),
      () => restoreItem(setEvents, eventId, evt),
      (attendees) => setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, attendees } : e)))
    )
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
    const prevNotif = notifications.find((n) => n.id === notifId)
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
    persist(
      () => deleteNotificationById(notifId),
      () => {
        if (prevNotif) restoreItem(setNotifications, notifId, prevNotif)
      }
    )
    showToast('Comunicado removido.', 'info')
  }

  const togglePinNotification = (notifId: string) => {
    if (!requireAdmin('fixar comunicados')) return
    const target = notifications.find((n) => n.id === notifId)
    if (!target) return
    const updated = { ...target, pinned: !target.pinned }
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? updated : n)))
    persist(
      () => saveNotification(updated, { create: false }),
      () => restoreItem(setNotifications, notifId, target)
    )
  }

  const markNotificationRead = (notifId: string) => {
    const target = notifications.find((n) => n.id === notifId)
    if (!target || target.read_by.includes(currentUser.id)) return
    const updated = { ...target, read_by: [...target.read_by, currentUser.id] }
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? updated : n)))
    persist(
      () => markNotificationsRead([notifId], currentUser.id),
      () => restoreItem(setNotifications, notifId, target)
    )
  }

  const markAllNotificationsRead = () => {
    const updated = notifications
      .filter((n) => !n.read_by.includes(currentUser.id))
      .map((n) => ({ ...n, read_by: [...n.read_by, currentUser.id] }))
    setNotifications((prev) =>
      prev.map((n) => (n.read_by.includes(currentUser.id) ? n : { ...n, read_by: [...n.read_by, currentUser.id] }))
    )
    if (updated.length > 0) {
      const before = notifications.filter((n) => !n.read_by.includes(currentUser.id))
      persist(
        () => markNotificationsRead(updated.map((n) => n.id), currentUser.id),
        () => restoreItems(setNotifications, before)
      )
    }
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
        // Sincronização do Troféu é só do admin; se o servidor recusar, volta ao que lá está guardado
        const prev = { races, profiles: baseProfiles, youth: youthAthletes, seasons: trofeuSeasons, logs: trofeuSyncLogs }
        persist(
          () =>
            saveTrofeuSync({
              races: result.races,
              profiles: cleanSyncProfiles,
              youthAthletes: result.youthAthletes,
              seasons: result.seasons,
              log: result.log,
              notifications: toPush,
            }),
          () => {
            setRaces(prev.races)
            setProfiles(prev.profiles)
            setYouthAthletes(prev.youth)
            setTrofeuSeasons(prev.seasons)
            setTrofeuSyncLogs(prev.logs)
            setNotifications((p) => p.filter((n) => !toPush.some((x) => x.id === n.id)))
          }
        )
      }

      if (trigger === 'manual_admin') {
        showToast(`Troféu sincronizado: ${result.log.summary}`)
      }
      return result.log
    } finally {
      setIsSyncingTrofeu(false)
    }
  }

  /** Lê as classificações oficiais (Edge Function) e volta a carregar as épocas. Só admin e só com Supabase. */
  const syncTrofeuResults = async (auto = false): Promise<void> => {
    if (!isSupabaseConfigured || (!auto && !isAdminView) || resultsSyncingRef.current) return
    resultsSyncingRef.current = true
    setIsSyncingTrofeuResults(true)
    try {
      const season = (trofeuSeasons.find((s) => s.status === 'open') ?? trofeuSeasons[0])?.season ?? '2026/2027'
      const outcome = await invokeTrofeuResultsSync(season)
      if (outcome.kind === 'ok') {
        clearTrofeuResultsCache()
        const fresh = await fetchTrofeuSeasons()
        if (fresh && fresh.length > 0) setTrofeuSeasons(fresh)
        const n = outcome.data.athletes_updated
        const extra = outcome.data.unmatched.length > 0 ? ` (${outcome.data.unmatched.length} sem ficha)` : ''
        showToast(`Classificações atualizadas: ${n} ${n === 1 ? 'atleta' : 'atletas'}${extra}`)
      } else if (outcome.kind === 'unavailable') {
        if (!auto) showToast('A atualização automática ainda não está disponível.', 'info')
      } else if (!auto) {
        showToast(outcome.message || 'Não foi possível atualizar as classificações. Tenta mais tarde.', 'warning')
      }
    } finally {
      resultsSyncingRef.current = false
      setIsSyncingTrofeuResults(false)
    }
  }

  syncTrofeuResultsRef.current = syncTrofeuResults

  // Ligação de recuperação de palavra-passe (email) e fim de sessão noutro separador
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (event === 'SIGNED_OUT' && !sessionEndingRef.current && authenticatedIdRef.current) {
        // A sessão terminou por outro motivo (renovação falhou, outro separador): volta ao login
        setTimeout(expireSession, 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Hidratação a partir do Supabase no arranque e sincronização automática bissemanal
  useEffect(() => {
    if (autoSyncedRef.current) return
    autoSyncedRef.current = true

    const bootstrap = async () => {
      let currentRaces = races
      let currentLogs = trofeuSyncLogs
      let isAdminUser = false
      if (isSupabaseConfigured) {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search)
        if (params.get('error_description')) {
          showToast('Este email não foi autorizado pelo administrador.', 'warning')
          window.history.replaceState(null, '', window.location.pathname)
        }
        const res = await establishSession()
        if (!res.success && res.message) showToast(res.message, 'warning')
        isAdminUser = Boolean(res.isAdmin)
        currentRaces = res.races ?? currentRaces
        currentLogs = res.logs ?? currentLogs
        setAuthLoading(false)
      } else {
        // Modo de demonstração (sem Supabase): dados de exemplo locais e administrador de exemplo
        setCurrentUserId('ath-admin')
        setAuthenticatedUserId('ath-admin')
        setActiveRoleState('admin')
        isAdminUser = true
        setAuthLoading(false)
      }

      // Decide antes da sincronização de documentos, que renova last_synced_at
      let resultsDue = false
      if (isSupabaseConfigured && isAdminUser) {
        const seasonsNow = await fetchTrofeuSeasons()
        const open = seasonsNow?.find((x) => x.status === 'open')
        resultsDue = isResultsSyncDue(open, todayISO())
      }

      const trofeuRacesCount = currentRaces.filter((r) => r.category === 'trofeu_cascais').length
      const lastSync = currentLogs[0]?.timestamp
      if (isAdminUser && (trofeuRacesCount < 13 || isBiweeklyCheckDue(lastSync))) {
        await syncTrofeuCascais(trofeuRacesCount < 13 ? 'startup' : 'auto_biweekly')
      }
      // Sem bloquear a interface: uma única tentativa por arranque
      if (resultsDue) void syncTrofeuResultsRef.current(true)
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
      if (updated) {
        persist(
          () => saveYouth(updated, { create: false, asAdmin: true }),
          () => restoreItem(setYouthAthletes, personId, target)
        )
      }
    } else {
      const target = baseProfiles.find((p) => p.id === personId)
      const updated = target ? applyPatch({ ...target, dependents: [] }) : undefined
      setProfiles((prev) => prev.map((p) => (p.id === personId ? applyPatch(p) : p)))
      if (updated) {
        persist(
          () => saveProfile(updated, { create: false, asAdmin: true }),
          () => restoreItem(setProfiles, personId, target)
        )
      }
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
    if (changedSeason) {
      const prevSeasons = trofeuSeasons
      persist(
        () => saveTrofeuSeasons([changedSeason]),
        () => setTrofeuSeasons(prevSeasons)
      )
    }
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
    persist(
      () => saveRace(updatedRace, { create: false }),
      () => restoreItem(setRaces, raceId, race)
    )
    if (log.new_documents_found === 0) {
      showToast(`Documentação de "${race.title}" verificada no site do Troféu (tudo atualizado).`, 'info')
    }
  }

  const resetDemoData = () => {
    if (configured) {
      // Nunca apaga a base de dados real a partir da app
      showToast('Indisponível: a app está ligada à base de dados da equipa.', 'warning')
      return
    }
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
    showToast('Dados limpos para o estado inicial do Troféu.', 'info')
  }

  /** Provas da base de dados + histórico do calendário oficial do Troféu (só leitura, sem duplicar o que já existe). */
  const racesWithHistory = useMemo(() => {
    const known = new Set(races.map((r) => r.trofeu_competition_id).filter(Boolean))
    return [...races, ...TROFEU_HISTORY_RACES.filter((h) => !races.some((r) => r.id === h.id) && !known.has(h.trofeu_competition_id))]
  }, [races])

  return (
    <AppContext.Provider
      value={{
        profiles,
        youthAthletes,
        races: racesWithHistory,
        registrations,
        events,
        notifications,
        currentUser,
        teamDirectory,
        personName,
        canViewTeamPersonalData,
        isAuthenticated,
        authLoading,
        loginWithEmail,
        signUpWithEmail,
        requestPasswordReset,
        updatePassword,
        recoveryMode,
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
        syncTrofeuResults,
        isSyncingTrofeuResults,
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
