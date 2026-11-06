import React from 'react'
import { Baby, Bus, CheckCircle2, MapPin, Users } from 'lucide-react'
import { CATEGORIA_LABELS } from '../types'
import { useApp } from '../context/AppContext'
import type { Race, TeamEvent } from '../types'
import { EVENT_TYPE_LABELS } from '../types'
import { computeVanAllocation, formatShortDate, getDaysFromReference } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { Card, DateBlock, KIND_COLOR, KindBadge, Tag, kindOfEvent } from './ui'
import { RsvpButtons } from './EventDetailModal'

/** Inscrições ativas do utilizador (e das crianças a seu cargo) numa prova */
export const useMyRaceRegs = (raceId: string) => {
  const { registrations, currentUser, youthAthletes } = useApp()
  const myChildIds = youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id)).map((c) => c.id)
  return registrations.filter(
    (r) =>
      r.race_id === raceId &&
      r.status !== 'cancelled' &&
      ((!r.is_dependent && r.athlete_id === currentUser.id) || (r.is_dependent && myChildIds.includes(r.dependent_id || '')))
  )
}

/** Linha de prova na agenda: data, tipo, título, local, nº de inscritos, ocupação da carrinha e "Inscrito". Requer AppProvider. */
export const RaceListItem: React.FC<{ race: Race; onOpen: () => void }> = ({ race, onOpen }) => {
  const { registrations, isAdminView } = useApp()
  const regs = registrations.filter((r) => r.race_id === race.id && r.status !== 'cancelled')
  const mine = useMyRaceRegs(race.id)
  const van = computeVanAllocation(race, regs)
  const pending = regs.filter((r) => r.status === 'interested').length
  const past = race.date < todayISO()

  return (
    <Card interactive accent={KIND_COLOR[race.category]} className={`p-3.5 ${past ? 'opacity-60' : ''}`} onClick={onOpen}>
      <div className="flex items-start gap-3">
        <DateBlock date={race.date} color={KIND_COLOR[race.category]} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <KindBadge kind={race.category} />
            {race.open_to_children && (
              <Tag tone="warn">
                <Baby className="w-3 h-3" />
              </Tag>
            )}
            {isAdminView && pending > 0 && <Tag tone="danger">{pending} por confirmar</Tag>}
          </div>
          <h3 className="display text-[22px] text-[var(--text-1)]">{race.title}</h3>
          <p className="text-xs text-[var(--text-3)] flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {race.start_time} · {race.location}
          </p>
          <div className="flex items-center gap-3 text-xs text-[var(--text-2)]">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {regs.length}
            </span>
            {race.van_available && (
              <span className="flex items-center gap-1">
                <Bus className="w-3 h-3" /> {van.confirmedPassengers.length}/{van.capacity}
              </span>
            )}
            {mine.length > 0 && (
              <span className="ml-auto flex items-center gap-1 font-bold text-[var(--run)]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Inscrito{mine.length > 1 ? ` (${mine.length})` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

/** Linha de treino/evento/reunião com botões de presença (Vou / Talvez / Não). Requer AppProvider. */
export const EventListItem: React.FC<{ event: TeamEvent; onOpen: () => void; showRsvp?: boolean }> = ({
  event,
  onOpen,
  showRsvp = true,
}) => {
  const kind = kindOfEvent(event)
  const going = event.attendees.filter((a) => a.status === 'going').length
  const past = event.date < todayISO()
  return (
    <Card interactive accent={KIND_COLOR[kind]} className={`p-3.5 space-y-2.5 ${past ? 'opacity-60' : ''}`} onClick={onOpen}>
      <div className="flex items-start gap-3">
        <DateBlock date={event.date} color={KIND_COLOR[kind]} />
        <div className="min-w-0 flex-1 space-y-1">
          <KindBadge kind={kind} label={EVENT_TYPE_LABELS[event.type].short} />
          <h3 className="display text-[22px] text-[var(--text-1)]">{event.title}</h3>
          <p className="text-xs text-[var(--text-3)] flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {event.time} · {event.location}
          </p>
          <p className="text-xs text-[var(--text-2)] flex items-center gap-1">
            <Users className="w-3 h-3" /> {going} confirmados
          </p>
        </div>
      </div>
      {showRsvp && !past && <RsvpButtons event={event} compact />}
    </Card>
  )
}

/** Cartão de destaque de uma prova (carrossel da página inicial): contagem decrescente, carrinha e estado da inscrição. */
export const RaceCard: React.FC<{ race: Race; onOpen?: () => void }> = ({ race, onOpen }) => {
  const { registrations } = useApp()
  const regs = registrations.filter((r) => r.race_id === race.id && r.status !== 'cancelled')
  const mine = useMyRaceRegs(race.id)
  const van = computeVanAllocation(race, regs)
  const days = getDaysFromReference(race.date)

  return (
    <button
      type="button"
      role="listitem"
      onClick={onOpen}
      className="hero-card w-[82%] shrink-0 text-left p-5 flex flex-col gap-4 cursor-pointer active:scale-[0.98] transition"
      aria-label={`${race.title}, ${CATEGORIA_LABELS[race.category].label}`}
    >
      <div className="flex items-start justify-between gap-2 relative z-10">
        <KindBadge kind={race.category} />
        <div className="text-right">
          {days <= 1 ? (
            <span className="display text-[28px] text-[var(--run)]">{days === 0 ? 'Hoje' : 'Amanhã'}</span>
          ) : (
            <>
              <span className="stat-num text-[48px] text-[var(--run)]">{days}</span>
              <div className="eyebrow text-xs text-[var(--text-3)] mt-1">dias</div>
            </>
          )}
        </div>
      </div>
      <div className="space-y-1.5 flex-1 relative z-10">
        <h3 className="display text-[28px] text-[var(--text-1)] line-clamp-3">{race.title}</h3>
        <p className="text-xs text-[var(--text-3)]">
          {formatShortDate(race.date)} · {race.start_time}
        </p>
        <p className="text-xs text-[var(--text-3)] flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" /> {race.location}
        </p>
      </div>
      {race.van_available && (
        <div className="space-y-1.5 relative z-10">
          <div className="flex justify-between eyebrow text-xs text-[var(--text-3)]">
            <span className="flex items-center gap-1">
              <Bus className="w-3 h-3" /> Carrinha
            </span>
            <span>
              {van.confirmedPassengers.length}/{van.capacity}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--run)] grow-x"
              style={{ width: `${Math.min(100, (van.confirmedPassengers.length / Math.max(1, van.capacity)) * 100)}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs text-[var(--text-2)] flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {regs.length} da equipa
        </span>
        <span
          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide ${
            mine.length ? 'bg-transparent border border-[var(--run)] text-[var(--run)]' : 'bg-[var(--run)] text-[var(--on-accent)]'
          }`}
        >
          {mine.length ? 'Inscrito' : 'Inscrever'}
        </span>
      </div>
    </button>
  )
}
