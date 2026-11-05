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
  DependentAthlete,
} from '../types'
import {
  INITIAL_PROFILES,
  INITIAL_YOUTH_ATHLETES,
  INITIAL_RACES,
  INITIAL_REGISTRATIONS,
  INITIAL_EVENTS,
  INITIAL_NOTIFICATIONS,
} from '../data/seedData'

const STORAGE_KEYS = {
  PROFILES: 'urc_profiles_v3',
  YOUTH_ATHLETES: 'urc_youth_athletes_v3',
  RACES: 'urc_races_v2',
  REGISTRATIONS: 'urc_registrations_v2',
  EVENTS: 'urc_events_v2',
  NOTIFICATIONS: 'urc_notifications_v2',
  CURRENT_USER_ID: 'urc_current_user_id_v2',
  ACTIVE_VIEW_ROLE: 'urc_active_view_role_v2',
}

interface ToastMessage {
  id: string
  text: string
  type: 'success' | 'info' | 'warning'
}

interface RegisterForRaceInput {
  race_id: string
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

export interface AssociateChildResult {
  success: boolean
  message: string
}

interface AppContextValue {
  profiles: AthleteProfile[]
  youthAthletes: YouthAthlete[]
  races: Race[]
  registrations: RaceRegistration[]
  events: TeamEvent[]
  notifications: AppNotification[]
  currentUser: AthleteProfile
  /** Papel atualmente ativo na UI ('admin' ou 'athlete'). Admins podem alternar para testar a vista de Atleta! */
  activeRole: UserRole
  isAdminView: boolean
  unreadNotificationsCount: number
  toasts: ToastMessage[]
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void
  setCurrentUserById: (id: string) => void
  setActiveRole: (role: UserRole) => void
  updateProfile: (updated: AthleteProfile) => void
  addAthleteProfile: (profile: Omit<AthleteProfile, 'id'>) => void
  // Gestão de Crianças / Jovens Atletas (Máx. 2 adultos)
  addYouthAthlete: (child: Omit<YouthAthlete, 'id' | 'associated_adult_ids'>) => YouthAthlete
  updateYouthAthlete: (child: YouthAthlete) => void
  removeYouthAthlete: (childId: string) => void
  associateChildToAdult: (childId: string, adultId: string) => AssociateChildResult
  disassociateChildFromAdult: (childId: string, adultId: string) => void
  addDependent: (athleteId: string, dep: Omit<DependentAthlete, 'id'>) => void
  removeDependent: (athleteId: string, depId: string) => void
  createRace: (race: Omit<Race, 'id' | 'created_by' | 'created_by_name'>) => Race
  updateRace: (race: Race) => void
  deleteRace: (raceId: string) => void
  registerForRace: (input: RegisterForRaceInput) => void
  cancelRegistration: (regId: string) => void
  updateRegistrationByAdmin: (
    regId: string,
    patch: Partial<Pick<RaceRegistration, 'status' | 'bib_number' | 'bib_status' | 'bib_pickup_by' | 'transport_mode' | 'result_time' | 'trophy_points' | 'notes'>>
  ) => void
  confirmAllPendingForRace: (raceId: string) => void
  markAllBibsAtClubForRace: (raceId: string, pickupBy: string) => void
  createEvent: (evt: Omit<TeamEvent, 'id' | 'created_by_name' | 'attendees'>) => void
  rsvpEvent: (eventId: string, status: 'going' | 'maybe' | 'not_going', note?: string) => void
  sendNotification: (notif: Omit<AppNotification, 'id' | 'created_at' | 'created_by_name' | 'read_by'>) => void
  markNotificationRead: (notifId: string) => void
  markAllNotificationsRead: () => void
  resetDemoData: () => void
  themeMode: 'balanced' | 'light' | 'dark'
  setThemeMode: (mode: 'balanced' | 'light' | 'dark') => void
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [youthAthletes, setYouthAthletes] = useState<YouthAthlete[]>(() =>
    loadFromStorage(STORAGE_KEYS.YOUTH_ATHLETES, INITIAL_YOUTH_ATHLETES)
  )

  const [profiles, setProfiles] = useState<AthleteProfile[]>(() => {
    const loadedProfiles = loadFromStorage(STORAGE_KEYS.PROFILES, INITIAL_PROFILES)
    const initialYouth = loadFromStorage(STORAGE_KEYS.YOUTH_ATHLETES, INITIAL_YOUTH_ATHLETES)
    // Sincronizar dependentes de cada atleta com as crianças que o associam
    return loadedProfiles.map((p) => ({
      ...p,
      dependents: initialYouth.filter((c) => c.associated_adult_ids.includes(p.id)),
    }))
  })

  const [races, setRaces] = useState<Race[]>(() =>
    loadFromStorage(STORAGE_KEYS.RACES, INITIAL_RACES)
  )
  const [registrations, setRegistrations] = useState<RaceRegistration[]>(() =>
    loadFromStorage(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS)
  )
  const [events, setEvents] = useState<TeamEvent[]>(() =>
    loadFromStorage(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
  )
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  )
  const [currentUserId, setCurrentUserId] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.CURRENT_USER_ID, 'ath-rui-mariano')
  )
  const [activeRole, setActiveRoleState] = useState<UserRole>(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_VIEW_ROLE, 'admin')
  )
  const [themeMode, setThemeModeState] = useState<'balanced' | 'light' | 'dark'>(() =>
    loadFromStorage('urc_theme_mode', 'balanced')
  )
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    localStorage.setItem('urc_theme_mode', JSON.stringify(themeMode))
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeMode)
    }
  }, [themeMode])

  const setThemeMode = (mode: 'balanced' | 'light' | 'dark') => {
    setThemeModeState(mode)
    showToast(
      mode === 'balanced'
        ? 'Design: Meio-Termo (Slate Navy)'
        : mode === 'light'
        ? 'Design: Luminoso (Claro)'
        : 'Design: Escuro (Obsidiana)',
      'info'
    )
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles))
  }, [profiles])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.YOUTH_ATHLETES, JSON.stringify(youthAthletes))
  }, [youthAthletes])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RACES, JSON.stringify(races))
  }, [races])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations))
  }, [registrations])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events))
  }, [events])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications))
  }, [notifications])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId))
  }, [currentUserId])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_VIEW_ROLE, JSON.stringify(activeRole))
  }, [activeRole])

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3600)
  }

  const currentUser = useMemo(() => {
    return profiles.find((p) => p.id === currentUserId) || profiles[0]
  }, [profiles, currentUserId])

  const isAdminView = activeRole === 'admin'

  const setCurrentUserById = (id: string) => {
    const target = profiles.find((p) => p.id === id)
    if (!target) return
    setCurrentUserId(id)
    setActiveRoleState(target.role)
    showToast(`Sessão ativa: ${target.name} (${target.role === 'admin' ? 'Administrador' : 'Atleta'})`, 'info')
  }

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role)
    showToast(
      role === 'admin'
        ? 'Modo Administrador ativado (gestão de provas, carrinha, dorsais e atletas)'
        : 'Modo Atleta ativado (vista de inscrição e consulta)',
      'info'
    )
  }

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read_by.includes(currentUser.id)).length
  }, [notifications, currentUser.id])

  const updateProfile = (updated: AthleteProfile) => {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    showToast('Ficha de atleta atualizada com sucesso!')
  }

  const addAthleteProfile = (profile: Omit<AthleteProfile, 'id'>) => {
    const newProfile: AthleteProfile = {
      ...profile,
      id: `ath-${Date.now()}`,
      dependents: [],
    }
    setProfiles((prev) => [...prev, newProfile])
    showToast(`${newProfile.name} adicionado(a) à equipa U.R. Charneca!`)
  }

  /**
   * Associação de Crianças da Lista Predefinida ao Perfil de um Adulto.
   * Regra rígida: NO MÁXIMO DOIS ADULTOS por criança.
   */
  const associateChildToAdult = (childId: string, adultId: string): AssociateChildResult => {
    const child = youthAthletes.find((c) => c.id === childId)
    if (!child) return { success: false, message: 'Jovem atleta não encontrado.' }

    if (child.associated_adult_ids.includes(adultId)) {
      return { success: false, message: `${child.name} já se encontra associada ao teu perfil.` }
    }

    if (child.associated_adult_ids.length >= 2) {
      const parentNames = child.associated_adult_ids
        .map((pId) => profiles.find((p) => p.id === pId)?.name || 'Adulto')
        .join(' e ')
      const msg = `${child.name} já atingiu o limite máximo de 2 adultos responsáveis (${parentNames}).`
      showToast(msg, 'warning')
      return { success: false, message: msg }
    }

    const updatedChildren = youthAthletes.map((c) =>
      c.id === childId ? { ...c, associated_adult_ids: [...c.associated_adult_ids, adultId] } : c
    )
    setYouthAthletes(updatedChildren)

    // Sincronizar os dependentes nos perfis
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        dependents: updatedChildren.filter((c) => c.associated_adult_ids.includes(p.id)),
      }))
    )

    showToast(`${child.name} associada ao teu perfil com sucesso!`)
    return { success: true, message: 'Criança associada com sucesso!' }
  }

  /**
   * Desassocia a criança do perfil do adulto.
   */
  const disassociateChildFromAdult = (childId: string, adultId: string) => {
    const child = youthAthletes.find((c) => c.id === childId)
    const updatedChildren = youthAthletes.map((c) =>
      c.id === childId
        ? { ...c, associated_adult_ids: c.associated_adult_ids.filter((id) => id !== adultId) }
        : c
    )
    setYouthAthletes(updatedChildren)

    // Sincronizar nos perfis
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        dependents: updatedChildren.filter((c) => c.associated_adult_ids.includes(p.id)),
      }))
    )

    showToast(`${child ? child.name : 'Criança'} desassociada do teu perfil.`, 'info')
  }

  /**
   * Adiciona nova criança à lista oficial predefinida da U.R. Charneca (gerida por Admins)
   */
  const addYouthAthlete = (childInput: Omit<YouthAthlete, 'id' | 'associated_adult_ids'>): YouthAthlete => {
    const newChild: YouthAthlete = {
      ...childInput,
      id: `dep-${Date.now()}`,
      associated_adult_ids: [],
    }
    const updated = [...youthAthletes, newChild]
    setYouthAthletes(updated)
    showToast(`${newChild.name} registada na lista oficial de jovens atletas da U.R. Charneca!`)
    return newChild
  }

  /**
   * Atualiza dados de uma criança na lista oficial
   */
  const updateYouthAthlete = (updatedChild: YouthAthlete) => {
    const updated = youthAthletes.map((c) => (c.id === updatedChild.id ? updatedChild : c))
    setYouthAthletes(updated)
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        dependents: updated.filter((c) => c.associated_adult_ids.includes(p.id)),
      }))
    )
    showToast(`Ficha de ${updatedChild.name} atualizada!`)
  }

  /**
   * Remove criança da lista oficial da U.R. Charneca
   */
  const removeYouthAthlete = (childId: string) => {
    const child = youthAthletes.find((c) => c.id === childId)
    const updated = youthAthletes.filter((c) => c.id !== childId)
    setYouthAthletes(updated)
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        dependents: updated.filter((c) => c.associated_adult_ids.includes(p.id)),
      }))
    )
    showToast(`${child ? child.name : 'Criança'} removida da lista oficial.`, 'info')
  }

  // Compatibilidade com funções antigas de dependentes
  const addDependent = (athleteId: string, dep: Omit<DependentAthlete, 'id'>) => {
    const newChild = addYouthAthlete(dep)
    associateChildToAdult(newChild.id, athleteId)
  }

  const removeDependent = (athleteId: string, depId: string) => {
    disassociateChildFromAdult(depId, athleteId)
  }

  const createRace = (raceInput: Omit<Race, 'id' | 'created_by' | 'created_by_name'>): Race => {
    const newRace: Race = {
      ...raceInput,
      id: `race-${Date.now()}`,
      created_by: currentUser.id,
      created_by_name: currentUser.name,
    }
    setRaces((prev) => [...prev, newRace].sort((a, b) => a.date.localeCompare(b.date)))

    // Gerar notificação automática para o grupo
    const isIndividual = newRace.category === 'individual'
    const notifTitle = isIndividual
      ? `Nova prova partilhada por ${currentUser.name}: ${newRace.title}`
      : `Inscrições abertas: ${newRace.title}`
    const notifBody = isIndividual
      ? `${currentUser.name} vai participar em "${newRace.title}" (${newRace.date}) e partilhou a prova com a equipa. Clica em "Também vou!" se já te inscreveste!`
      : `Já te podes inscrever em "${newRace.title}" (${newRace.date} em ${newRace.location}). ${
          newRace.van_available
            ? `Carrinha da Charneca disponível (${newRace.van_capacity} lugares, saída às ${newRace.van_departure_time}).`
            : ''
        }`

    const autoNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: notifTitle,
      message: notifBody,
      type: isIndividual ? 'individual_share' : 'race_open',
      related_race_id: newRace.id,
      created_by_name: currentUser.name,
      created_at: new Date().toISOString(),
      pinned: newRace.category === 'trofeu_cascais',
      read_by: [currentUser.id],
    }
    setNotifications((prev) => [autoNotif, ...prev])
    showToast(`Prova "${newRace.title}" publicada e grupo notificado!`)
    return newRace
  }

  const updateRace = (updated: Race) => {
    setRaces((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)).sort((a, b) => a.date.localeCompare(b.date))
    )
    showToast('Dados da prova e logística atualizados!')
  }

  const deleteRace = (raceId: string) => {
    setRaces((prev) => prev.filter((r) => r.id !== raceId))
    setRegistrations((prev) => prev.filter((reg) => reg.race_id !== raceId))
    showToast('Prova removida.', 'info')
  }

  const registerForRace = (input: RegisterForRaceInput) => {
    const race = races.find((r) => r.id === input.race_id)
    if (!race) return

    // Verificar se já está inscrito (mesmo atleta ou mesmo dependente)
    const existing = registrations.find(
      (reg) =>
        reg.race_id === input.race_id &&
        reg.athlete_id === input.athlete_id &&
        reg.is_dependent === input.is_dependent &&
        (input.is_dependent ? reg.dependent_id === input.dependent_id : true)
    )

    const initialStatus: RegistrationStatus =
      race.category === 'individual'
        ? 'self_enrolled'
        : isAdminView
        ? 'enrolled_by_admin'
        : 'interested'

    if (existing) {
      setRegistrations((prev) =>
        prev.map((reg) =>
          reg.id === existing.id
            ? {
                ...reg,
                distance: input.distance,
                transport_mode: input.transport_mode,
                carpool_seats: input.carpool_seats,
                notes: input.notes,
                status: reg.status === 'cancelled' ? initialStatus : reg.status,
              }
            : reg
        )
      )
      showToast('Inscrição e opção de transporte atualizadas!')
      return
    }

    const newReg: RaceRegistration = {
      id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      race_id: input.race_id,
      athlete_id: input.athlete_id,
      athlete_name: input.athlete_name,
      is_dependent: input.is_dependent,
      dependent_id: input.dependent_id,
      parent_name: input.parent_name,
      escalao: input.escalao,
      distance: input.distance,
      status: initialStatus,
      transport_mode: input.transport_mode,
      carpool_seats: input.carpool_seats,
      bib_status: 'pending',
      bib_transfer_available: false,
      notes: input.notes,
      created_at: new Date().toISOString(),
    }

    setRegistrations((prev) => [...prev, newReg])
    showToast(
      race.category === 'individual'
        ? `Presença confirmada em "${race.title}"!`
        : `Pedido de inscrição registado para ${input.athlete_name}!`
    )
  }

  const cancelRegistration = (regId: string) => {
    setRegistrations((prev) => prev.filter((r) => r.id !== regId))
    showToast('Inscrição cancelada.', 'info')
  }

  const updateRegistrationByAdmin = (
    regId: string,
    patch: Partial<
      Pick<
        RaceRegistration,
        'status' | 'bib_number' | 'bib_status' | 'bib_pickup_by' | 'transport_mode' | 'result_time' | 'trophy_points' | 'notes'
      >
    >
  ) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, ...patch } : r))
    )
    showToast('Registo do atleta atualizado!')
  }

  const confirmAllPendingForRace = (raceId: string) => {
    let count = 0
    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.race_id === raceId && r.status === 'interested') {
          count++
          return { ...r, status: 'enrolled_by_admin' }
        }
        return r
      })
    )
    const race = races.find((r) => r.id === raceId)
    if (count > 0 && race) {
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: `Inscrições efetuadas: ${race.title}`,
        message: `${currentUser.name} confirmou a inscrição oficial pela equipa de ${count} atleta(s) na prova "${race.title}".`,
        type: 'race_open',
        related_race_id: raceId,
        created_by_name: currentUser.name,
        created_at: new Date().toISOString(),
        read_by: [currentUser.id],
      }
      setNotifications((prev) => [notif, ...prev])
      showToast(`${count} inscrição(ões) marcada(s) como efetuada(s) e atletas notificados!`)
    } else {
      showToast('Não existem inscrições pendentes nesta prova.', 'info')
    }
  }

  const markAllBibsAtClubForRace = (raceId: string, pickupBy: string) => {
    let count = 0
    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.race_id === raceId && r.bib_status === 'pending') {
          count++
          return { ...r, bib_status: 'at_club' as BibStatus, bib_pickup_by: pickupBy }
        }
        return r
      })
    )
    const race = races.find((r) => r.id === raceId)
    if (count > 0 && race) {
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: `Dorsais levantados: ${race.title}`,
        message: `Os dorsais para "${race.title}" já foram levantados por ${pickupBy} e estão prontos para entrega aos atletas!`,
        type: 'bibs_ready',
        related_race_id: raceId,
        created_by_name: currentUser.name,
        created_at: new Date().toISOString(),
        pinned: true,
        read_by: [currentUser.id],
      }
      setNotifications((prev) => [notif, ...prev])
      showToast(`Dorsais marcados como levantados por ${pickupBy} e aviso enviado!`)
    }
  }


  const createEvent = (evtInput: Omit<TeamEvent, 'id' | 'created_by_name' | 'attendees'>) => {
    const newEvt: TeamEvent = {
      ...evtInput,
      id: `evt-${Date.now()}`,
      created_by_name: currentUser.name,
      attendees: [
        {
          athlete_id: currentUser.id,
          athlete_name: currentUser.name,
          status: 'going',
        },
      ],
    }
    setEvents((prev) => [...prev, newEvt].sort((a, b) => a.date.localeCompare(b.date)))
    showToast(`Evento "${newEvt.title}" agendado!`)
  }

  const rsvpEvent = (eventId: string, status: 'going' | 'maybe' | 'not_going', note?: string) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt
        const filtered = evt.attendees.filter((a) => a.athlete_id !== currentUser.id)
        return {
          ...evt,
          attendees: [
            ...filtered,
            {
              athlete_id: currentUser.id,
              athlete_name: currentUser.name,
              status,
              note,
            },
          ],
        }
      })
    )
    showToast(
      status === 'going'
        ? 'Presença confirmada!'
        : status === 'maybe'
        ? 'Marcado como "Talvez".'
        : 'Indicado que não podes ir.'
    )
  }

  const sendNotification = (
    notifInput: Omit<AppNotification, 'id' | 'created_at' | 'created_by_name' | 'read_by'>
  ) => {
    const newNotif: AppNotification = {
      ...notifInput,
      id: `notif-${Date.now()}`,
      created_by_name: currentUser.name,
      created_at: new Date().toISOString(),
      read_by: [currentUser.id],
    }
    setNotifications((prev) => [newNotif, ...prev])

    // Se o navegador permitir Web Notifications, dispara também uma notificação nativa
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newNotif.title, {
          body: newNotif.message,
          icon: '/favicon.svg',
        })
      } catch {
        // Ignorar se bloqueado
      }
    }

    showToast('Notificação enviada para toda a equipa!')
  }

  const markNotificationRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId && !n.read_by.includes(currentUser.id)
          ? { ...n, read_by: [...n.read_by, currentUser.id] }
          : n
      )
    )
  }

  const markAllNotificationsRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.read_by.includes(currentUser.id)
          ? n
          : { ...n, read_by: [...n.read_by, currentUser.id] }
      )
    )
    showToast('Todas as notificações marcadas como lidas.', 'info')
  }

  const resetDemoData = () => {
    setYouthAthletes(INITIAL_YOUTH_ATHLETES)
    setProfiles(
      INITIAL_PROFILES.map((p) => ({
        ...p,
        dependents: INITIAL_YOUTH_ATHLETES.filter((c) => c.associated_adult_ids.includes(p.id)),
      }))
    )
    setRaces(INITIAL_RACES)
    setRegistrations(INITIAL_REGISTRATIONS)
    setEvents(INITIAL_EVENTS)
    setNotifications(INITIAL_NOTIFICATIONS)
    showToast('Dados originais da U.R. Charneca restaurados!', 'info')
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
        addYouthAthlete,
        updateYouthAthlete,
        removeYouthAthlete,
        associateChildToAdult,
        disassociateChildFromAdult,
        addDependent,
        removeDependent,
        createRace,
        updateRace,
        deleteRace,
        registerForRace,
        cancelRegistration,
        updateRegistrationByAdmin,
        confirmAllPendingForRace,
        markAllBibsAtClubForRace,
        createEvent,
        rsvpEvent,
        sendNotification,
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
