import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Cake,
  CalendarDays,
  CalendarSearch,
  ChevronLeft,
  ChevronRight,
  Flag,
  Megaphone,
  Pin,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { ActivityKind, Race, TeamEvent } from '../types'
import { addDaysISO, formatLongDate, formatShortDate, getUpcomingBirthdays } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateRace } from '../utils/appEvents'
import { EventListItem, RaceCard, RaceListItem } from '../components/ActivityItems'
import { CreateMenuSheet } from '../components/CreateMenuSheet'
import { WelcomeCard } from '../components/OnboardingCards'
import { CATEGORIA_LABELS, EVENT_TYPE_LABELS } from '../types'
import { Sheet } from '../components/Sheet'
import {
  Avatar,
  Button,
  CategoryTabs,
  EmptyState,
  Field,
  IconButton,
  KIND_COLOR,
  KIND_ICON,
  KIND_SINGULAR,
  SearchPill,
  SectionTitle,
  SheetHeader,
  Tag,
  inputClass,
  kindOfEvent,
} from '../components/ui'

type DateRange = 'upcoming' | 'week' | 'month' | 'past' | 'custom'
type Category = 'all' | 'provas' | ActivityKind

const KINDS: ActivityKind[] = ['trofeu_cascais', 'equipa', 'individual', 'training', 'event']
const RACE_KINDS: ActivityKind[] = ['trofeu_cascais', 'equipa', 'individual']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const CATEGORIES: Array<{ value: Category; label: string; icon: typeof Sparkles }> = [
  { value: 'all', label: 'Destaques', icon: Sparkles },
  { value: 'provas', label: 'Provas', icon: Flag },
  { value: 'trofeu_cascais', label: 'Troféu', icon: KIND_ICON.trofeu_cascais },
  { value: 'equipa', label: 'Clube', icon: KIND_ICON.equipa },
  { value: 'individual', label: 'Sugeridas', icon: KIND_ICON.individual },
  { value: 'training', label: 'Treinos', icon: KIND_ICON.training },
  { value: 'event', label: 'Eventos', icon: KIND_ICON.event },
]

const RANGES: Array<{ value: DateRange; label: string; hint: string }> = [
  { value: 'upcoming', label: 'Próximas', hint: 'De hoje em diante' },
  { value: 'week', label: 'Próximos 7 dias', hint: 'Esta semana' },
  { value: 'month', label: 'Próximos 30 dias', hint: 'Este mês' },
  { value: 'past', label: 'Passadas', hint: 'Atividades já realizadas' },
  { value: 'custom', label: 'Intervalo de datas', hint: 'Escolher o início e o fim' },
]

/** Explicação curta de cada categoria, mostrada por baixo do título da lista. */
const CATEGORY_HELP: Partial<Record<Category, string>> = {
  provas: 'Todas as provas: do Troféu de Cascais, do clube e sugeridas por atletas.',
  trofeu_cascais: CATEGORIA_LABELS.trofeu_cascais.desc,
  equipa: CATEGORIA_LABELS.equipa.desc,
  individual: CATEGORIA_LABELS.individual.desc,
  training: 'Treinos da equipa. Diz se vais para o treinador saber quantos são.',
  event: `${EVENT_TYPE_LABELS.social.label} e ${EVENT_TYPE_LABELS.meeting.label.toLowerCase()}: marca a tua presença.`,
}

type Item =
  | { kind: ActivityKind; date: string; time: string; id: string; race: Race; event?: undefined }
  | { kind: ActivityKind; date: string; time: string; id: string; event: TeamEvent; race?: undefined }

/** Lê `?tipo=` (all | provas | trofeu_cascais | equipa | individual | training | event) */
const parseCategory = (param: string | null): Category => {
  if (param === 'provas') return 'provas'
  return (KINDS as string[]).includes(param || '') ? (param as ActivityKind) : 'all'
}

const kindsOf = (c: Category): ActivityKind[] => (c === 'all' ? KINDS : c === 'provas' ? RACE_KINDS : [c])

/**
 * Explorar: pesquisa, categorias, filtros por data e calendário.
 * Em "Destaques" mostra comunicados, próximas provas (carrossel), próximo evento, treinos e aniversários.
 */
export const ExplorePage: React.FC = () => {
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
  const [params, setParams] = useSearchParams()
  const today = todayISO()

  const category = parseCategory(params.get('tipo'))
  const setCategory = (next: Category) => {
    const p = new URLSearchParams(params)
    if (next === 'all') p.delete('tipo')
    else p.set('tipo', next)
    setParams(p, { replace: true })
    window.scrollTo({ top: 0 })
  }

  const [range, setRange] = useState<DateRange>('upcoming')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(addDaysISO(today, 30))
  const [query, setQuery] = useState('')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))

  const openRace = (id: string) => navigate(`/prova/${id}`)
  const openEvent = (id: string) => navigate(`/evento/${id}`)

  // Todas as atividades filtradas por categoria e pesquisa (sem filtro de data → usadas no calendário)
  const typed = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()
    const match = (...fields: Array<string | undefined>) => !q || fields.some((f) => f?.toLowerCase().includes(q))
    const active = kindsOf(category)
    const items: Item[] = []
    for (const r of races) {
      if (active.includes(r.category) && match(r.title, r.location, ...r.distances)) {
        items.push({ kind: r.category, date: r.date, time: r.start_time, id: `r-${r.id}`, race: r })
      }
    }
    for (const e of events) {
      const k = kindOfEvent(e)
      if (active.includes(k) && match(e.title, e.location, e.workout_plan)) {
        items.push({ kind: k, date: e.date, time: e.time, id: `e-${e.id}`, event: e })
      }
    }
    return items.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [races, events, category, query])

  const rangeBounds = (r: DateRange): [string, string] => {
    switch (r) {
      case 'week':
        return [today, addDaysISO(today, 7)]
      case 'month':
        return [today, addDaysISO(today, 30)]
      case 'past':
        return ['0000-00-00', addDaysISO(today, -1)]
      case 'custom':
        return [from || '0000-00-00', to || '9999-12-31']
      default:
        return [today, '9999-12-31']
    }
  }
  const countFor = (r: DateRange) => {
    const [a, b] = rangeBounds(r)
    return typed.filter((i) => i.date >= a && i.date <= b).length
  }

  const list = useMemo(() => {
    const [a, b] = rangeBounds(range)
    const filtered = selectedDay ? typed.filter((i) => i.date === selectedDay) : typed.filter((i) => i.date >= a && i.date <= b)
    return range === 'past' && !selectedDay ? [...filtered].reverse() : filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, selectedDay, range, from, to, today])

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const i of list) {
      const key = i.date.slice(0, 7)
      map.set(key, [...(map.get(key) || []), i])
    }
    return [...map.entries()]
  }, [list])

  const dayKinds = useMemo(() => {
    const map = new Map<string, Set<ActivityKind>>()
    for (const i of typed) {
      if (!map.has(i.date)) map.set(i.date, new Set())
      map.get(i.date)!.add(i.kind)
    }
    return map
  }, [typed])

  const calendarDays = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    const offset = (first.getDay() + 6) % 7 // segunda = 0
    const start = addDaysISO(`${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-01`, -offset)
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
    const total = Math.ceil((offset + daysInMonth) / 7) * 7
    return Array.from({ length: total }, (_, i) => {
      const date = addDaysISO(start, i)
      return { date, inMonth: Number(date.slice(5, 7)) === cursor.m + 1 }
    })
  }, [cursor])

  const shiftMonth = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const clearFilters = () => {
    setRange('upcoming')
    setQuery('')
    setSelectedDay(null)
    setCategory('all')
  }

  const dateFilterActive = range !== 'upcoming' || Boolean(selectedDay)
  const showHighlights = category === 'all' && !query.trim() && !dateFilterActive && !calendarOpen

  // ----- Dados dos Destaques -----
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

  const topNotice = useMemo(
    () =>
      [...notifications].sort(
        (a, b) =>
          Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
          Number(!b.read_by.includes(currentUser.id)) - Number(!a.read_by.includes(currentUser.id)) ||
          b.created_at.localeCompare(a.created_at)
      )[0] || null,
    [notifications, currentUser.id]
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

  const listTitle = selectedDay
    ? formatLongDate(selectedDay)
    : query.trim()
    ? `Resultados para "${query.trim()}"`
    : category === 'all'
    ? 'Todas as atividades'
    : category === 'provas'
    ? 'Provas'
    : CATEGORIES.find((c) => c.value === category)?.label || KIND_SINGULAR[category]

  return (
    <div className="pb-28">
      {/* Identidade do clube */}
      <div className="flex items-center gap-3 px-5 pt-4">
        <img
          src={`${import.meta.env.BASE_URL}urc-emblema.jpg`}
          alt="Emblema da União Recreativa da Charneca"
          width={44}
          height={44}
          className="w-11 h-11 rounded-xl object-cover bg-[var(--run)] border-2 border-[var(--gold)] shrink-0"
        />
        <div className="min-w-0">
          <div className="t-body t-strong text-[var(--text-1)] truncate">U.R. Charneca · Atletismo</div>
          <div className="t-small text-[var(--text-3)] truncate">Olá, {currentUser.nickname || currentUser.name.split(' ')[0]}</div>
        </div>
      </div>

      {/* Topo fixo: pesquisa + categorias */}
      <div className="sticky top-0 z-20 border-b border-[var(--border-card)]" style={{ background: 'var(--bg-header)' }}>
        <div className="flex items-center gap-2 px-5 pt-3 pb-2">
          <div className="flex-1 min-w-0">
            <SearchPill value={query} onChange={setQuery} placeholder="Procurar" />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label={dateFilterActive ? 'Filtros (ativos)' : 'Filtros'}
            className="relative h-11 px-4 rounded-full border border-[var(--border-card)] bg-[var(--surface-card)] text-[var(--text-1)] t-small t-strong inline-flex items-center gap-2 shrink-0 pressable"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            Filtros
            {dateFilterActive && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--run)] border-2 border-[var(--bg-app)]" aria-hidden="true" />
            )}
          </button>
          {isAdminView && (
            <IconButton label="Criar" onClick={() => setCreateOpen(true)} className="!bg-[var(--run)] !text-[var(--on-accent)] !border-transparent">
              <Plus className="w-5 h-5" aria-hidden="true" />
            </IconButton>
          )}
        </div>
        <CategoryTabs value={category} options={CATEGORIES} onChange={setCategory} label="Tipo de atividade" />
      </div>

      <div className="px-5">
        {/* Calendário (expande e colapsa com o botão flutuante) */}
        {calendarOpen && (
          <section className="card-raised p-4 mt-5 space-y-3 sheet-in" aria-label="Calendário">
            <div className="flex items-center justify-between">
              <IconButton label="Mês anterior" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </IconButton>
              <h2 className="t-body t-strong text-[var(--text-1)]">
                {MONTHS[cursor.m]} {cursor.y}
              </h2>
              <IconButton label="Mês seguinte" onClick={() => shiftMonth(1)}>
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </IconButton>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-[var(--text-3)]" aria-hidden="true">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {calendarDays.map(({ date, inMonth }) => {
                const ks = dayKinds.get(date)
                const selected = selectedDay === date
                const isToday = date === today
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDay(selected ? null : date)}
                    aria-label={`${formatLongDate(date)}${ks ? `, ${ks.size} tipo(s) de atividade` : ', sem atividades'}`}
                    aria-pressed={selected}
                    className="min-h-11 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                  >
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center t-small t-num ${
                        selected
                          ? 'bg-[var(--text-1)] text-[var(--bg-app)] t-strong'
                          : isToday
                          ? 'border border-[var(--text-1)] text-[var(--text-1)] t-strong'
                          : inMonth
                          ? ks
                            ? 'text-[var(--text-1)] t-strong'
                            : 'text-[var(--text-2)]'
                          : 'text-[var(--text-3)] opacity-60'
                      }`}
                    >
                      {Number(date.slice(8))}
                    </span>
                    <span className="flex gap-0.5 h-1.5" aria-hidden="true">
                      {ks && [...ks].slice(0, 3).map((k) => <span key={k} className="w-1.5 h-1.5 rounded-full" style={{ background: KIND_COLOR[k] }} />)}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-3)] pt-1">
              {KINDS.map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: KIND_COLOR[k] }} aria-hidden="true" />
                  {KIND_SINGULAR[k]}
                </span>
              ))}
            </div>
          </section>
        )}

        {showHighlights ? (
          <div className="space-y-10 pt-6 stagger">
            <WelcomeCard admin={isAdminView} name={currentUser.nickname || currentUser.name.split(' ')[0]} />
            {adminPending > 0 && (
              <button type="button" onClick={() => navigate('/admin')} className="card w-full p-4 flex items-center gap-4 text-left pressable">
                <ShieldCheck className="w-6 h-6 text-[var(--gold-ink)] shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block t-body t-strong text-[var(--text-1)]">
                    {adminPending} {adminPending === 1 ? 'pedido de inscrição' : 'pedidos de inscrição'}
                  </span>
                  <span className="block t-small text-[var(--text-3)]">À espera de confirmação do clube</span>
                </span>
                <ChevronRight className="w-5 h-5 text-[var(--text-2)] shrink-0" aria-hidden="true" />
              </button>
            )}

            {/* Comunicados */}
            <section className="space-y-4">
              <SectionTitle
                title="Comunicados"
                count={unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined}
                action="Ver todos"
                onAction={() => navigate('/comunicados')}
              />
              {topNotice ? (
                <button
                  type="button"
                  onClick={() => {
                    markNotificationRead(topNotice.id)
                    navigate('/comunicados', { state: { focusId: topNotice.id } })
                  }}
                  className="card-raised w-full p-4 text-left pressable flex gap-4"
                >
                  <span className="w-11 h-11 rounded-full bg-[var(--tint-blue-bg)] text-[var(--tint-blue-fg)] flex items-center justify-center shrink-0">
                    {topNotice.pinned ? <Pin className="w-5 h-5" aria-hidden="true" /> : <Megaphone className="w-5 h-5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="t-body t-strong text-[var(--text-1)] line-clamp-2 flex-1">{topNotice.title}</span>
                      {!topNotice.read_by.includes(currentUser.id) && <Tag tone="info">Novo</Tag>}
                    </span>
                    <span className="t-small text-[var(--text-3)] line-clamp-2 mt-0.5">{topNotice.message}</span>
                    <span className="block t-small text-[var(--text-3)] mt-1.5">
                      {topNotice.created_by_name} · {formatShortDate(topNotice.created_at.slice(0, 10))}
                    </span>
                  </span>
                </button>
              ) : (
                <p className="t-body text-[var(--text-3)]">Ainda não há comunicados.</p>
              )}
            </section>

            {/* Próximas provas — carrossel de 5 */}
            <section className="space-y-4">
              <SectionTitle title="Próximas provas" action="Ver todas" onAction={() => setCategory('provas')} />
              {upcomingRaces.length === 0 ? (
                <EmptyState
                  icon={Flag}
                  text="Ainda não há provas agendadas."
                  action={isAdminView ? 'Criar prova' : 'Sugerir uma prova'}
                  onAction={() => openCreateRace()}
                />
              ) : (
                <div className="snap-row -mx-5 px-5" role="list" aria-label="Próximas provas">
                  {upcomingRaces.map((r) => (
                    <RaceCard key={r.id} race={r} onOpen={() => openRace(r.id)} />
                  ))}
                </div>
              )}
            </section>

            {/* Próximo evento */}
            {nextEvent && (
              <section className="space-y-4">
                <SectionTitle title="Próximo evento" action="Ver eventos" onAction={() => setCategory('event')} />
                <EventListItem event={nextEvent} onOpen={() => openEvent(nextEvent.id)} />
              </section>
            )}

            {/* Treinos */}
            <section className="space-y-4">
              <SectionTitle title="Próximos treinos" action="Ver todos" onAction={() => setCategory('training')} />
              {nextTrainings.length === 0 ? (
                <p className="t-body text-[var(--text-3)]">Não há treinos marcados.</p>
              ) : (
                <div className="space-y-6">
                  {nextTrainings.map((t) => (
                    <EventListItem key={t.id} event={t} compact showRsvp onOpen={() => openEvent(t.id)} />
                  ))}
                </div>
              )}
            </section>

            {/* Aniversários */}
            {birthdays.length > 0 && (
              <section className="space-y-2">
                <SectionTitle title="Aniversários" />
                <div className="divide-soft">
                  {birthdays.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 py-3">
                      <Avatar name={b.name} child={b.isChild} />
                      <div className="min-w-0 flex-1">
                        <div className="t-body text-[var(--text-1)] truncate">{b.name}</div>
                        <div className="t-small text-[var(--text-3)]">
                          {formatShortDate(b.date)} · faz {b.turning} anos
                        </div>
                      </div>
                      {b.daysAway === 0 ? (
                        <Tag tone="warn">
                          <Cake className="w-3.5 h-3.5" aria-hidden="true" /> Hoje
                        </Tag>
                      ) : (
                        <span className="t-small text-[var(--text-3)] shrink-0">{b.daysAway === 1 ? 'amanhã' : `em ${b.daysAway} dias`}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!isAdminView && (
              <section className="card p-5 space-y-3">
                <h2 className="t-heading text-[var(--text-1)]">Conheces uma boa prova?</h2>
                <p className="t-body text-[var(--text-3)]">Sugere-a à equipa e combinem ir juntos.</p>
                <Button variant="secondary" onClick={() => openCreateRace()}>
                  Sugerir uma prova
                </Button>
              </section>
            )}
          </div>
        ) : (
          <div className="pt-6 space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="t-heading text-[var(--text-1)] first-letter:uppercase">{listTitle}</h1>
                <p className="t-small text-[var(--text-3)]">
                  {list.length} {list.length === 1 ? 'atividade' : 'atividades'}
                  {!selectedDay && ` · ${RANGES.find((r) => r.value === range)?.label.toLowerCase()}`}
                </p>
                {!query.trim() && !selectedDay && CATEGORY_HELP[category] && (
                  <p className="t-small text-[var(--text-3)] mt-2 max-w-[44ch]">{CATEGORY_HELP[category]}</p>
                )}
              </div>
              {selectedDay && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                  <X className="w-4 h-4" aria-hidden="true" /> Limpar dia
                </Button>
              )}
            </div>

            {list.length === 0 ? (
              <EmptyState
                icon={CalendarSearch}
                title="Sem resultados"
                text="Não há atividades com estes filtros. Experimenta outra categoria ou outro período."
                action="Limpar filtros"
                onAction={clearFilters}
              />
            ) : (
              grouped.map(([month, items]) => (
                <section key={month} className="space-y-6">
                  {!selectedDay && (
                    <h2 className="t-small t-strong text-[var(--text-3)]">
                      {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
                    </h2>
                  )}
                  <div className="space-y-8">
                    {items.map((i) => {
                      if (i.race) {
                        const id = i.race.id
                        return <RaceListItem key={i.id} race={i.race} onOpen={() => openRace(id)} />
                      }
                      const id = i.event.id
                      return <EventListItem key={i.id} event={i.event} onOpen={() => openEvent(id)} />
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </div>

      {/* Botão flutuante do calendário (expandir / colapsar) */}
      <div className="fixed left-1/2 -translate-x-1/2 z-20 bottom-[calc(76px+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          aria-expanded={calendarOpen}
          onClick={() => {
            setCalendarOpen((v) => !v)
            if (calendarOpen) setSelectedDay(null)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="min-h-11 px-5 rounded-full bg-[var(--text-1)] text-[var(--bg-app)] t-small t-strong flex items-center gap-2 shadow-[var(--shadow-float)] pressable"
        >
          {calendarOpen ? <X className="w-4 h-4" aria-hidden="true" /> : <CalendarDays className="w-4 h-4" aria-hidden="true" />}
          {calendarOpen ? 'Fechar calendário' : 'Calendário'}
        </button>
      </div>

      {/* Filtros por data */}
      {filtersOpen && (
        <Sheet onClose={() => setFiltersOpen(false)} ariaLabel="Filtros">
          <SheetHeader title="Filtros" onClose={() => setFiltersOpen(false)} />
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <h3 className="t-heading text-[var(--text-1)]">Quando</h3>
            <div role="radiogroup" aria-label="Período" className="divide-soft">
              {RANGES.map((r) => {
                const on = range === r.value && !selectedDay
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setRange(r.value)
                      setSelectedDay(null)
                    }}
                    className="w-full min-h-14 py-3 flex items-center gap-4 text-left cursor-pointer"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block t-body text-[var(--text-1)]">{r.label}</span>
                      <span className="block t-small text-[var(--text-3)]">{r.hint}</span>
                    </span>
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        on ? 'border-[var(--text-1)]' : 'border-[var(--border-card-strong)]'
                      }`}
                      aria-hidden="true"
                    >
                      {on && <span className="w-3 h-3 rounded-full bg-[var(--text-1)]" />}
                    </span>
                  </button>
                )
              })}
            </div>
            {range === 'custom' && !selectedDay && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="De">
                  <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="Até">
                  <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-[var(--border-card)] flex items-center justify-between gap-4 shrink-0">
            <Button
              variant="ghost"
              onClick={() => {
                setRange('upcoming')
                setSelectedDay(null)
              }}
            >
              Limpar
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>
              Mostrar {countFor(range)} {countFor(range) === 1 ? 'atividade' : 'atividades'}
            </Button>
          </div>
        </Sheet>
      )}

      {createOpen && <CreateMenuSheet onClose={() => setCreateOpen(false)} />}
    </div>
  )
}
