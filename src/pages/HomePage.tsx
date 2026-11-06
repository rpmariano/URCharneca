import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cake, ChevronRight, Megaphone, Pin, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Race, TeamEvent } from '../types'
import { addDaysISO, formatShortDate, getUpcomingBirthdays } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { RaceDetailModal } from '../components/RaceDetailModal'
import { EventDetailModal } from '../components/EventDetailModal'
import { EventListItem, RaceCard } from '../components/ActivityItems'
import { Avatar, Card, EmptyState, SectionTitle, StatTile, Tag } from '../components/ui'

/**
 * Página inicial: Comunicados · Próximo evento · Próximas provas (carrossel) · Treinos · Aniversários
 */
export const HomePage: React.FC = () => {
  const {
    races,
    events,
    registrations,
    notifications,
    profiles,
    youthAthletes,
    currentUser,
    isAdminView,
    unreadNotificationsCount,
    markNotificationRead,
  } = useApp()
  const navigate = useNavigate()
  const [raceId, setRaceId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const today = todayISO()

  const upcomingRaces = useMemo(
    () =>
      races
        .filter((r) => r.date >= today)
        .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`))
        .slice(0, 5),
    [races, today]
  )

  const upcomingEvents = useMemo(
    () => events.filter((e) => e.date >= today).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [events, today]
  )
  const nextEvent = upcomingEvents.find((e) => e.type !== 'training') || null
  const nextTrainings = upcomingEvents.filter((e) => e.type === 'training').slice(0, 3)

  // Comunicados: fixados primeiro, depois os mais recentes
  const notices = useMemo(
    () =>
      [...notifications]
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.created_at.localeCompare(a.created_at))
        .slice(0, 3),
    [notifications]
  )

  const birthdays = useMemo(
    () =>
      getUpcomingBirthdays(
        [
          ...profiles.map((p) => ({ id: p.id, name: p.name, birth_date: p.birth_date, isChild: false })),
          ...youthAthletes.map((c) => ({ id: c.id, name: c.name, birth_date: c.birth_date, isChild: true })),
        ],
        5,
        today
      ),
    [profiles, youthAthletes, today]
  )

  const adminPending = useMemo(() => {
    if (!isAdminView) return 0
    const ids = new Set(races.filter((r) => r.date >= today).map((r) => r.id))
    return registrations.filter((r) => ids.has(r.race_id) && r.status === 'interested').length
  }, [isAdminView, races, registrations, today])

  // Números do topo (estilo painel de corrida)
  const myUpcomingCount = useMemo(() => {
    const childIds = new Set(youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id)).map((c) => c.id))
    const future = new Set(races.filter((r) => r.date >= today).map((r) => r.id))
    return registrations.filter(
      (r) =>
        future.has(r.race_id) &&
        r.status !== 'cancelled' &&
        ((!r.is_dependent && r.athlete_id === currentUser.id) || (r.is_dependent && childIds.has(r.dependent_id || '')))
    ).length
  }, [registrations, races, youthAthletes, currentUser.id, today])
  const weekEnd = addDaysISO(today, 7)
  const trainingsThisWeek = upcomingEvents.filter((e) => e.type === 'training' && e.date <= weekEnd).length

  const selectedRace: Race | null = raceId ? races.find((r) => r.id === raceId) || null : null
  const selectedEvent: TeamEvent | null = eventId ? events.find((e) => e.id === eventId) || null : null
  const firstName = currentUser.nickname || currentUser.name.split(' ')[0]

  return (
    <div className="space-y-7 pb-8 pt-4 stagger">
      <div className="space-y-4">
        <div>
          <p className="eyebrow text-[var(--run)]">
            {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="display text-[56px] text-[var(--text-1)] mt-1">Olá, {firstName}</h1>
        </div>
        <div className="grid grid-cols-3 border-y border-[var(--border-card)] divide-x divide-[var(--border-card)]">
          {[
            { n: myUpcomingCount, label: 'Inscrições', to: '/perfil' },
            { n: trainingsThisWeek, label: 'Treinos 7 dias', to: '/atividades?tipo=training' },
            { n: unreadNotificationsCount, label: 'Por ler', to: '/comunicados' },
          ].map((s) => (
            <StatTile key={s.label} value={s.n} label={s.label} onClick={() => navigate(s.to)} />
          ))}
        </div>
      </div>

      {adminPending > 0 && (
        <Card interactive className="p-3.5 flex items-center gap-3" onClick={() => navigate('/admin')}>
          <ShieldCheck className="w-5 h-5 text-[var(--tint-rose-fg)] shrink-0" />
          <span className="text-xs text-[var(--text-2)] flex-1">
            <strong className="text-[var(--text-1)]">{adminPending} pedidos de inscrição</strong> aguardam confirmação.
          </span>
          <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />
        </Card>
      )}

      {/* Comunicados */}
      <section className="space-y-2.5">
        <SectionTitle title="Comunicados" action="Ver todos" onAction={() => navigate('/comunicados')} />
        {notices.length === 0 ? (
          <EmptyState text="Sem comunicados." />
        ) : (
          <div className="space-y-2">
            {notices.map((n) => {
              const unread = !n.read_by.includes(currentUser.id)
              return (
                <Card
                  key={n.id}
                  interactive
                  className="p-3.5 space-y-1"
                  onClick={() => {
                    markNotificationRead(n.id)
                    navigate('/comunicados', { state: { focusId: n.id } })
                  }}
                >
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-3)]">
                    {n.pinned ? <Pin className="w-3 h-3 text-[var(--run)]" /> : <Megaphone className="w-3 h-3" />}
                    <span>{n.created_by_name}</span>
                    <span>· {formatShortDate(n.created_at.slice(0, 10))}</span>
                    {unread && <span className="ml-auto w-2 h-2 rounded-full bg-[var(--run)]" aria-label="Por ler" />}
                  </div>
                  <div className={`text-sm leading-snug ${unread ? 'font-bold text-[var(--text-1)]' : 'font-semibold text-[var(--text-2)]'}`}>
                    {n.title}
                  </div>
                  <p className="text-xs text-[var(--text-3)] line-clamp-2">{n.message}</p>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Próximo evento */}
      <section className="space-y-2.5">
        <SectionTitle title="Próximo evento" action="Agenda" onAction={() => navigate('/atividades?tipo=event')} />
        {nextEvent ? (
          <EventListItem event={nextEvent} onOpen={() => setEventId(nextEvent.id)} />
        ) : (
          <EmptyState text="Não há eventos marcados." />
        )}
      </section>

      {/* Próximas provas — carrossel */}
      <section className="space-y-2.5">
        <SectionTitle title="Próximas provas" action="Todas" onAction={() => navigate('/atividades?tipo=provas')} />
        {upcomingRaces.length === 0 ? (
          <EmptyState text="Não há provas agendadas." />
        ) : (
          <div className="snap-row -mx-4 px-4 pb-1" role="list" aria-label="Próximas provas">
            {upcomingRaces.map((r) => (
              <RaceCard key={r.id} race={r} onOpen={() => setRaceId(r.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Treinos */}
      <section className="space-y-2.5">
        <SectionTitle title="Treinos" action="Todos" onAction={() => navigate('/atividades?tipo=training')} />
        {nextTrainings.length === 0 ? (
          <EmptyState text="Não há treinos marcados." />
        ) : (
          <div className="space-y-2">
            {nextTrainings.map((t) => (
              <EventListItem key={t.id} event={t} onOpen={() => setEventId(t.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Aniversários */}
      <section className="space-y-2.5">
        <SectionTitle title="Aniversários" />
        <Card className="divide-y divide-[var(--border-card)]">
          {birthdays.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Avatar name={b.name} child={b.isChild} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--text-1)] truncate">{b.name}</div>
                <div className="text-xs text-[var(--text-3)]">
                  {formatShortDate(b.date)} · faz {b.turning} anos
                </div>
              </div>
              {b.daysAway === 0 ? (
                <Tag tone="ok">
                  <Cake className="w-3 h-3" /> Hoje
                </Tag>
              ) : (
                <span className="text-xs font-semibold text-[var(--text-3)]">
                  {b.daysAway === 1 ? 'amanhã' : `em ${b.daysAway} dias`}
                </span>
              )}
            </div>
          ))}
        </Card>
      </section>

      {selectedRace && <RaceDetailModal race={selectedRace} onClose={() => setRaceId(null)} />}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setEventId(null)} />}
    </div>
  )
}
