import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bus,
  MapPin,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  Users,
  Megaphone,
  ShieldCheck,
  Clock,
  Check,
  HelpCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Race } from '../types'
import { CATEGORIA_LABELS } from '../types'
import { formatShortDate, formatDayMonth, computeVanAllocation } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { RaceDetailModal } from '../components/RaceDetailModal'

/**
 * Página Inicial (/) — Painel da Armada Azul.
 * Resume o essencial: próxima prova, próximo treino, avisos e as minhas inscrições.
 */
export const HomePage: React.FC = () => {
  const {
    races,
    events,
    registrations,
    notifications,
    currentUser,
    isAdminView,
    unreadNotificationsCount,
    markNotificationRead,
    rsvpEvent,
  } = useApp()
  const navigate = useNavigate()
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null)

  const today = todayISO()
  const selectedRace: Race | null = selectedRaceId
    ? races.find((r) => r.id === selectedRaceId) || null
    : null

  const upcomingRaces = useMemo(
    () =>
      races
        .filter((r) => r.date >= today)
        .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)),
    [races, today]
  )

  const nextRace = upcomingRaces[0] || null

  const nextEvent = useMemo(
    () =>
      events
        .filter((e) => e.date >= today)
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0] || null,
    [events, today]
  )

  // Provas futuras em que eu (ou os meus dependentes) estou inscrito
  const myUpcoming = useMemo(() => {
    return upcomingRaces
      .map((race) => {
        const regs = registrations.filter(
          (r) => r.race_id === race.id && r.status !== 'cancelled' && r.athlete_id === currentUser.id
        )
        return { race, regs }
      })
      .filter((x) => x.regs.length > 0)
  }, [upcomingRaces, registrations, currentUser.id])

  // Aviso em destaque: primeiro não lido, senão o primeiro fixado
  const featuredNotice = useMemo(() => {
    return (
      notifications.find((n) => !n.read_by.includes(currentUser.id)) ||
      notifications.find((n) => n.pinned) ||
      null
    )
  }, [notifications, currentUser.id])

  const adminPending = useMemo(() => {
    if (!isAdminView) return 0
    const upcomingIds = new Set(upcomingRaces.map((r) => r.id))
    return registrations.filter((r) => upcomingIds.has(r.race_id) && r.status === 'interested').length
  }, [isAdminView, upcomingRaces, registrations])

  const firstName = currentUser.nickname || currentUser.name.split(' ')[0]
  const todayLabel = new Date().toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-4 pb-8 pt-2">
      {/* Saudação */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)] first-letter:uppercase">
          {todayLabel}
        </p>
        <h1 className="font-display font-extrabold text-xl text-[var(--text-1)] tracking-tight">
          Olá, {firstName} 👋
        </h1>
      </div>

      {/* Alerta de gestão (apenas Admin) */}
      {adminPending > 0 && (
        <button
          type="button"
          onClick={() => navigate('/equipa')}
          className="w-full iron-card p-3.5 flex items-center justify-between gap-3 text-left border-rose-400/40 cursor-pointer"
        >
          <span className="flex items-center gap-2.5 text-xs text-[var(--text-2)]">
            <span className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
            </span>
            <span>
              <strong className="text-[var(--text-1)]">{adminPending} inscrições</strong> aguardam
              confirmação nas próximas provas.
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-[var(--text-3)] shrink-0" />
        </button>
      )}

      {/* Próxima Prova */}
      <section className="space-y-2">
        <SectionTitle title="Próxima prova" action="Ver todas" onAction={() => navigate('/corridas')} />
        {nextRace ? (
          <div
            onClick={() => setSelectedRaceId(nextRace.id)}
            className="iron-card relative overflow-hidden p-4 border border-amber-400/40 cursor-pointer space-y-3 group active:scale-[0.99]"
          >
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-400/30 flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {CATEGORIA_LABELS[nextRace.category].label}
              </span>
              <span className="text-xs font-semibold text-[var(--text-2)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                {formatShortDate(nextRace.date)} • {nextRace.start_time}
              </span>
            </div>

            <div className="relative">
              <h2 className="font-display font-extrabold text-base text-[var(--text-1)] leading-snug">
                {nextRace.title}
              </h2>
              <p className="text-xs text-[var(--text-2)] flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                {nextRace.location}
              </p>
            </div>

            {(() => {
              const regs = registrations.filter(
                (r) => r.race_id === nextRace.id && r.status !== 'cancelled'
              )
              const van = computeVanAllocation(nextRace, regs)
              const myReg = regs.find((r) => r.athlete_id === currentUser.id && !r.is_dependent)
              return (
                <div className="pt-2.5 border-t border-[var(--border-card)] flex items-center justify-between text-xs relative">
                  <div className="flex items-center gap-3 text-[var(--text-2)]">
                    <span className="font-semibold flex items-center gap-1.5 text-[var(--text-1)]">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      {regs.length} atletas
                    </span>
                    {nextRace.van_available && (
                      <span className="flex items-center gap-1">
                        <Bus className="w-3.5 h-3.5 text-amber-500" />
                        {van.confirmedPassengers.length}/{van.capacity}
                      </span>
                    )}
                  </div>
                  {myReg ? (
                    <span className="font-bold text-emerald-500 bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Inscrito ({myReg.distance})
                    </span>
                  ) : (
                    <span className="font-bold text-sky-400 flex items-center gap-1 text-xs">
                      Inscrever <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        ) : (
          <EmptyCard text="Não há provas futuras agendadas." />
        )}
      </section>

      {/* Próximo Treino */}
      <section className="space-y-2">
        <SectionTitle title="Próximo treino / evento" action="Ver treinos" onAction={() => navigate('/treinos')} />
        {nextEvent ? (
          (() => {
            const dm = formatDayMonth(nextEvent.date)
            const going = nextEvent.attendees.filter((a) => a.status === 'going').length
            const myRsvp = nextEvent.attendees.find((a) => a.athlete_id === currentUser.id)?.status
            return (
              <div className="iron-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-card)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-sky-400 uppercase leading-none">{dm.month}</span>
                    <span className="font-display font-black text-lg text-[var(--text-1)] leading-tight mt-0.5">
                      {dm.day}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${
                        nextEvent.type === 'training'
                          ? 'bg-sky-500/15 text-sky-400 border-sky-400/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-400/30'
                      }`}
                    >
                      {nextEvent.type === 'training' ? 'Treino' : 'Convívio'}
                    </span>
                    <h3 className="font-display font-bold text-sm text-[var(--text-1)] mt-1 truncate">
                      {nextEvent.title}
                    </h3>
                    <div className="text-[11px] text-[var(--text-2)] flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        {nextEvent.time}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        {nextEvent.location}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-card)]">
                  <span className="text-[11px] text-[var(--text-3)]">{going} confirmados</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => rsvpEvent(nextEvent.id, 'going')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition ${
                        myRsvp === 'going'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-[var(--surface-raised)] text-[var(--text-2)] border-[var(--border-card)]'
                      }`}
                    >
                      <Check className="w-3 h-3" /> Vou
                    </button>
                    <button
                      type="button"
                      onClick={() => rsvpEvent(nextEvent.id, 'maybe')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition ${
                        myRsvp === 'maybe'
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-[var(--surface-raised)] text-[var(--text-2)] border-[var(--border-card)]'
                      }`}
                    >
                      <HelpCircle className="w-3 h-3" /> Talvez
                    </button>
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          <EmptyCard text="Não há treinos marcados." />
        )}
      </section>

      {/* Aviso em destaque */}
      <section className="space-y-2">
        <SectionTitle
          title={unreadNotificationsCount > 0 ? `Avisos (${unreadNotificationsCount} por ler)` : 'Avisos'}
          action="Ver todos"
          onAction={() => navigate('/avisos')}
        />
        {featuredNotice ? (
          <button
            type="button"
            onClick={() => {
              markNotificationRead(featuredNotice.id)
              navigate('/avisos')
            }}
            className={`w-full text-left iron-card p-3.5 space-y-1 cursor-pointer ${
              !featuredNotice.read_by.includes(currentUser.id) ? 'border-sky-400/50' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)]">
              <Megaphone className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-semibold text-[var(--text-2)]">{featuredNotice.created_by_name}</span>
              {!featuredNotice.read_by.includes(currentUser.id) && (
                <span className="ml-auto text-[11px] font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-full border border-sky-400/40">
                  Novo
                </span>
              )}
            </div>
            <div className="font-display font-bold text-sm text-[var(--text-1)]">{featuredNotice.title}</div>
            <p className="text-xs text-[var(--text-2)] line-clamp-2">{featuredNotice.message}</p>
          </button>
        ) : (
          <EmptyCard text="Sem avisos de momento." />
        )}
      </section>

      {/* As minhas inscrições */}
      <section className="space-y-2">
        <SectionTitle title={`As minhas inscrições (${myUpcoming.length})`} />
        {myUpcoming.length === 0 ? (
          <EmptyCard
            text="Ainda não estás inscrito em nenhuma prova futura."
            action="Explorar corridas"
            onAction={() => navigate('/corridas')}
          />
        ) : (
          <div className="space-y-2">
            {myUpcoming.slice(0, 4).map(({ race, regs }) => {
              const dm = formatDayMonth(race.date)
              return (
                <button
                  key={race.id}
                  type="button"
                  onClick={() => setSelectedRaceId(race.id)}
                  className="w-full text-left iron-card iron-card-interactive p-3 flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-card)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-sky-400 uppercase leading-none">{dm.month}</span>
                    <span className="font-display font-black text-sm text-[var(--text-1)] leading-tight">{dm.day}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-[var(--text-1)] truncate">{race.title}</div>
                    <div className="text-[11px] text-[var(--text-3)] truncate">
                      {regs.map((r) => r.athlete_name.split(' (')[0].split(' ')[0]).join(', ')} •{' '}
                      {regs[0].distance}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </section>

      {selectedRace && (
        <RaceDetailModal race={selectedRace} onClose={() => setSelectedRaceId(null)} />
      )}
    </div>
  )
}

const SectionTitle: React.FC<{ title: string; action?: string; onAction?: () => void }> = ({
  title,
  action,
  onAction,
}) => (
  <div className="flex items-center justify-between">
    <h2 className="font-display font-extrabold text-xs uppercase tracking-wider text-[var(--text-3)]">{title}</h2>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="text-[11px] font-bold text-sky-400 hover:underline cursor-pointer py-1.5 px-2 -mr-2 min-h-[38px] sm:min-h-[44px] inline-flex items-center gap-0.5"
      >
        {action} <ChevronRight className="w-3 h-3" />
      </button>
    )}
  </div>
)

const EmptyCard: React.FC<{ text: string; action?: string; onAction?: () => void }> = ({
  text,
  action,
  onAction,
}) => (
  <div className="iron-card p-4 text-center text-xs text-[var(--text-3)] space-y-2">
    <p>{text}</p>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-sky-500/15 text-sky-400 border border-sky-400/30 font-bold text-xs cursor-pointer active:scale-95 transition"
      >
        {action} <ChevronRight className="w-3 h-3" />
      </button>
    )}
  </div>
)
