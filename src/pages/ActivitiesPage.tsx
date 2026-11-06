import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { ActivityKind, Race, TeamEvent } from '../types'
import { ACTIVITY_KIND_LABELS } from '../types'
import { addDaysISO, formatLongDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateEvent, openCreateRace } from '../utils/appEvents'
import { RaceDetailModal } from '../components/RaceDetailModal'
import { EventDetailModal } from '../components/EventDetailModal'
import { EventListItem, RaceListItem } from '../components/ActivityItems'
import { Button, Chip, EmptyState, Field, KIND_COLOR, PageHeader, inputClass, kindOfEvent } from '../components/ui'

type DateRange = 'upcoming' | 'week' | 'month' | 'past' | 'custom'

const KINDS: ActivityKind[] = ['training', 'trofeu_cascais', 'equipa', 'individual', 'event']
const RACE_KINDS: ActivityKind[] = ['trofeu_cascais', 'equipa', 'individual']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

type Item =
  | { kind: ActivityKind; date: string; time: string; id: string; race: Race; event?: undefined }
  | { kind: ActivityKind; date: string; time: string; id: string; event: TeamEvent; race?: undefined }

/** Lê `?tipo=` (training | trofeu_cascais | equipa | individual | event | provas) */
const parseKinds = (param: string | null): ActivityKind[] => {
  if (!param) return []
  if (param === 'provas') return RACE_KINDS
  return param.split(',').filter((k): k is ActivityKind => (KINDS as string[]).includes(k))
}

export const ActivitiesPage: React.FC = () => {
  const { races, events, isAdminView } = useApp()
  const [params, setParams] = useSearchParams()
  const today = todayISO()

  const kinds = parseKinds(params.get('tipo'))
  const setKinds = (next: ActivityKind[]) => {
    const p = new URLSearchParams(params)
    if (next.length === 0 || next.length === KINDS.length) p.delete('tipo')
    else p.set('tipo', next.join(','))
    setParams(p, { replace: true })
  }
  const toggleKind = (k: ActivityKind) => setKinds(kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k])

  const [range, setRange] = useState<DateRange>('upcoming')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(addDaysISO(today, 30))
  const [query, setQuery] = useState('')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const [createMenu, setCreateMenu] = useState(false)
  const [raceId, setRaceId] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)

  // Todas as atividades filtradas por tipo e pesquisa (sem filtro de data → usadas no calendário)
  const typed = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()
    const match = (...fields: Array<string | undefined>) => !q || fields.some((f) => f?.toLowerCase().includes(q))
    const active = kinds.length ? kinds : KINDS
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
  }, [races, events, kinds, query])

  const [rangeFrom, rangeTo] = useMemo((): [string, string] => {
    switch (range) {
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
  }, [range, from, to, today])

  const list = useMemo(() => {
    const filtered = selectedDay
      ? typed.filter((i) => i.date === selectedDay)
      : typed.filter((i) => i.date >= rangeFrom && i.date <= rangeTo)
    return range === 'past' && !selectedDay ? [...filtered].reverse() : filtered
  }, [typed, selectedDay, rangeFrom, rangeTo, range])

  // Agrupar por mês para leitura mais fácil
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
    setKinds([])
    setRange('upcoming')
    setQuery('')
    setSelectedDay(null)
  }

  const selectedRace = raceId ? races.find((r) => r.id === raceId) || null : null
  const selectedEvent = eventId ? events.find((e) => e.id === eventId) || null : null
  const hasFilters = kinds.length > 0 || range !== 'upcoming' || query || selectedDay

  return (
    <div className="space-y-4 pb-10 stagger">
      <PageHeader
        eyebrow="Agenda da equipa"
        title="Atividades"
        action={
          <div className="relative">
            <Button size="sm" onClick={() => (isAdminView ? setCreateMenu((v) => !v) : openCreateRace())}>
              <Plus className="w-4 h-4" /> {isAdminView ? 'Criar' : 'Sugerir prova'}
            </Button>
            {createMenu && isAdminView && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-44 iron-card p-1.5 flex flex-col">
                {[
                  { label: 'Prova', run: () => openCreateRace() },
                  { label: 'Treino', run: () => openCreateEvent('training') },
                  { label: 'Evento', run: () => openCreateEvent('social') },
                  { label: 'Reunião', run: () => openCreateEvent('meeting') },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    className="text-left text-sm px-3 py-2 rounded-lg text-[var(--text-1)] hover:bg-[var(--surface-raised)] cursor-pointer"
                    onClick={() => {
                      setCreateMenu(false)
                      o.run()
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* Pesquisa */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar prova, treino, local…"
          aria-label="Procurar"
          className={`${inputClass} pl-9`}
        />
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" role="group" aria-label="Tipo de atividade">
        <Chip active={kinds.length === 0} onClick={() => setKinds([])}>
          Tudo
        </Chip>
        {KINDS.map((k) => (
          <Chip key={k} active={kinds.includes(k)} color={KIND_COLOR[k]} onClick={() => toggleKind(k)}>
            {ACTIVITY_KIND_LABELS[k]}
          </Chip>
        ))}
      </div>

      {/* Filtro por data */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" role="group" aria-label="Período">
        {(
          [
            ['upcoming', 'Próximas'],
            ['week', '7 dias'],
            ['month', '30 dias'],
            ['past', 'Passadas'],
            ['custom', 'Intervalo'],
          ] as Array<[DateRange, string]>
        ).map(([v, label]) => (
          <Chip
            key={v}
            active={range === v && !selectedDay}
            onClick={() => {
              setRange(v)
              setSelectedDay(null)
            }}
          >
            {label}
          </Chip>
        ))}
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

      {/* Calendário colapsável */}
      <div className="iron-card overflow-hidden">
        <button
          type="button"
          onClick={() => setCalendarOpen((v) => !v)}
          aria-expanded={calendarOpen}
          className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-[var(--text-1)]">
            <CalendarDays className="w-4 h-4 text-[var(--run)]" />
            Calendário
            {!calendarOpen && (
              <span className="text-xs font-semibold text-[var(--text-3)]">
                · {MONTHS[cursor.m]} {cursor.y}
              </span>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 text-[var(--text-3)] transition-transform ${calendarOpen ? 'rotate-180' : ''}`} />
        </button>

        {calendarOpen && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior" className="p-1.5 rounded-lg hover:bg-[var(--surface-raised)] cursor-pointer">
                <ChevronLeft className="w-4 h-4 text-[var(--text-2)]" />
              </button>
              <span className="font-display font-extrabold text-sm text-[var(--text-1)]">
                {MONTHS[cursor.m]} {cursor.y}
              </span>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="Mês seguinte" className="p-1.5 rounded-lg hover:bg-[var(--surface-raised)] cursor-pointer">
                <ChevronRight className="w-4 h-4 text-[var(--text-2)]" />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-bold uppercase text-[var(--text-3)]">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, inMonth }) => {
                const ks = dayKinds.get(date)
                const selected = selectedDay === date
                const isToday = date === today
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDay(selected ? null : date)}
                    aria-label={`${formatLongDate(date)}${ks ? `, ${ks.size} tipo(s) de atividade` : ''}`}
                    aria-pressed={selected}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs cursor-pointer transition ${
                      selected
                        ? 'bg-[var(--run)] text-[var(--on-accent)] font-black'
                        : isToday
                        ? 'border border-[var(--run)] text-[var(--text-1)] font-bold'
                        : inMonth
                        ? 'text-[var(--text-2)] hover:bg-[var(--surface-raised)]'
                        : 'text-[var(--text-muted)] opacity-50'
                    }`}
                  >
                    {Number(date.slice(8))}
                    <span className="flex gap-0.5 h-1.5">
                      {ks &&
                        [...ks].slice(0, 3).map((k) => (
                          <span
                            key={k}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: selected ? 'var(--on-accent)' : KIND_COLOR[k] }}
                          />
                        ))}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-3)] pt-1">
              {KINDS.map((k) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
                  {ACTIVITY_KIND_LABELS[k]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-[var(--surface-raised)] border border-[var(--border-card)] text-xs text-[var(--text-2)]">
          <span className="capitalize">{formatLongDate(selectedDay)}</span>
          <button type="button" onClick={() => setSelectedDay(null)} className="flex items-center gap-1 font-bold text-[var(--run)] cursor-pointer">
            <X className="w-3.5 h-3.5" /> Limpar dia
          </button>
        </div>
      )}

      {/* Lista */}
      {list.length === 0 ? (
        <EmptyState text="Nenhuma atividade com estes filtros." action={hasFilters ? 'Limpar filtros' : undefined} onAction={clearFilters} />
      ) : (
        <div className="space-y-5">
          {grouped.map(([month, items]) => (
            <section key={month} className="space-y-2">
              <h2 className="font-display font-extrabold text-xs uppercase tracking-wider text-[var(--text-3)]">
                {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)} · {items.length}
              </h2>
              {items.map((i) => {
                if (i.race) {
                  const id = i.race.id
                  return <RaceListItem key={i.id} race={i.race} onOpen={() => setRaceId(id)} />
                }
                const id = i.event.id
                return <EventListItem key={i.id} event={i.event} onOpen={() => setEventId(id)} />
              })}
            </section>
          ))}
        </div>
      )}

      {selectedRace && <RaceDetailModal race={selectedRace} onClose={() => setRaceId(null)} />}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setEventId(null)} />}
    </div>
  )
}
