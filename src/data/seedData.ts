import type {
  AthleteProfile,
  YouthAthlete,
  Race,
  RaceRegistration,
  TeamEvent,
  AppNotification,
} from '../types'
import {
  TROFEU_SEED_ADULT_PROFILES,
  TROFEU_SEED_YOUTH_ATHLETES,
  buildTrofeuRaces2026_2027,
} from './trofeuData'

/**
 * Dados iniciais limpos:
 * - Sem dados fictícios de exemplo (treinos, convívios, inscrições ou avisos antigos).
 * - Apenas as 13 provas oficiais do Troféu de Atletismo de Cascais 2026/2027.
 * - Único administrador inicial: Administrador (`ath-admin`); os atletas reais vivem só na base de dados.
 */
export const INITIAL_YOUTH_ATHLETES: YouthAthlete[] = TROFEU_SEED_YOUTH_ATHLETES

export const INITIAL_PROFILES: AthleteProfile[] = TROFEU_SEED_ADULT_PROFILES

export const INITIAL_RACES: Race[] = buildTrofeuRaces2026_2027('2026-11-22T09:00:00Z')

export const INITIAL_REGISTRATIONS: RaceRegistration[] = []

export const INITIAL_EVENTS: TeamEvent[] = []

export const INITIAL_NOTIFICATIONS: AppNotification[] = []
