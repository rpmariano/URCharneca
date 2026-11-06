import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
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
} from '../types'
import {
  INITIAL_PROFILES,
  INITIAL_YOUTH_ATHLETES,
  INITIAL_RACES,
  INITIAL_REGISTRATIONS,
  INITIAL_EVENTS,
  INITIAL_NOTIFICATIONS,
} from '../data/seedData'

/** v4: provas abertas a crianças, eventos do tipo reunião, nomes de crianças normalizados */
const STORAGE_KEYS = {
  PROFILES: 'urc_profiles_v4',
  YOUTH_ATHLETES: 'urc_youth_athletes_v4',
  RACES: 'urc_races_v4',
  REGISTRATIONS: 'urc_registrations_v4',
  EVENTS: 'urc_events_v4',
  NOTIFICATIONS: 'urc_notifications_v4',
  CURRENT_USER_ID: 'urc_current_user_id_v4',
  ACTIVE_VIEW_ROLE: 'urc_active_view_role_v4',
  THEME: 'urc_theme_mode',
}

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
  carpool_seats?: number
  notes?: string
}

export interface ActionResult {
  success: boolean
  message: string
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
  // Crianças
  /** Cria um perfil infantil. Por omissão fica associado ao utilizador atual. */
  addYouthAthlete: (child: NewChild, adultIds?: string[]) => YouthAthlete
  updateYouthAthlete: (child: YouthAthlete) => void
  removeYouthAthlete: (childId: string) => void
  associateChildToAdult: (childId: string, adultId: string) => ActionResult
  disassociateChildFromAdult: (childId: string, adultId: string) => void
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
  resetDemoData: () => void
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

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
  const [activeRole, setActiveRoleState] = useState<UserRole>(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_VIEW_ROLE, 'admin')
  )
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => (loadFromStorage<ThemeMode>(STORAGE_KEYS.THEME, 'balanced') === 'dark' ? 'dark' : 'balanced'))
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Persistência local
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(baseProfiles)), [baseProfiles])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.YOUTH_ATHLETES, JSON.stringify(youthAthletes)), [youthAthletes])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races)), [races])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations)), [registrations])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events)), [events])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications)), [notifications])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId)), [currentUserId])
  useEffect(() => localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW_ROLE, JSON.stringify(activeRole)), [activeRole])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(themeMode))
    document.documentElement.setAttribute('data-theme', themeMode)
  }, [themeMode])

  const profiles = useMemo(() => withDependents(baseProfiles, youthAthletes), [baseProfiles, youthAthletes])

  const currentUser = useMemo(
    () => profiles.find((p) => p.id === currentUserId) || profiles[0],
    [profiles, currentUserId]
  )

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
    if (!target) return
    setCurrentUserId(id)
    setActiveRoleState(target.role)
    showToast(`Sessão: ${target.name} (${target.role === 'admin' ? 'Administrador' : 'Atleta'})`, 'info')
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
    return notif
  }

  // ---------------------------------------------------------------------------
  // Atletas
  // ---------------------------------------------------------------------------
  const updateProfile = (updated: AthleteProfile) => {
    const isSelf = updated.id === currentUser.id
    if (!isSelf && !requireAdmin('editar outros atletas')) return
    // Um atleta não pode promover-se a admin
    const original = baseProfiles.find((p) => p.id === updated.id)
    const safe = !isAdminView && original ? { ...updated, role: original.role } : updated
    setProfiles((prev) => prev.map((p) => (p.id === safe.id ? { ...safe, dependents: [] } : p)))
    showToast(isSelf ? 'Perfil atualizado.' : `Ficha de ${updated.name} atualizada.`)
  }

  const addAthleteProfile = (profile: Omit<AthleteProfile, 'id' | 'dependents'>) => {
    if (!requireAdmin('criar atletas')) return null
    const newProfile: AthleteProfile = { ...profile, id: uid('ath'), dependents: [] }
    setProfiles((prev) => [...prev, newProfile])
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
    setProfiles((prev) => prev.filter((x) => x.id !== id))
    setYouthAthletes((prev) =>
      prev.map((c) => ({ ...c, associated_adult_ids: c.associated_adult_ids.filter((a) => a !== id) }))
    )
    setRegistrations((prev) => prev.filter((r) => r.athlete_id !== id))
    showToast(`${p?.name || 'Atleta'} removido(a) da equipa.`, 'info')
  }

  // ---------------------------------------------------------------------------
  // Crianças (máximo 2 adultos responsáveis)
  // ---------------------------------------------------------------------------
  const addYouthAthlete = (childInput: NewChild, adultIds?: string[]): YouthAthlete => {
    const newChild: YouthAthlete = {
      ...childInput,
      id: uid('dep'),
      associated_adult_ids: (adultIds ?? [currentUser.id]).slice(0, 2),
    }
    setYouthAthletes((prev) => [...prev, newChild])
    showToast(`Perfil de ${newChild.name} criado.`)
    return newChild
  }

  const canManageChild = (child: YouthAthlete) => isAdminView || child.associated_adult_ids.includes(currentUser.id)

  const updateYouthAthlete = (updatedChild: YouthAthlete) => {
    const original = youthAthletes.find((c) => c.id === updatedChild.id)
    if (!original || !canManageChild(original)) {
      showToast('Só os responsáveis ou um admin podem editar esta criança.', 'warning')
      return
    }
    setYouthAthletes((prev) => prev.map((c) => (c.id === updatedChild.id ? updatedChild : c)))
    showToast(`Ficha de ${updatedChild.name} atualizada.`)
  }

  const removeYouthAthlete = (childId: string) => {
    const child = youthAthletes.find((c) => c.id === childId)
    if (!child || !canManageChild(child)) return
    setYouthAthletes((prev) => prev.filter((c) => c.id !== childId))
    setRegistrations((prev) => prev.filter((r) => r.dependent_id !== childId))
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
    setYouthAthletes((prev) =>
      prev.map((c) => (c.id === childId ? { ...c, associated_adult_ids: [...c.associated_adult_ids, adultId] } : c))
    )
    showToast(`${child.name} associada com sucesso.`)
    return { success: true, message: 'Criança associada.' }
  }

  const disassociateChildFromAdult = (childId: string, adultId: string) => {
    const child = youthAthletes.find((c) => c.id === childId)
    setYouthAthletes((prev) =>
      prev.map((c) =>
        c.id === childId ? { ...c, associated_adult_ids: c.associated_adult_ids.filter((id) => id !== adultId) } : c
      )
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
    showToast('Prova atualizada.')
  }

  const deleteRace = (raceId: string) => {
    const race = races.find((r) => r.id === raceId)
    if (!race) return
    if (!isAdminView && race.created_by !== currentUser.id) {
      showToast('Só o autor ou um admin pode remover esta prova.', 'warning')
      return
    }
    setRaces((prev) => prev.filter((r) => r.id !== raceId))
    setRegistrations((prev) => prev.filter((reg) => reg.race_id !== raceId))
    setNotifications((prev) => prev.map((n) => (n.related_race_id === raceId ? { ...n, related_race_id: undefined } : n)))
    showToast('Prova removida.', 'info')
  }

  const registerForRace = (input: RegisterForRaceInput): ActionResult => {
    const race = races.find((r) => r.id === input.race_id)
    if (!race) return { success: false, message: 'Prova não encontrada.' }

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

    // Uma criança só tem uma inscrição por prova, seja qual for o responsável que a fez
    const existing = registrations.find((reg) => {
      if (reg.race_id !== input.race_id) return false
      return input.is_dependent
        ? reg.is_dependent && reg.dependent_id === input.dependent_id
        : !reg.is_dependent && reg.athlete_id === input.athlete_id
    })

    const initialStatus: RegistrationStatus =
      race.category === 'individual' ? 'self_enrolled' : isAdminView ? 'enrolled_by_admin' : 'interested'

    if (existing) {
      setRegistrations((prev) =>
        prev.map((reg) =>
          reg.id === existing.id
            ? {
                ...reg,
                distance: input.distance,
                transport_mode: transport,
                carpool_seats: input.carpool_seats,
                notes: input.notes,
                status: reg.status === 'cancelled' ? initialStatus : reg.status,
              }
            : reg
        )
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
      carpool_seats: input.carpool_seats,
      bib_status: 'pending',
      bib_transfer_available: false,
      notes: input.notes,
      created_at: new Date().toISOString(),
    }
    setRegistrations((prev) => [...prev, newReg])
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
      isAdminView || reg.athlete_id === currentUser.id || Boolean(child?.associated_adult_ids.includes(currentUser.id))
    if (!allowed) return
    setRegistrations((prev) => prev.filter((r) => r.id !== regId))
    showToast(`Inscrição de ${reg.athlete_name} cancelada.`, 'info')
  }

  const updateRegistrationByAdmin: AppContextValue['updateRegistrationByAdmin'] = (regId, patch) => {
    if (!requireAdmin('gerir inscrições')) return
    setRegistrations((prev) => prev.map((r) => (r.id === regId ? { ...r, ...patch } : r)))
  }

  const confirmAllPendingForRace = (raceId: string) => {
    if (!requireAdmin('confirmar inscrições')) return
    const race = races.find((r) => r.id === raceId)
    const count = registrations.filter((r) => r.race_id === raceId && r.status === 'interested').length
    if (!race || count === 0) {
      showToast('Não há inscrições pendentes nesta prova.', 'info')
      return
    }
    setRegistrations((prev) =>
      prev.map((r) => (r.race_id === raceId && r.status === 'interested' ? { ...r, status: 'enrolled_by_admin' } : r))
    )
    pushNotification({
      title: `Inscrições efetuadas: ${race.title}`,
      message: `O clube confirmou a inscrição de ${count} atleta(s) em "${race.title}".`,
      type: 'race_open',
      related_race_id: raceId,
    })
    showToast(`${count} inscrição(ões) confirmada(s).`)
  }

  const markAllBibsAtClubForRace = (raceId: string, pickupBy: string) => {
    if (!requireAdmin('gerir dorsais')) return
    const race = races.find((r) => r.id === raceId)
    const count = registrations.filter((r) => r.race_id === raceId && r.bib_status === 'pending').length
    if (!race || count === 0) return
    setRegistrations((prev) =>
      prev.map((r) =>
        r.race_id === raceId && r.bib_status === 'pending'
          ? { ...r, bib_status: 'at_club' as BibStatus, bib_pickup_by: pickupBy }
          : r
      )
    )
    pushNotification({
      title: `Dorsais levantados: ${race.title}`,
      message: `Os dorsais de "${race.title}" foram levantados por ${pickupBy} e estão prontos a entregar.`,
      type: 'bibs_ready',
      related_race_id: raceId,
      pinned: true,
    })
    showToast(`${count} dorsais marcados como levantados.`)
  }

  // ---------------------------------------------------------------------------
  // Treinos e eventos (apenas admin cria)
  // ---------------------------------------------------------------------------
  const createEvent = (evtInput: NewEvent): TeamEvent | null => {
    if (!requireAdmin('criar treinos e eventos')) return null
    const newEvt: TeamEvent = { ...evtInput, id: uid('evt'), created_by_name: currentUser.name, attendees: [] }
    setEvents((prev) => sortByDate([...prev, newEvt], 'time'))
    showToast(`"${newEvt.title}" agendado.`)
    return newEvt
  }

  const updateEvent = (evt: TeamEvent) => {
    if (!requireAdmin('editar eventos')) return
    setEvents((prev) => sortByDate(prev.map((e) => (e.id === evt.id ? evt : e)), 'time'))
    showToast('Evento atualizado.')
  }

  const deleteEvent = (eventId: string) => {
    if (!requireAdmin('remover eventos')) return
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
    showToast('Evento removido.', 'info')
  }

  const rsvpEvent = (eventId: string, status: 'going' | 'maybe' | 'not_going', note?: string) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id !== eventId
          ? evt
          : {
              ...evt,
              attendees: [
                ...evt.attendees.filter((a) => a.athlete_id !== currentUser.id),
                { athlete_id: currentUser.id, athlete_name: currentUser.name, status, note },
              ],
            }
      )
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
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
    showToast('Comunicado removido.', 'info')
  }

  const togglePinNotification = (notifId: string) => {
    if (!requireAdmin('fixar comunicados')) return
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, pinned: !n.pinned } : n)))
  }

  const markNotificationRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId && !n.read_by.includes(currentUser.id) ? { ...n, read_by: [...n.read_by, currentUser.id] } : n
      )
    )
  }

  const markAllNotificationsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => (n.read_by.includes(currentUser.id) ? n : { ...n, read_by: [...n.read_by, currentUser.id] }))
    )
    showToast('Comunicados marcados como lidos.', 'info')
  }

  const resetDemoData = () => {
    setYouthAthletes(INITIAL_YOUTH_ATHLETES)
    setProfiles(INITIAL_PROFILES)
    setRaces(INITIAL_RACES)
    setRegistrations(INITIAL_REGISTRATIONS)
    setEvents(INITIAL_EVENTS)
    setNotifications(INITIAL_NOTIFICATIONS)
    showToast('Dados de demonstração repostos.', 'info')
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
        addYouthAthlete,
        updateYouthAthlete,
        removeYouthAthlete,
        associateChildToAdult,
        disassociateChildFromAdult,
        createRace,
        updateRace,
        deleteRace,
        registerForRace,
        cancelRegistration,
        updateRegistrationByAdmin,
        confirmAllPendingForRace,
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
