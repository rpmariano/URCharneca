import React, { useMemo, useState, useEffect } from 'react'
import {
  CalendarDays,
  MapPin,
  Clock,
  Plus,
  Users,
  Check,
  HelpCircle,
  X,
  Shirt,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLocation, useNavigate } from 'react-router-dom'
import type { TeamEventType, Race } from '../types'
import { formatDayMonth, formatShortDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { RaceDetailModal } from '../components/RaceDetailModal'
import { Sheet } from '../components/Sheet'

export const TrainingsPage: React.FC = () => {
  const { events, races, currentUser, rsvpEvent, createEvent } = useApp()

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedRace, setSelectedRace] = useState<Race | null>(null)
  const [kindFilter, setKindFilter] = useState<'all' | 'training' | 'social'>('all')

  // Abertura do formulário pedida pelo FAB (via estado de navegação, sem setTimeout)
  const routerLocation = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const state = routerLocation.state as { openCreate?: boolean } | null
    if (state?.openCreate) {
      setCreateOpen(true)
      navigate(routerLocation.pathname, { replace: true, state: null })
    }
  }, [routerLocation, navigate])

  // Estado do Calendário: Ano e Mês (inicia no mês atual)
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth()) // 0 = Jan
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null)

  // Form de Criar Treino
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TeamEventType>('training')
  const [date, setDate] = useState('2026-11-12')
  const [time, setTime] = useState('18:00')
  const [location, setLocation] = useState('Quinta da Marinha, Cascais')
  const [workoutPlan, setWorkoutPlan] = useState('')
  const [description, setDescription] = useState('')
  const [requiresKit, setRequiresKit] = useState(false)

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  // Mapear eventos e corridas por dia (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, { trainings: typeof events; races: typeof races }>()

    for (const e of events) {
      const entry = map.get(e.date) || { trainings: [], races: [] }
      entry.trainings.push(e)
      map.set(e.date, entry)
    }

    for (const r of races) {
      const entry = map.get(r.date) || { trainings: [], races: [] }
      entry.races.push(r)
      map.set(r.date, entry)
    }

    return map
  }, [events, races])

  // Gerar a matriz do calendário do mês selecionado
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)

    // Ajustar para segunda-feira como primeiro dia (0 = Domingo -> 6, 1 = Segunda -> 0)
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek === -1) startDayOfWeek = 6

    const totalDays = lastDay.getDate()
    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = []

    // Dias do mês anterior para preencher a primeira semana
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ dateStr, dayNumber: d, isCurrentMonth: false })
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ dateStr, dayNumber: d, isCurrentMonth: true })
    }

    // Dias do próximo mês para completar a grelha
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        days.push({ dateStr, dayNumber: d, isCurrentMonth: false })
      }
    }

    return days
  }, [currentYear, currentMonth])

  // Lista de atividades a apresentar:
  //  - com dia selecionado: tudo o que acontece nesse dia
  //  - sem dia selecionado: todas as atividades a partir de hoje
  // Treinos, convívios e corridas são intercalados cronologicamente.
  const today = todayISO()

  const displayedEvents = useMemo(() => {
    const base = selectedDateStr
      ? events.filter((e) => e.date === selectedDateStr)
      : events.filter((e) => e.date >= today)
    if (kindFilter === 'training') return base.filter((e) => e.type === 'training')
    if (kindFilter === 'social') return base.filter((e) => e.type !== 'training')
    return base
  }, [events, selectedDateStr, kindFilter, today])

  // As corridas têm o seu próprio separador (/corridas); aqui só aparecem se o
  // utilizador tocar num dia específico do calendário mensal que tenha prova.
  const displayedRaces = useMemo(() => {
    if (!selectedDateStr) return []
    return races.filter((r) => r.date === selectedDateStr)
  }, [races, selectedDateStr])

  type AgendaItem =
    | { kind: 'race'; key: string; sortKey: string; race: Race }
    | { kind: 'event'; key: string; sortKey: string; evt: (typeof events)[number] }

  const agendaItems = useMemo<AgendaItem[]>(() => {
    const items: AgendaItem[] = [
      ...displayedRaces.map((race) => ({
        kind: 'race' as const,
        key: `r-${race.id}`,
        sortKey: `${race.date} ${race.start_time || ''}`,
        race,
      })),
      ...displayedEvents.map((evt) => ({
        kind: 'event' as const,
        key: `e-${evt.id}`,
        sortKey: `${evt.date} ${evt.time || ''}`,
        evt,
      })),
    ]
    return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [displayedRaces, displayedEvents])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !location.trim()) return
    createEvent({
      title: title.trim(),
      type,
      date,
      time,
      location: location.trim(),
      description: description.trim() || 'Aberto a todos os atletas da U.R. Charneca.',
      workout_plan: workoutPlan.trim() || undefined,
      requires_official_kit: requiresKit,
    })
    setTitle('')
    setWorkoutPlan('')
    setDescription('')
    setCreateOpen(false)
  }

  return (
    <div className="space-y-4 pb-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-xl text-[var(--text-1)] tracking-tight">
              Treinos & Convívios
            </h1>
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-400/30">
              TREINOS
            </span>
          </div>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Sessões semanais na Quinta da Marinha, planos e convívios
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-xs shadow-md transition active:scale-95 cursor-pointer text-slate-950 border border-sky-300 bg-gradient-to-r from-sky-400 to-blue-500 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Marcar Treino</span>
        </button>
      </div>

      {/* =========================================================================
          CALENDÁRIO INTERATIVO VISUAL (ESTILO IRONCOACH MEIO-TERMO)
         ========================================================================= */}
      <div className="iron-card p-4 space-y-3.5">
        {/* Navegação de Mês */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-sky-400" />
            <h2 className="font-display font-black text-sm text-[var(--text-1)]">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl hover:bg-white/10 text-[var(--text-3)] hover:text-[var(--text-1)] transition cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                setCurrentYear(now.getFullYear())
                setCurrentMonth(now.getMonth())
                setSelectedDateStr(today)
              }}
              className="px-3 py-2 min-h-[40px] inline-flex items-center justify-center rounded-xl text-xs font-bold text-sky-300 bg-sky-500/15 border border-sky-400/30 hover:bg-sky-500/25 transition cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl hover:bg-white/10 text-[var(--text-3)] hover:text-[var(--text-1)] transition cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--text-3)]">
          <div>SEG</div>
          <div>TER</div>
          <div>QUA</div>
          <div>QUI</div>
          <div>SEX</div>
          <div>SÁB</div>
          <div>DOM</div>
        </div>

        {/* Grelha dos Dias do Mês */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((cd) => {
            const isSelected = selectedDateStr === cd.dateStr
            const isToday = cd.dateStr === today
            const dayData = eventsByDate.get(cd.dateStr)
            const hasTraining = dayData?.trainings.some((t) => t.type === 'training')
            const hasSocial = dayData?.trainings.some((t) => t.type === 'social')
            const hasRace = dayData && dayData.races.length > 0

            return (
              <button
                key={cd.dateStr}
                type="button"
                onClick={() => {
                  if (selectedDateStr === cd.dateStr) {
                    setSelectedDateStr(null)
                  } else {
                    setSelectedDateStr(cd.dateStr)
                  }
                }}
                className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition cursor-pointer active:scale-95 border ${
                  isSelected
                    ? 'bg-gradient-to-tr from-sky-500 to-blue-600 text-white border-sky-400 shadow-md font-bold'
                    : isToday
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/40 font-bold'
                    : cd.isCurrentMonth
                    ? 'bg-white/5 border-white/5 text-[var(--text-2)] hover:bg-white/10 hover:border-white/15'
                    : 'bg-transparent border-transparent opacity-30 text-[var(--text-3)]'
                }`}
              >
                <span className={`text-xs font-bold leading-none ${isSelected ? 'text-white' : ''}`}>
                  {cd.dayNumber}
                </span>

                {/* Marcadores coloridos de atividade no dia */}
                <div className="flex items-center gap-0.5 mt-1">
                  {hasTraining && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.6)]'
                      }`}
                      title="Treino"
                    />
                  )}
                  {hasRace && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-200' : 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.6)]'
                      }`}
                      title="Prova / Corrida"
                    />
                  )}
                  {hasSocial && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-rose-200' : 'bg-rose-400 shadow-[0_0_4px_rgba(244,63,94,0.6)]'
                      }`}
                      title="Convívio / Evento"
                    />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legenda simples e botão de limpar filtro */}
        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-[var(--text-3)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              Treino
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Prova
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
              Convívio
            </span>
          </div>

          {selectedDateStr && (
            <button
              type="button"
              onClick={() => setSelectedDateStr(null)}
              className="text-sky-400 font-bold hover:underline cursor-pointer py-1.5 px-2 -mr-1 inline-flex items-center"
            >
              Ver todos
            </button>
          )}
        </div>
      </div>

      {/* Filtro por tipo de sessão */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
        {(
          [
            { id: 'all', label: 'Todos' },
            { id: 'training', label: '🏃 Treinos' },
            { id: 'social', label: '❤️ Convívios' },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setKindFilter(f.id)}
            className={`px-4 py-2.5 min-h-[44px] inline-flex items-center justify-center rounded-full text-xs font-bold whitespace-nowrap border transition cursor-pointer active:scale-95 ${
              kindFilter === f.id
                ? 'bg-sky-500/20 text-sky-400 border-sky-400/50'
                : 'bg-[var(--surface-raised)] text-[var(--text-3)] border-[var(--border-card)] hover:text-[var(--text-1)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Título da secção */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-[var(--text-3)]">
          {selectedDateStr
            ? `Atividades em ${formatShortDate(selectedDateStr)}`
            : 'Próximos Treinos & Convívios'}
        </h3>
        <span className="text-[11px] text-sky-400 font-semibold">
          {agendaItems.length} {selectedDateStr ? 'atividade(s)' : 'sessão(ões)'}
        </span>
      </div>

      {/* Lista unificada: Treinos, Convívios e Corridas (ordem cronológica) */}
      {agendaItems.length === 0 ? (
        <div className="iron-card p-6 text-center text-xs text-[var(--text-3)] space-y-2.5">
          <p>
            {selectedDateStr
              ? 'Não há nenhuma atividade marcada para esta data.'
              : 'Não há atividades futuras para este filtro.'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (selectedDateStr) setDate(selectedDateStr)
              setCreateOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-400/30 font-bold text-xs hover:bg-sky-500/25 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {selectedDateStr ? 'Marcar treino neste dia' : 'Marcar treino'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agendaItems.map((item) => {
            if (item.kind === 'race') {
              const race = item.race
              const rdm = formatDayMonth(race.date)
              return (
                <div
                  key={item.key}
                  onClick={() => setSelectedRace(race)}
                  className="iron-card iron-card-interactive p-3.5 flex items-center justify-between gap-3 cursor-pointer border border-amber-400/40 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/40 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-amber-500 leading-none uppercase">
                        {rdm.month}
                      </span>
                      <span className="font-display font-black text-lg text-[var(--text-1)] leading-tight mt-0.5">
                        {rdm.day}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase bg-amber-500/20 text-amber-500 border border-amber-400/30 px-2 py-0.5 rounded flex items-center gap-0.5">
                          <Trophy className="w-2.5 h-2.5" /> Corrida
                        </span>
                        <span className="text-xs text-[var(--text-3)] font-medium">{race.start_time}</span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-[var(--text-1)] mt-0.5 truncate">
                        {race.title}
                      </h4>
                      <div className="text-[11px] text-[var(--text-3)] truncate">{race.location}</div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5 shrink-0 group-hover:translate-x-0.5 transition">
                    Ver →
                  </span>
                </div>
              )
            }

            const evt = item.evt
            const dm = formatDayMonth(evt.date)
            const going = evt.attendees.filter((a) => a.status === 'going')
            const myRsvp = evt.attendees.find((a) => a.athlete_id === currentUser.id)?.status

            return (
              <div
                key={item.key}
                className="iron-card p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-sky-400 leading-none uppercase">
                      {dm.month}
                    </span>
                    <span className="font-display font-black text-lg text-[var(--text-1)] leading-tight mt-0.5">
                      {dm.day}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                          evt.type === 'training'
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-400/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-400/30'
                        }`}
                      >
                        {evt.type === 'training' ? 'Treino' : 'Convívio'}
                      </span>
                      {evt.requires_official_kit && (
                        <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded flex items-center gap-0.5">
                          <Shirt className="w-2.5 h-2.5" /> Equipamento
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-sm text-[var(--text-1)] leading-snug mt-1">
                      {evt.title}
                    </h3>

                    <div className="text-[11px] text-[var(--text-2)] flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        {evt.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        {evt.location}
                      </span>
                    </div>
                  </div>
                </div>

                {evt.workout_plan && (
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-[var(--text-2)]">
                    <span className="font-bold text-sky-300">Plano:</span> {evt.workout_plan}
                  </div>
                )}

                {/* Botões de Presença e Participantes */}
                <div className="pt-2.5 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--text-2)] font-medium text-[11px]">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      {going.length} confirmados: {going.map((g) => g.athlete_name.split(' ')[0]).join(', ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => rsvpEvent(evt.id, 'going')}
                      className={`py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer border active:scale-95 ${
                        myRsvp === 'going'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                          : 'bg-white/5 text-[var(--text-2)] border-white/10 hover:bg-white/10 hover:text-[var(--text-1)]'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      Vou
                    </button>
                    <button
                      type="button"
                      onClick={() => rsvpEvent(evt.id, 'maybe')}
                      className={`py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer border active:scale-95 ${
                        myRsvp === 'maybe'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                          : 'bg-white/5 text-[var(--text-2)] border-white/10 hover:bg-white/10 hover:text-[var(--text-1)]'
                      }`}
                    >
                      <HelpCircle className="w-3 h-3 stroke-[2.5]" />
                      Talvez
                    </button>
                    <button
                      type="button"
                      onClick={() => rsvpEvent(evt.id, 'not_going')}
                      className={`py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer border active:scale-95 ${
                        myRsvp === 'not_going'
                          ? 'bg-slate-700 text-slate-200 border-slate-600'
                          : 'bg-white/5 text-[var(--text-3)] border-white/10 hover:bg-white/10 hover:text-[var(--text-1)]'
                      }`}
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                      Não
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar Treino */}
      {createOpen && (
        <Sheet onClose={() => setCreateOpen(false)} ariaLabel="Marcar treino">
          <div className="px-5 pt-2 pb-5 space-y-4 text-xs overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="font-display font-black text-base text-[var(--text-1)] flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-sky-400" />
                Marcar Treino ou Convívio
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-full text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-[var(--text-2)]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('training')}
                  className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                    type === 'training'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'bg-white/5 border-white/10 text-[var(--text-3)] hover:text-[var(--text-1)]'
                  }`}
                >
                  🏃 Treino
                </button>
                <button
                  type="button"
                  onClick={() => setType('social')}
                  className={`py-2 rounded-xl font-bold border transition cursor-pointer ${
                    type === 'social'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'bg-white/5 border-white/10 text-[var(--text-3)] hover:text-[var(--text-1)]'
                  }`}
                >
                  ❤️ Convívio
                </button>
              </div>

              <div>
                <label htmlFor="tp-title" className="block font-semibold text-[var(--text-2)] mb-1">Título *</label>
                <input
                  id="tp-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Treino Quinta da Marinha (Z2)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-sky-400 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="tp-date" className="block font-semibold text-[var(--text-2)] mb-1">Data *</label>
                  <input
                    id="tp-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[var(--text-1)] focus:border-sky-400 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label htmlFor="tp-time" className="block font-semibold text-[var(--text-2)] mb-1">Hora *</label>
                  <input
                    id="tp-time"
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[var(--text-1)] focus:border-sky-400 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tp-location" className="block font-semibold text-[var(--text-2)] mb-1">Local *</label>
                <input
                  id="tp-location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Quinta da Marinha / Guia"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-sky-400 focus:outline-none transition"
                />
              </div>

              <div>
                <label htmlFor="tp-workout-plan" className="block font-semibold text-[var(--text-2)] mb-1">
                  Plano / Observações (opcional)
                </label>
                <input
                  id="tp-workout-plan"
                  type="text"
                  value={workoutPlan}
                  onChange={(e) => setWorkoutPlan(e.target.value)}
                  placeholder="Ex: 6 km ritmo conversa"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-sky-400 focus:outline-none transition"
                />
              </div>

              <label htmlFor="tp-requires-kit" className="flex items-center gap-2.5 cursor-pointer">
                <input
                  id="tp-requires-kit"
                  type="checkbox"
                  checked={requiresKit}
                  onChange={(e) => setRequiresKit(e.target.checked)}
                  className="w-4 h-4 accent-sky-400 rounded"
                />
                <span className="text-[var(--text-2)] font-medium">Levar equipamento oficial da Armada Azul</span>
              </label>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-white/10 text-[var(--text-3)] hover:text-[var(--text-1)] font-bold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-black text-slate-950 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 transition cursor-pointer shadow-md"
                >
                  Publicar Treino
                </button>
              </div>
            </form>
          </div>
        </Sheet>
      )}

      {selectedRace && (
        <RaceDetailModal race={selectedRace} onClose={() => setSelectedRace(null)} />
      )}
    </div>
  )
}
