import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Search, UserRound, X } from 'lucide-react'
import type { TrofeuAthleteStanding, TrofeuClubStanding, TrofeuSeasonData } from '../types'
import { TROFEU_ESCALOES_2026_2027 } from '../data/trofeuData'
import { Avatar, Segmented } from './ui'
import { plural } from '../utils/formatters'
import { RankBadge, StandingsTable } from './StandingsTable'
import type { StandingsColumn, StandingsGroup } from './StandingsTable'

/** Mínimo de provas para entrar nos prémios finais individuais: 70% das provas (Regulamento, ponto 5.3.1). */
export const minStagesForPrize = (total: number) => Math.ceil(total * 0.7)

const stageNumber = (code: string) => Number(code.replace(/\D/g, '')) || 0
const TOP_N = 10

/** Provas com colunas na tabela: as já realizadas ou com pontos; sem calendário, as que aparecem nos pontos. */
const stageCodesFor = (season: TrofeuSeasonData, pointsMaps: Array<Record<string, number>>): string[] => {
  const withPoints = new Set<string>()
  for (const m of pointsMaps) for (const k of Object.keys(m)) withPoints.add(k)
  const fromCalendar = season.stages.filter((s) => s.completed || withPoints.has(s.code)).map((s) => s.code)
  const all = new Set([...fromCalendar, ...withPoints])
  return Array.from(all).sort((a, b) => stageNumber(a) - stageNumber(b))
}

const stageTitle = (season: TrofeuSeasonData, code: string) => {
  const s = season.stages.find((x) => x.code === code)
  return s ? `Prova ${s.stage_number}: ${s.location}` : `Prova ${stageNumber(code)}`
}

const pts = (n: number) => `${n} ${n === 1 ? 'pt' : 'pts'}`

// ---------------------------------------------------------------------------
// Clubes
// ---------------------------------------------------------------------------

export const ClubStandingsView: React.FC<{ season: TrofeuSeasonData; isDesktop: boolean }> = ({ season, isDesktop }) => {
  const [showAll, setShowAll] = useState(false)
  const [urcRowVisible, setUrcRowVisible] = useState(false)
  // Telemóvel: a barra "A tua equipa" só aparece quando a linha da U.R. Charneca não está à vista
  useEffect(() => {
    if (isDesktop) return
    const el = document.getElementById('trofeu-urc-row')
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setUrcRowVisible(e.isIntersecting), { rootMargin: '-64px 0px -80px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [isDesktop, showAll])
  const clubs = useMemo(() => [...season.club_standings].sort((a, b) => a.pos - b.pos), [season.club_standings])
  const urcIndex = clubs.findIndex((c) => c.is_urc)
  const urc = urcIndex >= 0 ? clubs[urcIndex] : undefined
  const leader = clubs[0]?.total || 1
  const stageCodes = useMemo(() => (isDesktop ? stageCodesFor(season, clubs.map((c) => c.points_per_stage)) : []), [isDesktop, season, clubs])

  const top = showAll ? clubs : clubs.slice(0, TOP_N)
  const trailing = !showAll && urc && urcIndex >= TOP_N ? [urc] : []

  const above = urcIndex > 0 ? clubs[urcIndex - 1] : undefined
  const below = urcIndex >= 0 && urcIndex < clubs.length - 1 ? clubs[urcIndex + 1] : undefined
  const gapText = urc
    ? [
        above ? `a ${pts(above.total - urc.total)} do ${above.pos}.º` : 'na liderança',
        below ? `${pts(urc.total - below.total)} à frente do ${below.pos}.º` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const columns: StandingsColumn<TrofeuClubStanding>[] = [
    { id: 'pos', header: 'Lugar', render: (c) => <RankBadge pos={c.pos} highlight={c.is_urc} />, className: 'st-col-pos' },
    {
      id: 'team',
      header: 'Clube',
      rowHeader: true,
      render: (c) => (
        <div className="min-w-0 py-1">
          <div className={`line-clamp-2 break-words ${c.is_urc ? 't-strong' : ''}`} title={c.team}>
            {c.team}
          </div>
          {c.is_urc && gapText && <div className="t-small text-[var(--text-2)] whitespace-normal">{gapText}</div>}
          <span className="st-bar" aria-hidden="true">
            <span style={{ width: `${Math.max(2, Math.round((c.total / leader) * 100))}%` }} />
          </span>
        </div>
      ),
    },
    ...stageCodes.map<StandingsColumn<TrofeuClubStanding>>((code) => ({
      id: code,
      header: code,
      title: stageTitle(season, code),
      align: 'right',
      render: (c) =>
        c.points_per_stage[code] !== undefined ? <span className="t-num">{c.points_per_stage[code]}</span> : <span className="st-dash" aria-label="sem pontos">—</span>,
    })),
    {
      id: 'total',
      header: 'Pontos',
      align: 'right',
      render: (c) => <span className="t-num t-strong">{c.total}</span>,
    },
  ]

  const groups: StandingsGroup<TrofeuClubStanding>[] = [{ id: 'all', label: 'Clubes', rows: top, trailingRows: trailing }]

  return (
    <div className="space-y-3">
      <div>
        <StandingsTable
          caption={`Classificação por clubes, época ${season.season}${showAll ? '' : `, top ${TOP_N} e U.R. Charneca`}`}
          columns={columns}
          groups={groups}
          rowKey={(c) => c.team}
          rowLabel={(c) => c.team}
          isHighlighted={(c) => c.is_urc}
          rowDomId={(c) => (c.is_urc ? 'trofeu-urc-row' : undefined)}
          mode={isDesktop ? 'box' : 'page'}
        />
        {clubs.length > TOP_N && (
          <button type="button" className="st-more" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? (
              <>
                Mostrar só o top {TOP_N} <ChevronUp className="w-4 h-4" aria-hidden="true" />
              </>
            ) : (
              <>
                Ver todos ({clubs.length}) <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Telemóvel: a U.R. Charneca fica sempre à vista por cima da navegação inferior */}
      {!isDesktop && urc && (
        <div className={`st-pin ${urcRowVisible ? 'is-hidden' : ''}`}>
          <a
            href="#trofeu-urc-row"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('trofeu-urc-row')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }}
            className="flex items-center gap-3 min-h-12 px-4 py-2 rounded-2xl bg-[var(--run)] text-[var(--on-accent)] shadow-[var(--shadow-float)]"
          >
            <span className="t-small flex-1 min-w-0">
              <span className="block t-strong t-num">
                A tua equipa: {urc.pos}.º · {pts(urc.total)}
              </span>
              {urc && above && <span className="block">a {pts(above.total - urc.total)} do {above.pos}.º</span>}
            </span>
            <span className="t-small t-strong underline underline-offset-2 shrink-0">Ver na tabela</span>
          </a>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Atletas
// ---------------------------------------------------------------------------

type SortKey = 'pos' | 'total' | 'name'
type MineKind = 'self' | 'child'

const escalaoBase = (escalao: string) => escalao.replace(/\s*\([MF]\)$/, '').trim()

/** Ordem dos escalões do regulamento (Sub-12 … M80); femininos a seguir aos masculinos do mesmo escalão. */
const escalaoRank = (escalao: string) => {
  const base = escalaoBase(escalao)
  const age = base.replace(/^[MF](?=\d)/, '')
  const i = TROFEU_ESCALOES_2026_2027.findIndex((e) => e.escalao === base || e.escalao.split(' / ').some((p) => p.replace(/^[MF]/, '') === age))
  const female = /\(F\)$/.test(escalao) || /^F\d/.test(base)
  return (i < 0 ? 99 : i) * 2 + (female ? 1 : 0)
}

export const AthleteStandingsView: React.FC<{
  season: TrofeuSeasonData
  isDesktop: boolean
  isAdminView: boolean
  currentUserId: string
  childIds: string[]
  loading?: boolean
}> = ({ season, isDesktop, isAdminView, currentUserId, childIds, loading }) => {
  const standings = season.athlete_standings
  const [q, setQ] = useState('')
  const [escalao, setEscalao] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'pos', dir: 'asc' })
  const [mineChoice, setMineChoice] = useState<'mine' | 'all' | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const mineOf = useMemo(() => {
    const kids = new Set(childIds)
    return (a: TrofeuAthleteStanding): MineKind | null =>
      !a.matched_profile_id ? null : a.matched_profile_id === currentUserId ? 'self' : kids.has(a.matched_profile_id) ? 'child' : null
  }, [childIds, currentUserId])

  const mineCount = useMemo(() => standings.filter((a) => mineOf(a)).length, [standings, mineOf])
  // "Os meus" vem ativo por defeito para quem tem fichas ligadas (não na vista de administrador)
  const mineOnly = mineCount > 0 && (mineChoice ?? (isAdminView ? 'all' : 'mine')) === 'mine'

  const escalaoOptions = useMemo(() => {
    const set = new Map<string, number>()
    for (const a of standings) {
      const b = escalaoBase(a.escalao)
      set.set(b, Math.min(set.get(b) ?? 999, escalaoRank(a.escalao)))
    }
    return Array.from(set.entries())
      .sort((x, y) => x[1] - y[1])
      .map(([b]) => b)
  }, [standings])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return standings.filter((a) => {
      if (mineOnly && !mineOf(a)) return false
      if (escalao !== 'all' && escalaoBase(a.escalao) !== escalao) return false
      if (!needle) return true
      return a.name.toLowerCase().includes(needle) || a.escalao.toLowerCase().includes(needle) || Boolean(a.dorsal?.toLowerCase().includes(needle))
    })
  }, [standings, mineOnly, mineOf, escalao, q])

  const sorted = useMemo(() => {
    const m = sort.dir === 'asc' ? 1 : -1
    const byPos = (a: TrofeuAthleteStanding, b: TrofeuAthleteStanding) => (a.pos > 0 ? a.pos : 9999) - (b.pos > 0 ? b.pos : 9999)
    return [...filtered].sort((a, b) => {
      if (sort.key === 'name') return a.name.localeCompare(b.name, 'pt') * m
      if (sort.key === 'total') return (a.total - b.total) * m || byPos(a, b)
      return byPos(a, b) * m || b.total - a.total
    })
  }, [filtered, sort])

  // Por lugar: agrupado por escalão (o lugar só se compara dentro do escalão). Por pontos ou nome: lista única.
  const grouped = sort.key === 'pos'
  const groups: StandingsGroup<TrofeuAthleteStanding>[] = useMemo(() => {
    if (!grouped) return [{ id: 'all', label: 'Atletas', rows: sorted }]
    const map = new Map<string, TrofeuAthleteStanding[]>()
    for (const a of sorted) {
      const list = map.get(a.escalao) ?? []
      list.push(a)
      map.set(a.escalao, list)
    }
    return Array.from(map.entries())
      .sort((x, y) => escalaoRank(x[0]) - escalaoRank(y[0]) || x[0].localeCompare(y[0], 'pt'))
      .map(([esc, rows]) => ({ id: esc, label: esc, meta: `${rows.length} ${rows.length === 1 ? 'atleta' : 'atletas'}`, rows }))
  }, [grouped, sorted])

  const stageCodes = useMemo(() => (isDesktop ? stageCodesFor(season, standings.map((a) => a.points_per_stage)) : []), [isDesktop, season, standings])

  const onSort = (key: string) =>
    setSort((s) => (s.key === key ? { key: s.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: key as SortKey, dir: key === 'total' ? 'desc' : 'asc' }))

  const toggle = (set: Set<string>, k: string) => {
    const next = new Set(set)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    return next
  }

  const mineTag = (a: TrofeuAthleteStanding) => {
    const kind = mineOf(a)
    if (!kind) return null
    return (
      <span className="st-mine">
        <UserRound className="w-3 h-3" aria-hidden="true" />
        {kind === 'self' ? 'Tu' : 'A teu cargo'}
      </span>
    )
  }

  const prizeStatus = (a: TrofeuAthleteStanding, compact?: boolean) => {
    const need = minStagesForPrize(a.total_season_stages)
    const missing = Math.max(0, need - a.stages_participated)
    if (missing === 0) {
      return (
        <span className="inline-flex items-center gap-1 t-small t-strong text-[var(--tint-emerald-fg)]">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          {compact ? 'mín. ok' : 'Cumpre o mínimo'}
        </span>
      )
    }
    return (
      <span className="t-small text-[var(--text-3)]">
        {compact ? `faltam ${missing}` : `Faltam ${missing} ${missing === 1 ? 'prova' : 'provas'}`}
      </span>
    )
  }

  const columns: StandingsColumn<TrofeuAthleteStanding>[] = [
    {
      id: 'pos',
      header: 'Lugar',
      title: 'Lugar no escalão',
      sortKey: isDesktop ? 'pos' : undefined,
      className: 'st-col-pos',
      render: (a) => <RankBadge pos={a.pos} />,
    },
    {
      id: 'name',
      header: 'Atleta',
      rowHeader: true,
      sortKey: isDesktop ? 'name' : undefined,
      render: (a) => (
        <span className="flex items-center gap-2 min-w-0 py-1">
          <Avatar name={a.name} size={28} gender={a.gender} child={a.is_youth} />
          <span className="min-w-0 flex-1">
            <span className={`block truncate ${mineOf(a) ? 't-strong' : ''}`} title={a.name}>
              {a.name}
            </span>
            <span className="flex items-center gap-1.5 min-w-0 t-small text-[var(--text-3)]">
              {mineTag(a)}
              <span className="truncate">
                {!grouped ? `${a.escalao} · ` : ''}
                {a.dorsal ? `Dorsal ${a.dorsal}` : 'Sem dorsal'}
              </span>
            </span>
          </span>
        </span>
      ),
    },
    ...stageCodes.map<StandingsColumn<TrofeuAthleteStanding>>((code) => ({
      id: code,
      header: code,
      title: stageTitle(season, code),
      align: 'right',
      render: (a) => {
        const r = a.stage_results?.[code]
        const p = r?.points ?? a.points_per_stage[code]
        if (p === undefined) return <span className="st-dash" aria-label="não participou">—</span>
        return (
          <span className="st-stage">
            <span className="t-num">{p}</span>
            {r && r.pos > 0 && <span className="st-stage-pos t-num">{r.pos}.º</span>}
          </span>
        )
      },
    })),
    {
      id: 'total',
      header: 'Pts',
      title: 'Pontos',
      align: 'right',
      sortKey: isDesktop ? 'total' : undefined,
      render: (a) => <span className="t-num t-strong">{a.total}</span>,
    },
    {
      id: 'provas',
      header: 'Provas',
      title: 'Provas feitas',
      align: 'right',
      render: (a) => (
        <span className="inline-flex flex-col items-end leading-tight">
          <span className="t-num">
            {a.stages_participated}/{a.total_season_stages}
          </span>
          {!isDesktop && prizeStatus(a, true)}
        </span>
      ),
    },
    ...(isDesktop
      ? [
          {
            id: 'premios',
            header: 'Prémios (70%)',
            title: 'Mínimo de provas para prémios',
            render: (a: TrofeuAthleteStanding) => prizeStatus(a),
          },
        ]
      : []),
  ]

  const renderDetails = (a: TrofeuAthleteStanding) => {
    const results = a.stage_results ? Object.entries(a.stage_results).sort(([x], [y]) => stageNumber(x) - stageNumber(y)) : []
    const need = minStagesForPrize(a.total_season_stages)
    return (
      <div className="space-y-2 pt-1">
        {results.length > 0 ? (
          <ul className="grid gap-1.5 lg:grid-cols-3" aria-label={`Resultados por prova de ${a.name}`}>
            {results.map(([code, r]) => (
              <li key={code} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--surface-card)] border border-[var(--border-card)] t-small t-num">
                <span className="t-strong text-[var(--text-1)] w-9 shrink-0" title={stageTitle(season, code)}>
                  {code}
                </span>
                <span className="flex-1 min-w-0 text-[var(--text-2)]">
                  {r.pos > 0 ? `${r.pos}.º no escalão` : 'Sem lugar'}
                  {r.time ? ` · ${r.time}` : ''}
                </span>
                <span className="t-strong text-[var(--text-1)] shrink-0">{pts(r.points)}</span>
              </li>
            ))}
          </ul>
        ) : Object.keys(a.points_per_stage).length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label={`Pontos por prova de ${a.name}`}>
            {Object.entries(a.points_per_stage)
              .sort(([x], [y]) => stageNumber(x) - stageNumber(y))
              .map(([code, p]) => (
                <li key={code} className="px-2.5 py-1 rounded-md bg-[var(--surface-card)] border border-[var(--border-card)] t-small t-num text-[var(--text-2)]">
                  <strong className="text-[var(--text-1)]">{code}</strong> {pts(p)}
                </li>
              ))}
          </ul>
        ) : (
          <p className="t-small text-[var(--text-3)]">Ainda sem resultados nesta época.</p>
        )}
        <p className="t-small text-[var(--text-2)]">
          {a.escalao}
          {a.birth_year > 0 ? ` · ano ${a.birth_year}` : ''} · {a.stages_participated} de {a.total_season_stages} provas · para prémios: mínimo {need}
        </p>
      </div>
    )
  }

  if (standings.length === 0 && !loading) return null

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="space-y-3 lg:space-y-0 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
        {mineCount > 0 && (
          <div className="lg:w-72">
            <Segmented<'mine' | 'all'>
              label="Atletas a mostrar"
              value={mineOnly ? 'mine' : 'all'}
              onChange={setMineChoice}
              options={[
                { value: 'mine', label: `Os meus (${mineCount})` },
                { value: 'all', label: `Todos (${standings.length})` },
              ]}
            />
          </div>
        )}
        <div className="relative lg:flex-1 lg:min-w-[220px]">
          <Search className="w-5 h-5 text-[var(--text-3)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            className="w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-card-strong)] pl-11 pr-11 min-h-12 lg:min-h-11 t-body text-[var(--text-1)] placeholder:text-[var(--text-muted)]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar nome, escalão ou dorsal"
            aria-label="Procurar atletas do Troféu"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Limpar pesquisa"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-[var(--text-2)] cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 lg:flex lg:gap-3">
          <label className="block min-w-0">
            <span className="sr-only">Escalão</span>
            <select
              value={escalao}
              onChange={(e) => setEscalao(e.target.value)}
              className="w-full min-w-0 rounded-xl bg-[var(--surface-card)] border border-[var(--border-card-strong)] px-3 min-h-12 lg:min-h-11 t-small text-[var(--text-1)]"
            >
              <option value="all">Todos os escalões</option>
              {escalaoOptions.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="sr-only">Ordenar por</span>
            <select
              value={`${sort.key}:${sort.dir}`}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(':') as [SortKey, 'asc' | 'desc']
                setSort({ key, dir })
              }}
              className="w-full min-w-0 rounded-xl bg-[var(--surface-card)] border border-[var(--border-card-strong)] px-3 min-h-12 lg:min-h-11 t-small text-[var(--text-1)]"
            >
              <option value="pos:asc">Por lugar no escalão</option>
              <option value="total:desc">Por pontos (mais)</option>
              <option value="name:asc">Por nome (A–Z)</option>
              {sort.key === 'pos' && sort.dir === 'desc' && <option value="pos:desc">Por lugar (inverso)</option>}
              {sort.key === 'total' && sort.dir === 'asc' && <option value="total:asc">Por pontos (menos)</option>}
              {sort.key === 'name' && sort.dir === 'desc' && <option value="name:desc">Por nome (Z–A)</option>}
            </select>
          </label>
        </div>
      </div>

      <p className="t-small text-[var(--text-3)]" aria-live="polite">
        {filtered.length === standings.length
          ? `${standings.length} ${plural(standings.length, 'atleta', 'atletas')} da U.R. Charneca`
          : `${filtered.length} de ${standings.length} ${plural(standings.length, 'atleta', 'atletas')}`}
        {grouped && groups.length > 1 ? ` em ${groups.length} escalões` : ''}
        {isDesktop ? '. Clica no nome para ver tempos e lugares de cada prova.' : '. Toca num atleta para ver cada prova.'}
      </p>

      <StandingsTable
        caption={`Atletas da U.R. Charneca no Troféu, época ${season.season}${mineOnly ? ' (os meus)' : ''}`}
        columns={columns}
        groups={groups}
        rowKey={(a) => a.id}
        rowLabel={(a) => a.name}
        isHighlighted={(a) => Boolean(mineOf(a))}
        mode={isDesktop ? 'box' : 'page'}
        showGroupHeaders={grouped}
        collapsed={collapsed}
        onToggleGroup={(id) => setCollapsed((s) => toggle(s, id))}
        renderDetails={renderDetails}
        expanded={expanded}
        onToggleRow={(k) => setExpanded((s) => toggle(s, k))}
        sort={sort}
        onSort={onSort}
        loading={loading && standings.length === 0}
        empty={
          mineOnly ? (
            <>
              Sem resultados entre os teus.{' '}
              <button type="button" className="underline underline-offset-2 text-[var(--tint-blue-fg)] t-strong min-h-11" onClick={() => setMineChoice('all')}>
                Ver todos
              </button>
            </>
          ) : (
            'Nada encontrado. Experimenta outro escalão ou outra pesquisa.'
          )
        }
      />
    </div>
  )
}
