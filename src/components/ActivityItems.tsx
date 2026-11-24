import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { Race, TeamEvent } from '../types'
import { EVENT_TYPE_LABELS, REG_STATUS_LABELS } from '../types'
import { computeVanAllocation, formatShortDate, getDaysFromReference } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { raceDisplayTitle, raceTitleParts, tidyText } from '../utils/display'
import { DateBlock, KindMark, KIND_SINGULAR, Tag, kindOfEvent } from './ui'

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

/** Fotografia opcional da atividade (só quando existe `image_url`): miniatura quadrada; se falhar, desaparece. */
export const ActivityPhoto: React.FC<{ src?: string; className?: string }> = ({ src, className = 'w-16 h-16' }) => {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-cover shrink-0 block bg-[var(--surface-raised)] ${className}`}
    />
  )
}

/**
 * Linha de uma atividade numa lista em grelha (sem cartão): bloco de data (ou o número da etapa), título,
 * linhas de informação, etiquetas e, se houver, a fotografia. A lista mãe desenha as réguas (`rule-list`).
 */
export const ActivityRow: React.FC<{
  date: string
  lead?: React.ReactNode
  title: string
  lines?: React.ReactNode[]
  tags?: React.ReactNode
  imageUrl?: string
  past?: boolean
  onOpen?: () => void
  footer?: React.ReactNode
  ariaLabel: string
}> = ({ date, lead, title, lines = [], tags, imageUrl, past, onOpen, footer, ariaLabel }) => (
  <div>
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="row-link w-full grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3.5 items-center min-h-[88px] py-3 text-left"
    >
      {lead ?? <DateBlock date={date} color={past ? 'var(--text-1)' : undefined} />}
      <span className="min-w-0 flex flex-col items-start gap-1">
        <span className="t-item text-[var(--text-1)] line-clamp-2">{title}</span>
        {lines.filter(Boolean).map((l, i) => (
          <span key={i} className="t-small text-[var(--text-2)] max-w-full truncate">
            {l}
          </span>
        ))}
        {tags && <span className="flex flex-wrap gap-1.5 pt-0.5">{tags}</span>}
      </span>
      <ActivityPhoto src={imageUrl} />
    </button>
    {footer && <div className="pb-3 pl-[66px]">{footer}</div>}
  </div>
)

/** Etiqueta de prova nova (contador vermelho). */
const NewTag: React.FC = () => <Tag tone="danger">Nova</Tag>

const useRaceRowData = (race: Race) => {
  const { registrations, isAdminView } = useApp()
  const regs = registrations.filter((r) => r.race_id === race.id && r.status !== 'cancelled')
  const mine = useMyRaceRegs(race.id)
  const van = computeVanAllocation(race, regs)
  const pending = regs.filter((r) => r.status === 'interested').length
  const countdown = countdownLabel(race.date)
  const past = race.date < todayISO()
  // Com várias inscrições mostra-se o número; com uma, o mesmo estado que na página da prova
  const myState = mine.length === 1 ? REG_STATUS_LABELS[mine[0].status] : undefined
  const myLabel = myState?.label ?? (mine.length > 1 ? `${mine.length} inscrições` : '')
  const who =
    regs.length === 0
      ? mine.length > 0
        ? 'Já estás inscrito'
        : past
        ? ''
        : 'Sê o primeiro a inscrever-te'
      : `${regs.length} ${regs.length === 1 ? 'inscrito' : 'inscritos'}`
  const vanText = race.van_available ? (van.availableSeats > 0 ? `carrinha ${van.confirmedPassengers.length}/${van.capacity}` : 'carrinha cheia') : ''
  const title = raceDisplayTitle(race)

  return {
    title,
    past,
    lines: [
      <>
        <span className="t-strong text-[var(--text-1)]">{race.start_time}</span>
        {` · ${tidyText(race.location)}`}
        {countdown && <span className="t-strong text-[var(--text-1)]">{` · ${countdown}`}</span>}
      </>,
      <span className="inline-flex items-center gap-2">
        <KindMark kind={race.category} />
        {[KIND_SINGULAR[race.category], who, vanText].filter(Boolean).join(' · ')}
      </span>,
    ],
    tags: (
      <>
        {myLabel && <Tag tone={past ? 'neutral' : myState?.tone ?? 'neutral'}>{myLabel}</Tag>}
        {race.open_to_children && <Tag>Crianças</Tag>}
        {isAdminView && pending > 0 && <Tag tone="danger">{pending} por confirmar</Tag>}
      </>
    ),
    hasTags: Boolean(myLabel || race.open_to_children || (isAdminView && pending > 0)),
    ariaLabel: [title, formatShortDate(race.date), race.start_time, tidyText(race.location), myLabel].filter(Boolean).join(', '),
  }
}

/** Prova numa lista em grelha: data, título, hora, local, tipo, inscritos, carrinha e o meu estado. Requer AppProvider. */
export const RaceListItem: React.FC<{ race: Race; onOpen: () => void; compact?: boolean; isNew?: boolean }> = ({ race, onOpen, isNew }) => {
  const d = useRaceRowData(race)
  return (
    <ActivityRow
      date={race.date}
      title={d.title}
      lines={d.lines}
      tags={
        d.hasTags || isNew ? (
          <>
            {isNew && <NewTag />}
            {d.tags}
          </>
        ) : undefined
      }
      imageUrl={race.image_url}
      past={d.past}
      onOpen={onOpen}
      ariaLabel={isNew ? `Nova: ${d.ariaLabel}` : d.ariaLabel}
    />
  )
}

/** Mantido por compatibilidade (antes era o cartão do carrossel): agora é a mesma linha da lista. */
export const RaceCard: React.FC<{ race: Race; onOpen?: () => void; isNew?: boolean }> = ({ race, onOpen, isNew }) => (
  <RaceListItem race={race} onOpen={onOpen ?? (() => undefined)} isNew={isNew} />
)

/** Etapa do Troféu numa lista ("A seguir no Troféu"): número da etapa grande, nome e data. */
export const TrophyStageRow: React.FC<{ race: Race; onOpen: () => void; wide?: boolean }> = ({ race, onOpen, wide }) => {
  const { stage, name } = raceTitleParts(race)
  const mine = useMyRaceRegs(race.id)
  const myState = mine.length === 1 ? REG_STATUS_LABELS[mine[0].status] : undefined
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={[stage ? `Etapa ${stage}` : '', name, formatShortDate(race.date), myState?.label].filter(Boolean).join(', ')}
      className={`row-link w-full grid items-center text-left ${
        wide ? 'grid-cols-[60px_minmax(0,1fr)_auto] gap-[18px] min-h-[88px]' : 'grid-cols-[52px_minmax(0,1fr)_auto] gap-3.5 min-h-[66px]'
      } py-2`}
    >
      <span className={`num text-[var(--link)] ${wide ? 'text-[56px]' : 'text-[44px]'}`} aria-hidden="true">
        {stage ?? '·'}
      </span>
      <span className="min-w-0 flex flex-col items-start gap-1.5">
        <span className={`t-strong text-[var(--text-1)] leading-[1.3] ${wide ? 'text-[18px]' : 'text-[16px]'}`}>{name}</span>
        {myState && <Tag tone={myState.tone}>{myState.label}</Tag>}
      </span>
      <span className={`t-num text-[var(--text-1)] whitespace-nowrap ${wide ? 'text-[16px]' : 't-small'}`} aria-hidden="true">
        {wide ? formatShortDate(race.date) : formatShortDate(race.date).split(', ')[1]}
      </span>
    </button>
  )
}

/** Treino, evento ou reunião numa lista em grelha. `showRsvp` junta os botões de presença. Requer AppProvider. */
export const EventListItem: React.FC<{ event: TeamEvent; onOpen: () => void; showRsvp?: boolean; compact?: boolean }> = ({
  event,
  onOpen,
  showRsvp = false,
}) => {
  const { currentUser } = useApp()
  const kind = kindOfEvent(event)
  const going = event.attendees.filter((a) => a.status === 'going').length
  const mine = event.attendees.find((a) => a.athlete_id === currentUser.id)?.status
  const past = event.date < todayISO()
  const countdown = countdownLabel(event.date)
  const mineLabel = mine === 'going' ? 'Vou' : mine === 'maybe' ? 'Talvez' : ''
  const typeLabel = EVENT_TYPE_LABELS[event.type].short

  return (
    <ActivityRow
      date={event.date}
      title={tidyText(event.title)}
      lines={[
        <>
          <span className="t-strong text-[var(--text-1)]">{event.time}</span>
          {` · ${tidyText(event.location)}`}
          {countdown && <span className="t-strong text-[var(--text-1)]">{` · ${countdown}`}</span>}
        </>,
        <span className="inline-flex items-center gap-2">
          <KindMark kind={kind} />
          {`${typeLabel} · ${going === 0 ? 'ainda sem confirmações' : `${going} ${going === 1 ? 'confirmado' : 'confirmados'}`}`}
        </span>,
      ]}
      tags={mineLabel && !showRsvp ? <Tag tone={mine === 'going' ? 'ok' : 'warn'}>{mineLabel}</Tag> : undefined}
      imageUrl={event.image_url}
      past={past}
      onOpen={onOpen}
      footer={showRsvp && !past ? <RsvpButtons event={event} /> : undefined}
      ariaLabel={[tidyText(event.title), formatShortDate(event.date), event.time, tidyText(event.location), mineLabel].filter(Boolean).join(', ')}
    />
  )
}

/** Três botões unidos de presença (Vou / Talvez / Não vou) para um treino ou evento. Requer AppProvider. */
export const RsvpButtons: React.FC<{ event: TeamEvent; compact?: boolean }> = ({ event }) => {
  const { currentUser, rsvpEvent } = useApp()
  const mine = event.attendees.find((a) => a.athlete_id === currentUser.id)?.status
  const past = event.date < todayISO()
  const opts = [
    { value: 'going' as const, label: 'Vou' },
    { value: 'maybe' as const, label: 'Talvez' },
    { value: 'not_going' as const, label: 'Não vou' },
  ]
  return (
    <div className="joined" role="group" aria-label="A tua presença">
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
            className={`min-w-0 min-h-11 border-2 border-[var(--text-1)] t-small t-strong pressable disabled:opacity-45 disabled:cursor-not-allowed ${
              on ? 'bg-[var(--run)] text-[var(--on-accent)]' : 'bg-transparent text-[var(--text-1)] hover:enabled:bg-[var(--surface-raised)]'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
