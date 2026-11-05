import React, { useMemo, useState } from 'react'
import {
  Bus,
  Plus,
  Search,
  CheckCircle2,
  ChevronRight,
  Trophy,
  Users,
  Share2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Race, RaceCategory } from '../types'
import { CATEGORIA_LABELS } from '../types'
import { formatDayMonth, formatShortDate, computeVanAllocation } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateRace } from '../utils/appEvents'
import { RaceDetailModal } from '../components/RaceDetailModal'

/**
 * Página "Corridas" (/corridas)
 * Catálogo completo de provas: Troféu de Cascais, Inscrição pela Equipa e Individuais.
 */
export const RacesPage: React.FC = () => {
  const { races, registrations, currentUser, isAdminView } = useApp()

  const [filterCat, setFilterCat] = useState<'all' | RaceCategory>('all')
  const [onlyVan, setOnlyVan] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null)

  const today = todayISO()

  // Manter o modal sincronizado com os dados mais recentes da prova
  const selectedRace: Race | null = selectedRaceId
    ? races.find((r) => r.id === selectedRaceId) || null
    : null

  const sortedRaces = useMemo(
    () => [...races].sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)),
    [races]
  )

  const pastCount = useMemo(() => sortedRaces.filter((r) => r.date < today).length, [sortedRaces, today])

  const filteredRaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return sortedRaces.filter((r) => {
      if (!showPast && r.date < today) return false
      if (filterCat !== 'all' && r.category !== filterCat) return false
      if (onlyVan && !r.van_available) return false
      if (q) {
        return (
          r.title.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.distances.some((d) => d.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [sortedRaces, filterCat, onlyVan, showPast, searchQuery, today])

  const counts = useMemo(() => {
    const base = sortedRaces.filter((r) => showPast || r.date >= today)
    return {
      all: base.length,
      trofeu_cascais: base.filter((r) => r.category === 'trofeu_cascais').length,
      equipa: base.filter((r) => r.category === 'equipa').length,
      individual: base.filter((r) => r.category === 'individual').length,
    }
  }, [sortedRaces, showPast, today])

  const filterBtn = (active: boolean, tone: 'sky' | 'amber' | 'blue' | 'emerald') => {
    const activeTone = {
      sky: 'bg-[var(--run)]/20 text-[var(--run)] border-[var(--run)]/60 shadow-xs',
      amber: 'bg-amber-500/20 text-amber-400 border-amber-400/60 shadow-xs',
      blue: 'bg-blue-500/20 text-blue-300 border-blue-400/60 shadow-xs',
      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/60 shadow-xs',
    }[tone]
    return `px-4 py-2 min-h-[40px] rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 border flex items-center gap-1.5 ${
      active
        ? `${activeTone} font-extrabold`
        : 'bg-[var(--surface-raised)] text-[var(--text-3)] border-[var(--border-card)] hover:text-[var(--text-1)]'
    }`
  }

  return (
    <div className="space-y-4 pb-8 pt-2">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-xl text-[var(--text-1)] tracking-tight">
            Corridas & Provas
          </h1>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            Troféu de Cascais, inscrições pela equipa e provas individuais
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateRace()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-xs shadow-md transition active:scale-95 cursor-pointer text-slate-950 border border-amber-300 shrink-0"
          style={{ background: 'var(--grad-race)', boxShadow: 'var(--shadow-fab)' }}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{isAdminView ? 'Nova Prova' : 'Partilhar'}</span>
        </button>
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Procurar prova, local ou distância..."
          className="w-full rounded-2xl border pl-9 pr-3 py-3 min-h-[44px] text-xs placeholder:text-[var(--text-3)] focus:outline-none"
        />
      </div>

      {/* Filtros por categoria de inscrição */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setFilterCat('all')} className={filterBtn(filterCat === 'all', 'sky')}>
          Todas ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => setFilterCat('trofeu_cascais')}
          className={filterBtn(filterCat === 'trofeu_cascais', 'amber')}
        >
          <Trophy className="w-3.5 h-3.5" />
          Troféu Cascais ({counts.trofeu_cascais})
        </button>
        <button
          type="button"
          onClick={() => setFilterCat('equipa')}
          className={filterBtn(filterCat === 'equipa', 'blue')}
        >
          <Users className="w-3.5 h-3.5" />
          Inscrição Equipa ({counts.equipa})
        </button>
        <button
          type="button"
          onClick={() => setFilterCat('individual')}
          className={filterBtn(filterCat === 'individual', 'emerald')}
        >
          <Share2 className="w-3.5 h-3.5" />
          Individuais ({counts.individual})
        </button>
      </div>

      {/* Filtros secundários: carrinha e provas passadas */}
      <div className="flex items-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => setOnlyVan((v) => !v)}
          className={filterBtn(onlyVan, 'sky')}
        >
          <Bus className="w-3.5 h-3.5" />
          Com carrinha URC
        </button>
        {pastCount > 0 && (
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className={filterBtn(showPast, 'sky')}
          >
            {showPast ? 'A mostrar provas passadas' : `Mostrar passadas (${pastCount})`}
          </button>
        )}
      </div>

      {/* Explicação da categoria selecionada */}
      {filterCat !== 'all' && (
        <div className="iron-card p-3 text-xs text-[var(--text-2)]">
          <strong className="text-[var(--text-1)]">{CATEGORIA_LABELS[filterCat].label}:</strong>{' '}
          {CATEGORIA_LABELS[filterCat].desc}
        </div>
      )}

      {/* Lista de Provas */}
      <div className="space-y-2.5">
        {filteredRaces.length === 0 && (
          <div className="iron-card p-6 text-center text-xs text-[var(--text-3)]">
            Nenhuma prova corresponde aos filtros selecionados.
          </div>
        )}

        {filteredRaces.map((race) => {
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
              key={race.id}
              onClick={() => setSelectedRaceId(race.id)}
              className={`iron-card iron-card-interactive p-4 cursor-pointer flex items-center justify-between gap-3.5 group rounded-2xl active:scale-[0.99] transition ${
                race.category === 'trofeu_cascais' ? 'border-amber-400/40' : ''
              } ${isPast ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                {/* Bloco de Data Atlético */}
                <div
                  className={`w-13 h-13 rounded-2xl border flex flex-col items-center justify-center shrink-0 ${
                    race.category === 'trofeu_cascais'
                      ? 'bg-amber-500/15 border-amber-400/40 text-amber-400'
                      : 'bg-[var(--surface-raised)] border-[var(--border-card)] text-[var(--run)]'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                    {dm.month}
                  </span>
                  <span className="font-display font-black text-xl text-[var(--text-1)] leading-tight mt-0.5">
                    {dm.day}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  {/* Badges de Categoria & Distâncias */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        race.category === 'trofeu_cascais'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-400/30'
                          : race.category === 'equipa'
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-400/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-400/30'
                      }`}
                    >
                      {CATEGORIA_LABELS[race.category].label.replace('Troféu de ', '')}
                    </span>

                    {/* Chips de Distância Runtastic */}
                    {race.distances.slice(0, 2).map((d) => (
                      <span
                        key={d}
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--text-2)]"
                      >
                        {d}
                      </span>
                    ))}

                    {isAdminView && pendingAdmin > 0 && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-400/30">
                        {pendingAdmin} p/ inscrever
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-sm text-[var(--text-1)] truncate mt-1">
                    {race.title}
                  </h3>

                  <div className="text-[11px] text-[var(--text-3)] flex items-center gap-2 mt-0.5 flex-wrap">
                    <span>{race.start_time} • {race.location}</span>
                  </div>

                  {/* Telemetria do Plantel e Carrinha Runtastic */}
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

              {/* Estado do Atleta / Seta */}
              <div className="shrink-0 flex items-center gap-1.5">
                {myRegs.length > 0 ? (
                  <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-1 rounded-full flex items-center gap-1 font-display uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
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
        })}
      </div>

      {selectedRace && (
        <RaceDetailModal race={selectedRace} onClose={() => setSelectedRaceId(null)} />
      )}
    </div>
  )
}
