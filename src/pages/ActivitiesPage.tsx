import React, { useMemo, useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Plus,
  Search,
  CheckCircle2,
  ChevronRight,
  Trophy,
  Users,
  Bus,
  Clock,
  MapPin,
  Check,
  HelpCircle,
  X,
  Shirt,
  ChevronLeft,
  Share2,
  Calendar as CalendarIcon,
  ListFilter,
  Zap,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Race, RaceCategory, TeamEvent, TeamEventType } from '../types'
import { CATEGORIA_LABELS } from '../types'
import { formatDayMonth, formatShortDate, computeVanAllocation } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateRace } from '../utils/appEvents'
import { RaceDetailModal } from '../components/RaceDetailModal'
import { Sheet } from '../components/Sheet'

/**
 * AtividadesPage (/atividades) — Menu Unificado NRC (Nike+ Run Club).
 * Une Corridas Oficiais e Treinos/Convívios da equipa num único ecrã atlético.
 */
export const ActivitiesPage: React.FC = () => {
  const { races, events, registrations, currentUser, isAdminView, rsvpEvent, createEvent } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const routerLocation = useLocation()
  const navigate = useNavigate()

  // Tab Principal: 'all' (Tudo), 'races' (Corridas), 'trainings' (Treinos)
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'all' | 'races' | 'trainings'>(() => {
    if (tabParam === 'corridas' || tabParam === 'races') return 'races'
    if (tabParam === 'treinos' || tabParam === 'trainings') return 'trainings'
    return 'all'
  })

  // Sincronizar parâmetro de pesquisa se mudar externamente
  useEffect(() => {
    if (tabParam === 'corridas' || tabParam === 'races') setActiveTab('races')
    else if (tabParam === 'treinos' || tabParam === 'trainings') setActiveTab('trainings')
  }, [tabParam])

  // Modo de visualização: 'list' (Feed Cronológico) ou 'calendar' (Calendário Mensal)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  // Filtros de Corridas
  const [raceCategory, setRaceCategory] = useState<'all' | RaceCategory>('all')
  const [onlyVan, setOnlyVan] = useState(false)
  const [showPast, setShowPast] = useState(false)

  // Filtros de Treinos
  const [trainingType, setTrainingType] = useState<'all' | 'training' | 'social'>('all')

  // Pesquisa
  const [searchQuery, setSearchQuery] = useState('')

  // Modal de Detalhe da Corrida
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null)
  const selectedRace: Race | null = selectedRaceId
    ? races.find((r) => r.id === selectedRaceId) || null
    : null

  // Sheet de Criar Treino
  const [createTrainingOpen, setCreateTrainingOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<TeamEventType>('training')
  const [newDate, setNewDate] = useState('2026-11-12')
  const [newTime, setNewTime] = useState('18:00')
  const [newLocation, setNewLocation] = useState('Quinta da Marinha, Cascais')
  const [newWorkoutPlan, setNewWorkoutPlan] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newRequiresKit, setNewRequiresKit] = useState(false)

  // Abertura pedida via navegação
  useEffect(() => {
    const state = routerLocation.state as { openCreate?: boolean; openCreateRace?: boolean } | null
    if (state?.openCreate) {
      setCreateTrainingOpen(true)
      navigate(routerLocation.pathname, { replace: true, state: null })
    } else if (state?.openCreateRace) {
      openCreateRace()
      navigate(routerLocation.pathname, { replace: true, state: null })
    }
  }, [routerLocation, navigate])

  const today = todayISO()

  // Calendário Mensal
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth())
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null)

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
  const activitiesByDate = useMemo(() => {
    const map = new Map<string, { trainings: TeamEvent[]; races: Race[] }>()
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

  // Gerar dias do mês para o calendário
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    let startDayOfWeek = firstDay.getDay() - 1 // 0 = Seg, 6 = Dom
    if (startDayOfWeek === -1) startDayOfWeek = 6

    const days: Array<{
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      hasTrainings: boolean
      hasRaces: boolean
      hasSocial: boolean
    }> = []

    // Dias anteriores ao primeiro dia do mês
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i
      const prevM = currentMonth === 0 ? 12 : currentMonth
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      const entry = activitiesByDate.get(dateStr)
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        hasTrainings: Boolean(entry?.trainings.some((t) => t.type === 'training')),
        hasRaces: Boolean(entry?.races && entry.races.length > 0),
        hasSocial: Boolean(entry?.trainings.some((t) => t.type === 'social')),
      })
    }

    // Dias do mês atual
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const entry = activitiesByDate.get(dateStr)
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        hasTrainings: Boolean(entry?.trainings.some((t) => t.type === 'training')),
        hasRaces: Boolean(entry?.races && entry.races.length > 0),
        hasSocial: Boolean(entry?.trainings.some((t) => t.type === 'social')),
      })
    }

    // Completar última semana
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextM = currentMonth === 11 ? 1 : currentMonth + 2
        const nextY = currentMonth === 11 ? currentYear + 1 : currentYear
        const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        const entry = activitiesByDate.get(dateStr)
        days.push({
          dateStr,
          dayNum: i,
          isCurrentMonth: false,
          hasTrainings: Boolean(entry?.trainings.some((t) => t.type === 'training')),
          hasRaces: Boolean(entry?.races && entry.races.length > 0),
          hasSocial: Boolean(entry?.trainings.some((t) => t.type === 'social')),
        })
      }
    }

    return days
  }, [currentYear, currentMonth, activitiesByDate])

  // Itens unificados de Atividades
  type UnifiedActivity =
    | { kind: 'race'; id: string; date: string; time: string; race: Race }
    | { kind: 'training'; id: string; date: string; time: string; event: TeamEvent }

  const unifiedList = useMemo<UnifiedActivity[]>(() => {
    const q = searchQuery.trim().toLowerCase()
    const items: UnifiedActivity[] = []

    // Incluir Corridas se aplicável
    if (activeTab === 'all' || activeTab === 'races') {
      for (const r of races) {
        if (!showPast && r.date < today && !selectedDateStr) continue
        if (selectedDateStr && r.date !== selectedDateStr) continue
        if (raceCategory !== 'all' && r.category !== raceCategory) continue
        if (onlyVan && !r.van_available) continue

        if (q) {
          const match =
            r.title.toLowerCase().includes(q) ||
            r.location.toLowerCase().includes(q) ||
            r.distances.some((d) => d.toLowerCase().includes(q))
          if (!match) continue
        }

        items.push({
          kind: 'race',
          id: `race-${r.id}`,
          date: r.date,
          time: r.start_time,
          race: r,
        })
      }
    }

    // Incluir Treinos se aplicável
    if (activeTab === 'all' || activeTab === 'trainings') {
      for (const e of events) {
        if (!showPast && e.date < today && !selectedDateStr) continue
        if (selectedDateStr && e.date !== selectedDateStr) continue
        if (trainingType === 'training' && e.type !== 'training') continue
        if (trainingType === 'social' && e.type !== 'social') continue

        if (q) {
          const match =
            e.title.toLowerCase().includes(q) ||
            e.location.toLowerCase().includes(q) ||
            (e.workout_plan && e.workout_plan.toLowerCase().includes(q))
          if (!match) continue
        }

        items.push({
          kind: 'training',
          id: `event-${e.id}`,
          date: e.date,
          time: e.time,
          event: e,
        })
      }
    }

    return items.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [
    races,
    events,
    activeTab,
    raceCategory,
    onlyVan,
    trainingType,
    showPast,
    searchQuery,
    selectedDateStr,
    today,
  ])

  // Contadores rápidos para os tabs
  const counts = useMemo(() => {
    const upcomingRaces = races.filter((r) => r.date >= today)
    const upcomingEvents = events.filter((e) => e.date >= today)
    return {
      all: upcomingRaces.length + upcomingEvents.length,
      races: upcomingRaces.length,
      trainings: upcomingEvents.length,
    }
  }, [races, events, today])

  const handleTabChange = (tab: 'all' | 'races' | 'trainings') => {
    setActiveTab(tab)
    if (tab === 'races') setSearchParams({ tab: 'corridas' }, { replace: true })
    else if (tab === 'trainings') setSearchParams({ tab: 'treinos' }, { replace: true })
    else setSearchParams({}, { replace: true })
  }

  const handleCreateTrainingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newLocation.trim()) return
    createEvent({
      title: newTitle.trim(),
      type: newType,
      date: newDate,
      time: newTime,
      location: newLocation.trim(),
      description: newDescription.trim() || 'Aberto a todos os atletas da U.R. Charneca.',
      workout_plan: newWorkoutPlan.trim() || undefined,
      requires_official_kit: newRequiresKit,
    })
    setNewTitle('')
    setNewWorkoutPlan('')
    setNewDescription('')
    setCreateTrainingOpen(false)
  }

  return (
    <div className="space-y-4 pb-10 pt-2">
      {/* Cabeçalho NRC com Estilo Atlético Bold */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--run)]">
            <span className="w-2 h-2 rounded-full bg-[var(--run)] shadow-[0_0_8px_#d8ff00]" />
            <span>NRC • ATIVIDADES DO CLUBE</span>
          </div>
          <h1 className="font-display font-black text-2xl uppercase tracking-tighter text-[var(--text-1)] italic mt-0.5">
            Agenda & Corridas
          </h1>
        </div>

        {/* Botão de Criação Rápida */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'trainings' ? (
            <button
              type="button"
              onClick={() => setCreateTrainingOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-black text-xs uppercase tracking-wider text-black bg-[var(--run)] border border-lime-300 shadow-[0_0_16px_rgba(216,255,0,0.35)] cursor-pointer active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Marcar Treino</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openCreateRace()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-black text-xs uppercase tracking-wider text-black bg-[var(--run)] border border-lime-300 shadow-[0_0_16px_rgba(216,255,0,0.35)] cursor-pointer active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{isAdminView ? 'Nova Prova' : 'Partilhar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Control NRC (Tabs: Todas / Corridas / Treinos) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 text-center">
        <button
          type="button"
          onClick={() => handleTabChange('all')}
          className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-[var(--run)] text-black shadow-sm font-display italic'
              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
          }`}
        >
          <span>Todas</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'all' ? 'bg-black/20 text-black' : 'bg-white/10 text-[var(--text-2)]'}`}>
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('races')}
          className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'races'
              ? 'bg-[var(--run)] text-black shadow-sm font-display italic'
              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
          }`}
        >
          <Trophy className="w-3 h-3 stroke-[2.5]" />
          <span>Corridas</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'races' ? 'bg-black/20 text-black' : 'bg-white/10 text-[var(--text-2)]'}`}>
            {counts.races}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('trainings')}
          className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'trainings'
              ? 'bg-[var(--run)] text-black shadow-sm font-display italic'
              : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
          }`}
        >
          <Zap className="w-3 h-3 stroke-[2.5]" />
          <span>Treinos</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'trainings' ? 'bg-black/20 text-black' : 'bg-white/10 text-[var(--text-2)]'}`}>
            {counts.trainings}
          </span>
        </button>
      </div>

      {/* Barra de Pesquisa + Alternador de Visualização (Lista vs Calendário) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Procurar prova, treino, local..."
            className="w-full rounded-2xl bg-white/5 border border-white/10 pl-9 pr-3 py-2.5 min-h-[42px] text-xs text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--run)] transition"
          />
        </div>

        {/* Botão de Alternar Modo Lista / Calendário */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
          className={`px-3 py-2.5 min-h-[42px] rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition cursor-pointer active:scale-95 ${
            viewMode === 'calendar'
              ? 'bg-[var(--run)] text-black border-lime-300 font-black'
              : 'bg-white/5 text-[var(--text-2)] border-white/10 hover:text-white'
          }`}
          title={viewMode === 'list' ? 'Ver em Calendário Mensal' : 'Ver em Lista'}
        >
          {viewMode === 'list' ? (
            <>
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Mês</span>
            </>
          ) : (
            <>
              <ListFilter className="w-4 h-4" />
              <span className="hidden sm:inline">Lista</span>
            </>
          )}
        </button>
      </div>

      {/* Filtros específicos para Corridas quando a tab Corridas está ativa */}
      {activeTab === 'races' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setRaceCategory('all')}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer ${
              raceCategory === 'all'
                ? 'bg-white text-black border-white'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setRaceCategory('trofeu_cascais')}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer flex items-center gap-1 ${
              raceCategory === 'trofeu_cascais'
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            <Trophy className="w-3 h-3" /> Troféu Cascais
          </button>
          <button
            type="button"
            onClick={() => setRaceCategory('equipa')}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer flex items-center gap-1 ${
              raceCategory === 'equipa'
                ? 'bg-blue-400 text-black border-blue-300'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            <Users className="w-3 h-3" /> Pela Equipa
          </button>
          <button
            type="button"
            onClick={() => setRaceCategory('individual')}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer flex items-center gap-1 ${
              raceCategory === 'individual'
                ? 'bg-emerald-400 text-black border-emerald-300'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            <Share2 className="w-3 h-3" /> Individuais
          </button>
          <button
            type="button"
            onClick={() => setOnlyVan((v) => !v)}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer flex items-center gap-1 ${
              onlyVan
                ? 'bg-[var(--run)] text-black border-lime-300'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            <Bus className="w-3 h-3" /> Carrinha
          </button>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer ${
              showPast
                ? 'bg-white/20 text-white border-white/40'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            {showPast ? 'Passadas incluídas' : 'Ver passadas'}
          </button>
        </div>
      )}

      {/* Filtros específicos para Treinos quando a tab Treinos está ativa */}
      {activeTab === 'trainings' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setTrainingType('all')}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer ${
              trainingType === 'all'
                ? 'bg-[var(--run)] text-black border-lime-300'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            Todas as Sessões
          </button>
          <button
            type="button"
            onClick={() => setTrainingType('training')}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer flex items-center gap-1 ${
              trainingType === 'training'
                ? 'bg-[var(--run)] text-black border-lime-300'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            🏃 Treinos Oficiais
          </button>
          <button
            type="button"
            onClick={() => setTrainingType('social')}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer flex items-center gap-1 ${
              trainingType === 'social'
                ? 'bg-rose-500 text-white border-rose-400'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            ❤️ Convívios
          </button>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className={`px-3 py-1.5 rounded-full border whitespace-nowrap font-bold transition cursor-pointer ${
              showPast
                ? 'bg-white/20 text-white border-white/40'
                : 'bg-white/5 text-[var(--text-3)] border-white/10'
            }`}
          >
            {showPast ? 'Passados incluídos' : 'Ver passados'}
          </button>
        </div>
      )}

      {/* Calendário Mensal Interativo quando viewMode === 'calendar' */}
      {viewMode === 'calendar' && (
        <div className="iron-card p-4 space-y-3.5 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[var(--run)]" />
              <h2 className="font-display font-black text-sm uppercase italic tracking-tight text-[var(--text-1)]">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-white/10 text-[var(--text-3)] hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-white/10 text-[var(--text-3)] hover:text-white transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          {/* Grelha de Dias */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d) => {
              const isSelected = selectedDateStr === d.dateStr
              const isToday = d.dateStr === today
              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(isSelected ? null : d.dateStr)}
                  className={`aspect-square p-1 rounded-xl flex flex-col items-center justify-between transition cursor-pointer relative ${
                    isSelected
                      ? 'bg-[var(--run)] text-black font-black shadow-sm'
                      : isToday
                      ? 'bg-white/15 text-white font-extrabold border border-white/30'
                      : d.isCurrentMonth
                      ? 'bg-white/5 text-[var(--text-2)] hover:bg-white/10'
                      : 'opacity-30 text-[var(--text-3)]'
                  }`}
                >
                  <span className="text-xs">{d.dayNum}</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {d.hasRaces && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-amber-400'}`} />
                    )}
                    {d.hasTrainings && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-[var(--run)]'}`} />
                    )}
                    {d.hasSocial && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-rose-400'}`} />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legenda do Calendário */}
          <div className="flex items-center justify-between text-[10px] text-[var(--text-3)] pt-2 border-t border-white/10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Corrida
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--run)]" /> Treino
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Convívio
              </span>
            </div>
            {selectedDateStr && (
              <button
                type="button"
                onClick={() => setSelectedDateStr(null)}
                className="text-[var(--run)] font-bold hover:underline cursor-pointer"
              >
                Limpar filtro de dia
              </button>
            )}
          </div>
        </div>
      )}

      {/* Indicador de Filtro de Data selecionada */}
      {selectedDateStr && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-2)]">
          <span>
            A mostrar atividades de <strong className="text-white">{formatShortDate(selectedDateStr)}</strong>
          </span>
          <button
            type="button"
            onClick={() => setSelectedDateStr(null)}
            className="text-[11px] font-bold text-[var(--run)] hover:underline cursor-pointer"
          >
            Ver tudo
          </button>
        </div>
      )}

      {/* Lista Unificada de Atividades (Corridas + Treinos) */}
      <div className="space-y-3">
        {unifiedList.length === 0 ? (
          <div className="iron-card p-8 text-center text-xs text-[var(--text-3)] space-y-3">
            <p>Nenhuma atividade encontrada com os filtros selecionados.</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedDateStr(null)
                  setRaceCategory('all')
                }}
                className="px-3.5 py-1.5 rounded-full bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        ) : (
          unifiedList.map((item) => {
            if (item.kind === 'race') {
              const race = item.race
              const dm = formatDayMonth(race.date)
              const raceRegs = registrations.filter(
                (r) => r.race_id === race.id && r.status !== 'cancelled'
              )
              const myRegs = raceRegs.filter((r) => r.athlete_id === currentUser.id)
              const pendingAdmin = raceRegs.filter((r) => r.status === 'interested').length
              const van = computeVanAllocation(race, raceRegs)
              const isPast = race.date < today

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedRaceId(race.id)}
                  className={`iron-card iron-card-interactive p-4 cursor-pointer flex items-center justify-between gap-3.5 group rounded-2xl active:scale-[0.99] transition border-l-4 border-l-amber-400 ${
                    isPast ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Bloco de Data Atlético NRC */}
                    <div className="w-13 h-13 rounded-2xl border flex flex-col items-center justify-center shrink-0 bg-amber-500/10 border-amber-400/30 text-amber-400">
                      <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                        {dm.month}
                      </span>
                      <span className="font-display font-black text-xl text-[var(--text-1)] leading-tight mt-0.5">
                        {dm.day}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-black font-display italic">
                          <Trophy className="w-2.5 h-2.5 inline-block mr-0.5 stroke-[3]" />
                          {CATEGORIA_LABELS[race.category].label.replace('Troféu de ', '')}
                        </span>

                        {race.distances.slice(0, 2).map((d) => (
                          <span
                            key={d}
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--text-2)]"
                          >
                            {d}
                          </span>
                        ))}

                        {isAdminView && pendingAdmin > 0 && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-400/30">
                            {pendingAdmin} p/ inscrever
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-black text-base text-[var(--text-1)] uppercase italic tracking-tight truncate mt-1">
                        {race.title}
                      </h3>

                      <div className="text-[11px] text-[var(--text-3)] flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>{race.start_time} • {race.location}</span>
                      </div>

                      {/* Telemetria do Plantel e Carrinha NRC */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-[var(--text-2)] font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3 text-[var(--run)]" />
                          {raceRegs.length} atletas
                        </span>

                        {race.van_available && (
                          <div className="flex items-center gap-1.5">
                            <Bus className="w-3 h-3 text-amber-400 shrink-0" />
                            <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden shrink-0">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (van.confirmedPassengers.length / van.capacity) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--text-3)]">
                              {van.confirmedPassengers.length}/{van.capacity}
                            </span>
                          </div>
                        )}

                        {race.registration_deadline && race.category !== 'individual' && !isPast && (
                          <span className="text-amber-400 text-[10px] font-bold">
                            Prazo: {formatShortDate(race.registration_deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {myRegs.length > 0 ? (
                      <span className="text-[11px] font-black text-black bg-[var(--run)] border border-lime-300 px-2.5 py-1 rounded-full flex items-center gap-1 font-display uppercase italic tracking-wider shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                        Vou{myRegs.length > 1 ? ` (${myRegs.length})` : ''}
                      </span>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-3)] group-hover:text-[var(--run)] group-hover:border-[var(--run)]/40 transition">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            // Sessão de Treino ou Convívio
            const evt = item.event
            const dm = formatDayMonth(evt.date)
            const going = evt.attendees.filter((a) => a.status === 'going')
            const myRsvp = evt.attendees.find((a) => a.athlete_id === currentUser.id)?.status

            return (
              <div
                key={item.id}
                className="iron-card p-4 space-y-3.5 rounded-2xl border-l-4 border-l-[var(--run)]"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-card)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-[var(--run)] leading-none uppercase tracking-wider">
                      {dm.month}
                    </span>
                    <span className="font-display font-black text-xl text-[var(--text-1)] leading-tight mt-0.5">
                      {dm.day}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded font-display italic ${
                          evt.type === 'training'
                            ? 'bg-[var(--run)] text-black'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {evt.type === 'training' ? '🏃 Treino URC' : '❤️ Convívio'}
                      </span>
                      {evt.requires_official_kit && (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded flex items-center gap-0.5">
                          <Shirt className="w-2.5 h-2.5" /> Equipamento
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-black text-base text-[var(--text-1)] uppercase italic tracking-tight truncate mt-1">
                      {evt.title}
                    </h3>

                    <div className="text-[11px] text-[var(--text-2)] flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-[var(--run)]" />
                        {evt.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-3)]" />
                        {evt.location}
                      </span>
                    </div>
                  </div>
                </div>

                {evt.workout_plan && (
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-2)]">
                    <span className="font-bold text-[var(--run)]">Plano NRC:</span> {evt.workout_plan}
                  </div>
                )}

                {/* RSVP Tátil */}
                <div className="pt-2.5 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--text-2)] font-semibold text-[11px]">
                      <Users className="w-3.5 h-3.5 text-[var(--run)]" />
                      <strong>{going.length}</strong> confirmados{going.length > 0 ? `: ${going.map((g) => g.athlete_name.split(' ')[0]).join(', ')}` : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => rsvpEvent(evt.id, 'going')}
                      className={`py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border active:scale-95 uppercase tracking-wider ${
                        myRsvp === 'going'
                          ? 'bg-[var(--run)] text-black border-lime-300 font-extrabold shadow-sm'
                          : 'bg-white/5 text-[var(--text-2)] border-white/10 hover:bg-white/10 hover:text-[var(--text-1)]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Vou
                    </button>
                    <button
                      type="button"
                      onClick={() => rsvpEvent(evt.id, 'maybe')}
                      className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border active:scale-95 uppercase tracking-wider ${
                        myRsvp === 'maybe'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-xs'
                          : 'bg-white/5 text-[var(--text-2)] border-white/10 hover:bg-white/10 hover:text-[var(--text-1)]'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      Talvez
                    </button>
                    <button
                      type="button"
                      onClick={() => rsvpEvent(evt.id, 'not_going')}
                      className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border active:scale-95 uppercase tracking-wider ${
                        myRsvp === 'not_going'
                          ? 'bg-slate-700 text-slate-200 border-slate-600 font-bold'
                          : 'bg-white/5 text-[var(--text-3)] border-white/10 hover:bg-white/10 hover:text-[var(--text-1)]'
                      }`}
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                      Não
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Detalhe de Corrida */}
      {selectedRace && (
        <RaceDetailModal race={selectedRace} onClose={() => setSelectedRaceId(null)} />
      )}

      {/* Sheet para Criar Treino */}
      {createTrainingOpen && (
        <Sheet
          onClose={() => setCreateTrainingOpen(false)}
          ariaLabel="Marcar Novo Treino ou Convívio"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-display font-black text-base uppercase italic tracking-tight text-white">
              Marcar Novo Treino / Convívio
            </h3>
            <button
              type="button"
              onClick={() => setCreateTrainingOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-[var(--text-3)] hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreateTrainingSubmit} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
                Título da Sessão
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Séries 1000m na Quinta da Marinha"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--run)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
                  Tipo
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as TeamEventType)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--run)]"
                >
                  <option value="training" className="bg-slate-900">Treino Oficial</option>
                  <option value="social" className="bg-slate-900">Convívio / Almoço</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--run)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--run)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
                  Local
                </label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--run)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
                Plano de Treino (Opcional)
              </label>
              <input
                type="text"
                value={newWorkoutPlan}
                onChange={(e) => setNewWorkoutPlan(e.target.value)}
                placeholder="Ex: Aquecimento 2km + 5x 1000m Z4 + Retorno 1km"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--run)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
                Notas Adicionais
              </label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ponto de encontro, estacionamento, etc."
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[var(--run)]"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={newRequiresKit}
                onChange={(e) => setNewRequiresKit(e.target.checked)}
                className="rounded accent-[var(--run)] w-4 h-4"
              />
              <span className="text-xs text-[var(--text-2)] font-semibold">
                Exige equipamento oficial da equipa
              </span>
            </label>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider text-black bg-[var(--run)] border border-lime-300 shadow-[0_0_16px_rgba(216,255,0,0.35)] cursor-pointer active:scale-95 transition"
              >
                Publicar Treino na Agenda
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </div>
  )
}
