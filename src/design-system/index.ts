/**
 * Biblioteca de interface da U.R. Charneca Atletismo.
 * Ponto de entrada usado pelo build `design-system/` (sincronização com o Claude Design).
 * A app importa os mesmos componentes diretamente de `src/components`.
 */
import '../index.css'

// Primitivas visuais
export {
  Avatar,
  Button,
  Card,
  Chip,
  DateBlock,
  EmptyState,
  Field,
  KindBadge,
  PageHeader,
  SectionTitle,
  Segmented,
  Screen,
  SheetHeader,
  StatTile,
  Tag,
  Toggle,
  KIND_COLOR,
  KIND_SINGULAR,
  inputClass,
  kindOfEvent,
  kindOfRace,
} from '../components/ui'
export { Sheet } from '../components/Sheet'

// Componentes da app (precisam do AppProvider)
export { AppProvider, useApp } from '../context/AppContext'
export { RaceCard, RaceListItem, EventListItem } from '../components/ActivityItems'
export { RsvpButtons, EventDetailModal } from '../components/EventDetailModal'
export { RaceDetailModal } from '../components/RaceDetailModal'
export { CreateRaceModal } from '../components/CreateRaceModal'
export { CreateEventModal } from '../components/CreateEventModal'
export { CreateNoticeModal } from '../components/CreateNoticeModal'
export { AthleteForm, ChildForm, emptyAthlete, emptyChild } from '../components/PeopleForms'

// Dados de exemplo e tipos
export {
  INITIAL_RACES as demoRaces,
  INITIAL_EVENTS as demoEvents,
  INITIAL_PROFILES as demoProfiles,
  INITIAL_YOUTH_ATHLETES as demoChildren,
  INITIAL_NOTIFICATIONS as demoNotices,
} from '../data/seedData'
export * from '../types'
