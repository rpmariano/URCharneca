import React from 'react'
import { Baby, Check, CircleHelp, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { ActivityKind, Race, TeamEvent } from '../types'
import { EVENT_TYPE_LABELS } from '../types'
import { computeVanAllocation, formatShortDate, getDaysFromReference } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { ActivityCover } from './ActivityCover'
import { KindBadge, Tag, kindOfEvent } from './ui'

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

/** "Hoje", "Amanhã" ou "Faltam N dias" (até duas semanas); vazio para datas mais distantes ou passadas. */
export const countdownLabel = (date: string): string => {
  const days = getDaysFromReference(date)
  if (days < 0 || days > 14) return ''
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  return `Faltam ${days} dias`
}

type CardVariant = 'full' | 'wide' | 'row'

/**
 * Cartão base de uma atividade: capa com etiquetas por cima e texto por baixo.
 * `full` ocupa a largura (listas), `wide` é o cartão de carrossel e `row` é a linha compacta com miniatura.
 */
const ActivityCard: React.FC<{
  variant: CardVariant
  kind: ActivityKind
  kindLabel?: string
  seed: string
  imageUrl?: string
  title: string
  when: string
  where: string
  meta?: React.ReactNode
  status?: React.ReactNode
  extraBadge?: React.ReactNode
  dimmed?: boolean
  onOpen?: () => void
  footer?: React.ReactNode
  ariaLabel: string
}> = ({ variant, kind, kindLabel, seed, imageUrl, title, when, where, meta, status, extraBadge, dimmed, onOpen, footer, ariaLabel }) => {
  if (variant === 'row') {
    return (
      <div className={dimmed ? 'opacity-60' : ''}>
        <button type="button" onClick={onOpen} aria-label={ariaLabel} className="w-full flex items-center gap-4 text-left pressable py-1">
          <ActivityCover kind={kind} seed={seed} imageUrl={imageUrl} className="w-[72px] h-[72px] rounded-xl shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="t-body t-strong text-[var(--text-1)] line-clamp-2">{title}</span>
            <span className="block t-small text-[var(--text-3)] truncate">{when}</span>
            <span className="block t-small text-[var(--text-3)] truncate">{where}</span>
          </span>
          {status}
        </button>
        {footer && <div className="pt-3">{footer}</div>}
      </div>
    )
  }

  const wide = variant === 'wide'
  return (
    <div className={`${wide ? 'w-[78%] max-w-[320px]' : 'w-full'} ${dimmed ? 'opacity-60' : ''}`} role={wide ? 'listitem' : undefined}>
      <button type="button" onClick={onOpen} aria-label={ariaLabel} className="w-full text-left pressable block">
        <ActivityCover kind={kind} seed={seed} imageUrl={imageUrl} className={`w-full rounded-2xl ${wide ? 'aspect-[4/3]' : 'aspect-[16/10]'}`}>
          <span className="absolute top-3 left-3 flex flex-wrap gap-1.5 pr-3">
            <KindBadge kind={kind} label={kindLabel} solid />
            {extraBadge}
          </span>
          {status && <span className="absolute bottom-3 left-3">{status}</span>}
        </ActivityCover>
        <span className="block pt-3">
          <span className="t-body t-strong text-[var(--text-1)] line-clamp-2">{title}</span>
          <span className="block t-body text-[var(--text-3)] truncate">{when}</span>
          <span className="block t-body text-[var(--text-3)] truncate">{where}</span>
          {meta && <span className="block t-body text-[var(--text-1)] pt-1">{meta}</span>}
        </span>
      </button>
      {footer && <div className="pt-3">{footer}</div>}
    </div>
  )
}

const StatusPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1 t-small t-strong px-2.5 py-1 rounded-full bg-[var(--text-1)] text-[var(--bg-app)]">
    <Check className="w-3.5 h-3.5" aria-hidden="true" />
    {children}
  </span>
)

const useRaceCardData = (race: Race) => {
  const { registrations, isAdminView } = useApp()
  const regs = registrations.filter((r) => r.race_id === race.id && r.status !== 'cancelled')
  const mine = useMyRaceRegs(race.id)
  const van = computeVanAllocation(race, regs)
  const pending = regs.filter((r) => r.status === 'interested').length
  const countdown = countdownLabel(race.date)
  const metaParts = [
    regs.length === 0 ? 'Sê o primeiro a inscrever-te' : `${regs.length} ${regs.length === 1 ? 'inscrito' : 'inscritos'}`,
    race.van_available ? (van.availableSeats > 0 ? `carrinha ${van.confirmedPassengers.length}/${van.capacity}` : 'carrinha cheia') : '',
  ].filter(Boolean)

  return {
    when: `${formatShortDate(race.date)} · ${race.start_time}${countdown ? ` · ${countdown}` : ''}`,
    meta: (
      <>
        <span className="t-strong">{metaParts[0]}</span>
        {metaParts[1] ? ` · ${metaParts[1]}` : ''}
      </>
    ),
    status: mine.length > 0 ? <StatusPill>{mine.length > 1 ? `${mine.length} inscrições` : 'Inscrito'}</StatusPill> : undefined,
    extraBadge: (
      <>
        {race.open_to_children && (
          <span className="inline-flex items-center gap-1 t-small t-strong px-2.5 py-1 rounded-full bg-[var(--surface-card)] text-[var(--text-1)] shadow-[var(--shadow-card)]">
            <Baby className="w-3.5 h-3.5" aria-hidden="true" /> Crianças
          </span>
        )}
        {isAdminView && pending > 0 && <Tag tone="danger">{pending} por confirmar</Tag>}
      </>
    ),
    dimmed: race.date < todayISO(),
    ariaLabel: `${race.title}, ${formatShortDate(race.date)}, ${race.location}`,
  }
}

/** Cartão de prova para listas: capa, título, data, local, inscritos e carrinha. Requer AppProvider. */
export const RaceListItem: React.FC<{ race: Race; onOpen: () => void; compact?: boolean }> = ({ race, onOpen, compact }) => {
  const d = useRaceCardData(race)
  return (
    <ActivityCard
      variant={compact ? 'row' : 'full'}
      kind={race.category}
      seed={race.id}
      imageUrl={race.image_url}
      title={race.title}
      where={race.location}
      onOpen={onOpen}
      {...d}
      status={compact ? (d.status ? <Tag tone="ok">Inscrito</Tag> : undefined) : d.status}
    />
  )
}

/** Cartão de prova para carrossel horizontal (Destaques). Requer AppProvider. */
export const RaceCard: React.FC<{ race: Race; onOpen?: () => void }> = ({ race, onOpen }) => {
  const d = useRaceCardData(race)
  return (
    <ActivityCard
      variant="wide"
      kind={race.category}
      seed={race.id}
      imageUrl={race.image_url}
      title={race.title}
      where={race.location}
      onOpen={onOpen}
      {...d}
    />
  )
}

/** Cartão de treino/evento/reunião. `compact` mostra a linha com miniatura; `showRsvp` junta os botões de presença. Requer AppProvider. */
export const EventListItem: React.FC<{ event: TeamEvent; onOpen: () => void; showRsvp?: boolean; compact?: boolean }> = ({
  event,
  onOpen,
  showRsvp = false,
  compact,
}) => {
  const { currentUser } = useApp()
  const kind = kindOfEvent(event)
  const going = event.attendees.filter((a) => a.status === 'going').length
  const mine = event.attendees.find((a) => a.athlete_id === currentUser.id)?.status
  const past = event.date < todayISO()
  const countdown = countdownLabel(event.date)
  const mineLabel = mine === 'going' ? 'Vais' : mine === 'maybe' ? 'Talvez' : ''

  return (
    <ActivityCard
      variant={compact ? 'row' : 'full'}
      kind={kind}
      kindLabel={EVENT_TYPE_LABELS[event.type].short}
      seed={event.id}
      imageUrl={event.image_url}
      title={event.title}
      when={`${formatShortDate(event.date)} · ${event.time}${countdown ? ` · ${countdown}` : ''}`}
      where={event.location}
      meta={<span className="t-strong">{going === 0 ? 'Ainda sem confirmações' : `${going} ${going === 1 ? 'confirmado' : 'confirmados'}`}</span>}
      status={
        mineLabel ? compact ? showRsvp ? undefined : <Tag tone="ok">{mineLabel}</Tag> : <StatusPill>{mineLabel}</StatusPill> : undefined
      }
      dimmed={past}
      onOpen={onOpen}
      footer={showRsvp && !past ? <RsvpButtons event={event} /> : undefined}
      ariaLabel={`${event.title}, ${formatShortDate(event.date)}, ${event.location}`}
    />
  )
}

/** Três botões de presença (Vou / Talvez / Não vou) para um treino ou evento. Requer AppProvider. */
export const RsvpButtons: React.FC<{ event: TeamEvent; compact?: boolean }> = ({ event }) => {
  const { currentUser, rsvpEvent } = useApp()
  const mine = event.attendees.find((a) => a.athlete_id === currentUser.id)?.status
  const past = event.date < todayISO()
  const opts = [
    { value: 'going' as const, label: 'Vou', icon: Check },
    { value: 'maybe' as const, label: 'Talvez', icon: CircleHelp },
    { value: 'not_going' as const, label: 'Não vou', icon: X },
  ]
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="A tua presença">
      {opts.map((o) => {
        const on = mine === o.value
        return (
          <button
            key={o.value}
            type="button"
            disabled={past}
            aria-pressed={on}
            onClick={(e) => {
              e.stopPropagation()
              rsvpEvent(event.id, o.value)
            }}
            className={`min-h-11 rounded-xl t-small border flex items-center justify-center gap-1.5 pressable disabled:opacity-40 disabled:cursor-not-allowed ${
              on
                ? o.value === 'going'
                  ? 'bg-[var(--run)] text-[var(--on-accent)] border-transparent t-strong'
                  : 'bg-[var(--text-1)] text-[var(--bg-app)] border-transparent t-strong'
                : 'bg-[var(--surface-card)] text-[var(--text-1)] border-[var(--border-card-strong)]'
            }`}
          >
            <o.icon className="w-4 h-4" aria-hidden="true" />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
