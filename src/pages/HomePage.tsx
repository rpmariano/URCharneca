import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  CheckCircle2,
  ChevronRight,
  Flame,
  Users,
  Megaphone,
  ShieldCheck,
  Clock,
  Check,
  HelpCircle,
  Zap,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Race } from '../types'
import { CATEGORIA_LABELS } from '../types'
import { formatDayMonth, computeVanAllocation, getDaysFromReference } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { RaceDetailModal } from '../components/RaceDetailModal'

/**
 * Página Inicial (/) — Painel da Armada Azul (Estilo Nike+ Run Club - NRC).
 * Tipografia agressiva e atlética, preto profundo, Nike Volt (#d8ff00) e telemetria de corrida.
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

  // Dias até à próxima prova
  const daysUntilRace = nextRace ? getDaysFromReference(nextRace.date, today) : null

  return (
    <div className="space-y-5 pb-8 pt-2">
      {/* Saudação Atlética Nike+ Run Club */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--run)]">
            <span className="w-2 h-2 rounded-full bg-[var(--run)] shadow-[0_0_8px_#d8ff00]" />
            <span>NRC CHARNECA • JUST DO IT</span>
          </div>
          <h1 className="font-display font-black text-3xl uppercase tracking-tighter text-[var(--text-1)] italic mt-0.5">
            Olá, {firstName}
          </h1>
          <p className="text-xs text-[var(--text-3)] capitalize mt-0.5">{todayLabel}</p>
        </div>

        {/* Badge de estatística rápida do utilizador */}
        <div className="text-right">
          <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-3)]">Inscrições</div>
          <div className="font-display font-black text-2xl italic text-[var(--run)] flex items-center justify-end gap-1">
            <Activity className="w-4 h-4 text-[var(--run)]" />
            {myUpcoming.length}
          </div>
        </div>
      </div>

      {/* Alerta de gestão (apenas Admin) */}
      {adminPending > 0 && (
        <button
          type="button"
          onClick={() => navigate('/equipa')}
          className="w-full iron-card p-3.5 flex items-center justify-between gap-3 text-left border-rose-400/40 cursor-pointer active:scale-[0.99] transition"
        >
          <span className="flex items-center gap-2.5 text-xs text-[var(--text-2)]">
            <span className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-rose-400" />
            </span>
            <span>
              <strong className="text-[var(--text-1)] font-bold">{adminPending} inscrições</strong> aguardam
              confirmação oficial nas próximas provas.
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-[var(--text-3)] shrink-0" />
        </button>
      )}

      {/* Hero da Próxima Prova — Telemetria HUD Nike+ Run Club */}
      <section className="space-y-2">
        <SectionTitle
          title="Próxima Corrida"
          action="Agenda completa"
          onAction={() => navigate('/atividades?tab=corridas')}
        />
        {nextRace ? (
          (() => {
            const regs = registrations.filter(
              (r) => r.race_id === nextRace.id && r.status !== 'cancelled'
            )
            const van = computeVanAllocation(nextRace, regs)
            const myReg = regs.find((r) => r.athlete_id === currentUser.id && !r.is_dependent)
            const primaryDistance = nextRace.distances[0] || '10 km'

            let countdownLabel = ''
            if (daysUntilRace === 0) countdownLabel = 'É HOJE! 🔥'
            else if (daysUntilRace === 1) countdownLabel = 'AMANHÃ! ⚡'
            else if (daysUntilRace !== null && daysUntilRace > 0 && daysUntilRace <= 7)
              countdownLabel = `FALTAM ${daysUntilRace} DIAS ⚡`
            else if (daysUntilRace !== null && daysUntilRace > 7)
              countdownLabel = `EM ${daysUntilRace} DIAS`

            return (
              <div
                onClick={() => setSelectedRaceId(nextRace.id)}
                className="iron-card relative overflow-hidden p-5 border border-white/15 cursor-pointer space-y-4 group active:scale-[0.99] transition rounded-2xl"
                style={{
                  background: 'linear-gradient(160deg, #16161a 0%, #0c0c0e 100%)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Glow de fundo Nike Volt */}
                <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[var(--run)]/15 blur-3xl pointer-events-none" />

                {/* Linha de topo: Contagem decrescente + Categoria */}
                <div className="flex items-center justify-between relative gap-2 flex-wrap">
                  {countdownLabel && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--run)] text-black font-display italic flex items-center gap-1.5 shadow-[0_0_12px_rgba(216,255,0,0.4)]">
                      <Zap className="w-3.5 h-3.5 stroke-[3]" />
                      {countdownLabel}
                    </span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    {CATEGORIA_LABELS[nextRace.category].label}
                  </span>
                </div>

                {/* Título & Local */}
                <div className="relative">
                  <h2 className="font-display font-black text-2xl uppercase italic text-[var(--text-1)] leading-tight tracking-tight">
                    {nextRace.title}
                  </h2>
                  <p className="text-xs text-[var(--text-2)] flex items-center gap-1.5 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--run)] shrink-0" />
                    <span>{nextRace.location}</span>
                  </p>
                </div>

                {/* Telemetria HUD (4 Métricas NRC em Volt) */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center">
                  <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-3)]">
                      Distância
                    </div>
                    <div className="font-display font-black italic text-lg text-white mt-0.5 truncate">
                      {primaryDistance.replace(/km/i, '').trim()}
                      <span className="text-[10px] font-bold text-[var(--run)] ml-0.5">km</span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-3)]">
                      Partida
                    </div>
                    <div className="font-display font-black italic text-lg text-white mt-0.5">
                      {nextRace.start_time}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-3)]">
                      Plantel
                    </div>
                    <div className="font-display font-black italic text-lg text-[var(--run)] mt-0.5">
                      {regs.length}
                      <span className="text-[9px] font-normal text-[var(--text-3)] ml-0.5">atle</span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-3)]">
                      Carrinha
                    </div>
                    <div className="font-display font-black italic text-lg text-amber-400 mt-0.5">
                      {van.confirmedPassengers.length}
                      <span className="text-[9px] font-normal text-[var(--text-3)]">/{van.capacity}</span>
                    </div>
                  </div>
                </div>

                {/* Botão de Ação Tátil Nike+ Run Club */}
                <div className="pt-1">
                  {myReg ? (
                    <div className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-between bg-emerald-500/15 border border-emerald-400/40 text-emerald-400">
                      <span className="flex items-center gap-2 font-display uppercase tracking-wider font-black italic">
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        Inscrito ({myReg.distance})
                      </span>
                      <span className="text-[11px] text-[var(--text-2)] flex items-center gap-1 font-semibold">
                        Ver Carrinha & Detalhes <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ) : (
                    <div
                      className="w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-black font-display italic transition active:scale-[0.98] shadow-[0_0_20px_rgba(216,255,0,0.35)]"
                      style={{
                        background: 'var(--grad-run)',
                      }}
                    >
                      <span>Participar na Prova</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            )
          })()
        ) : (
          <EmptyCard text="Não há provas futuras agendadas." />
        )}
      </section>

      {/* Próximo Treino — Card Estilo Workout NRC */}
      <section className="space-y-2">
        <SectionTitle
          title="Próximo Treino"
          action="Agenda completa"
          onAction={() => navigate('/atividades?tab=treinos')}
        />
        {nextEvent ? (
          (() => {
            const dm = formatDayMonth(nextEvent.date)
            const going = nextEvent.attendees.filter((a) => a.status === 'going').length
            const myRsvp = nextEvent.attendees.find((a) => a.athlete_id === currentUser.id)?.status
            return (
              <div className="iron-card p-4 space-y-3.5 rounded-2xl border-l-4 border-l-[var(--run)]">
                <div className="flex items-start gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-card)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-[var(--run)] uppercase tracking-wider leading-none">
                      {dm.month}
                    </span>
                    <span className="font-display font-black text-xl text-[var(--text-1)] leading-tight mt-0.5">
                      {dm.day}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded font-display italic ${
                          nextEvent.type === 'training'
                            ? 'bg-[var(--run)] text-black'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {nextEvent.type === 'training' ? '🏃 Treino URC' : '🍻 Convívio'}
                      </span>
                      <span className="text-[11px] font-bold text-[var(--text-3)] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--run)]" />
                        {nextEvent.time}
                      </span>
                    </div>

                    <h3 className="font-display font-black text-base uppercase italic tracking-tight text-[var(--text-1)] mt-1 truncate">
                      {nextEvent.title}
                    </h3>
                    <p className="text-xs text-[var(--text-2)] flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
                      {nextEvent.location}
                    </p>
                  </div>
                </div>

                {/* RSVP Tátil */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-card)]">
                  <span className="text-xs font-semibold text-[var(--text-2)] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[var(--run)]" />
                    <strong>{going}</strong> confirmados
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => rsvpEvent(nextEvent.id, 'going')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-black border flex items-center gap-1.5 cursor-pointer transition active:scale-95 uppercase tracking-wider ${
                        myRsvp === 'going'
                          ? 'bg-[var(--run)] text-black border-lime-300 font-extrabold shadow-sm'
                          : 'bg-[var(--surface-raised)] text-[var(--text-2)] border-[var(--border-card)] hover:border-lime-300/50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Vou
                    </button>
                    <button
                      type="button"
                      onClick={() => rsvpEvent(nextEvent.id, 'maybe')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-black border flex items-center gap-1.5 cursor-pointer transition active:scale-95 uppercase tracking-wider ${
                        myRsvp === 'maybe'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-xs'
                          : 'bg-[var(--surface-raised)] text-[var(--text-2)] border-[var(--border-card)] hover:border-amber-400/50'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" /> Talvez
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
          title={unreadNotificationsCount > 0 ? `Avisos (${unreadNotificationsCount} por ler)` : 'Avisos da Equipa'}
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
            className={`w-full text-left iron-card p-4 space-y-1.5 cursor-pointer active:scale-[0.99] transition rounded-2xl ${
              !featuredNotice.read_by.includes(currentUser.id) ? 'border-[var(--run)]/60' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)]">
              <Megaphone className="w-3.5 h-3.5 text-[var(--run)]" />
              <span className="font-semibold text-[var(--text-2)]">{featuredNotice.created_by_name}</span>
              {!featuredNotice.read_by.includes(currentUser.id) && (
                <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-black bg-[var(--run)] px-2 py-0.5 rounded-full font-display italic">
                  Novo
                </span>
              )}
            </div>
            <div className="font-display font-black text-sm uppercase italic tracking-tight text-[var(--text-1)]">{featuredNotice.title}</div>
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
            action="Explorar Atividades"
            onAction={() => navigate('/atividades')}
          />
        ) : (
          <div className="space-y-2.5">
            {myUpcoming.slice(0, 4).map(({ race, regs }) => {
              const dm = formatDayMonth(race.date)
              return (
                <button
                  key={race.id}
                  type="button"
                  onClick={() => setSelectedRaceId(race.id)}
                  className="w-full text-left iron-card iron-card-interactive p-3.5 flex items-center gap-3.5 cursor-pointer active:scale-[0.99] transition rounded-2xl"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-card)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-[var(--run)] uppercase leading-none">{dm.month}</span>
                    <span className="font-display font-black text-base text-[var(--text-1)] leading-tight mt-0.5">{dm.day}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-[var(--text-1)] truncate">{race.title}</div>
                    <div className="text-xs text-[var(--text-3)] flex items-center gap-1.5 mt-0.5">
                      <span className="font-black text-black bg-[var(--run)] px-1.5 py-0.5 rounded text-[9px] uppercase italic">
                        {regs[0].distance}
                      </span>
                      <span>•</span>
                      <span className="truncate">
                        {regs.map((r) => r.athlete_name.split(' (')[0].split(' ')[0]).join(', ')}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-3)] shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
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
        className="text-xs font-bold text-[var(--run)] hover:underline cursor-pointer py-1 px-1 inline-flex items-center gap-0.5"
      >
        {action} <ChevronRight className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
)

const EmptyCard: React.FC<{ text: string; action?: string; onAction?: () => void }> = ({
  text,
  action,
  onAction,
}) => (
  <div className="iron-card p-5 text-center text-xs text-[var(--text-3)] space-y-2.5">
    <p>{text}</p>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs cursor-pointer active:scale-95 transition text-slate-950 font-display uppercase tracking-wider"
        style={{
          background: 'var(--grad-run)',
        }}
      >
        {action} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
)
