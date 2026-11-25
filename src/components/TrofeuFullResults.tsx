import React, { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type {
  TrofeuPublicGeneralAthlete,
  TrofeuPublicStageAthlete,
  TrofeuPublicStageClub,
  TrofeuSeasonData,
  TrofeuStageResults,
} from '../types'
import { fetchGeneralStandings, fetchStageResults } from '../services/trofeuResultsService'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { plural } from '../utils/formatters'

const count = (n: number, one: string, many: string) => `${n} ${plural(n, one, many)}`
import { EmptyState, Segmented, inputClass } from './ui'
import { RankBadge, StandingsTable } from './StandingsTable'
import type { StandingsColumn, StandingsGroup } from './StandingsTable'
import { escalaoRank } from './TrofeuStandings'

const stageNumber = (code: string) => Number(code.replace(/\D/g, '')) || 0

type Load<T> = { status: 'loading' } | { status: 'ready'; data: T | null } | { status: 'error' }

/** Lê dados a pedido (com cache na sessão) e volta a ler quando a chave muda. */
function useRemote<T>(key: string, load: () => Promise<T | null>): Load<T> {
  const [state, setState] = useState<{ key: string; value: Load<T> }>({ key, value: { status: 'loading' } })
  useEffect(() => {
    let alive = true
    load().then(
      (data) => alive && setState({ key, value: { status: 'ready', data } }),
      () => alive && setState({ key, value: { status: 'error' } })
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state.key === key ? state.value : { status: 'loading' }
}

/** Ordena por escalão (ordem do regulamento) e agrupa; dentro do grupo por lugar. */
function groupByEscalao<T extends { escalao: string; pos: number; name: string }>(rows: T[]): StandingsGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const list = map.get(r.escalao)
    if (list) list.push(r)
    else map.set(r.escalao, [r])
  }
  return [...map.entries()]
    .sort((a, b) => escalaoRank(a[0]) - escalaoRank(b[0]) || a[0].localeCompare(b[0], 'pt'))
    .map(([escalao, list]) => ({
      id: escalao,
      label: escalao,
      meta: count(list.length, 'atleta', 'atletas'),
      rows: [...list].sort((a, b) => a.pos - b.pos || a.name.localeCompare(b.name, 'pt')),
    }))
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Filtros da classificação completa: escalão e pesquisa por nome ou clube. */
const Filters: React.FC<{
  escaloes: string[]
  escalao: string
  onEscalao: (v: string) => void
  query: string
  onQuery: (v: string) => void
}> = ({ escaloes, escalao, onEscalao, query, onQuery }) => (
  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <label className="block">
      <span className="sr-only">Escalão</span>
      <select className={inputClass} value={escalao} onChange={(e) => onEscalao(e.target.value)}>
        <option value="">Todos os escalões</option>
        {escaloes.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
    </label>
    <label className="relative block">
      <span className="sr-only">Procurar atleta ou clube</span>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-2)]" aria-hidden="true" />
      <input
        type="search"
        className={`${inputClass} !pl-9 !pr-10`}
        placeholder="Procurar atleta ou clube"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      {query && (
        <button
          type="button"
          aria-label="Limpar pesquisa"
          className="absolute right-0 top-0 w-11 h-full flex items-center justify-center cursor-pointer"
          onClick={() => onQuery('')}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </label>
  </div>
)

function useFiltered<T extends { escalao: string; name: string; club: string }>(rows: T[]) {
  const [escalao, setEscalao] = useState('')
  const [query, setQuery] = useState('')
  const escaloes = useMemo(
    () => [...new Set(rows.map((r) => r.escalao))].sort((a, b) => escalaoRank(a) - escalaoRank(b) || a.localeCompare(b, 'pt')),
    [rows]
  )
  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return rows.filter((r) => (!escalao || r.escalao === escalao) && (!q || normalize(r.name).includes(q) || normalize(r.club).includes(q)))
  }, [rows, escalao, query])
  return { escalao, setEscalao, query, setQuery, escaloes, filtered }
}

const NameCell: React.FC<{ name: string; club: string; urc: boolean; showClub?: boolean }> = ({ name, club, urc, showClub = true }) => (
  <div className="min-w-0 py-1">
    <div className={`line-clamp-2 break-words ${urc ? 't-strong' : ''}`}>{name}</div>
    {showClub && club && <div className="t-small text-[var(--text-2)] truncate">{club}</div>}
  </div>
)

const Count: React.FC<{ shown: number; total: number }> = ({ shown, total }) => (
  <p className="t-small text-[var(--text-2)]" role="status">
    {shown === total ? count(total, 'atleta', 'atletas') : `${shown} de ${count(total, 'atleta', 'atletas')}`}
  </p>
)

// ---------------------------------------------------------------------------
// Classificação de uma prova: clubes, a nossa equipa e geral
// ---------------------------------------------------------------------------

type StageView = 'clubes' | 'equipa' | 'geral'

export const StageResultsPanel: React.FC<{ season: TrofeuSeasonData; stage: string; isDesktop: boolean }> = ({ season, stage, isDesktop }) => {
  const [view, setView] = useState<StageView>('equipa')
  const remote = useRemote<TrofeuStageResults>(`${season.season}|${stage}`, () => fetchStageResults(season.season, stage))
  const full = remote.status === 'ready' ? remote.data : null

  // Sem a tabela completa (modo de demonstração, época antiga), usa-se o que a época já tem
  const clubs: TrofeuPublicStageClub[] = useMemo(() => {
    if (full?.clubs.length) return full.clubs
    return season.club_standings
      .filter((c) => c.points_per_stage[stage] !== undefined)
      .sort((a, b) => b.points_per_stage[stage] - a.points_per_stage[stage])
      .map((c, i) => ({ pos: i + 1, sigla: '', name: c.team, athletes: 0, points: c.points_per_stage[stage], urc: c.is_urc }))
  }, [full, season.club_standings, stage])

  const team: TrofeuPublicStageAthlete[] = useMemo(() => {
    if (full?.athletes.length) return full.athletes.filter((a) => a.urc)
    return season.athlete_standings
      .filter((a) => a.stage_results?.[stage] || a.points_per_stage[stage] !== undefined)
      .map((a) => ({
        pos: a.stage_results?.[stage]?.pos ?? 0,
        name: a.name,
        club: a.team,
        escalao: a.escalao,
        gender: a.gender,
        time: a.stage_results?.[stage]?.time,
        points: a.stage_results?.[stage]?.points ?? a.points_per_stage[stage],
        urc: true,
      }))
  }, [full, season.athlete_standings, stage])

  const all = full?.athletes ?? []
  const general = useFiltered(all)
  const urcClub = clubs.find((c) => c.urc)

  const athleteColumns = (showClub: boolean): StandingsColumn<TrofeuPublicStageAthlete>[] => [
    { id: 'pos', header: 'Lugar', render: (a) => (a.pos ? <RankBadge pos={a.pos} highlight={a.urc && showClub} /> : '–'), className: 'st-col-pos' },
    { id: 'name', header: 'Atleta', rowHeader: true, render: (a) => <NameCell name={a.name} club={a.club} urc={a.urc && showClub} showClub={showClub} /> },
    { id: 'time', header: 'Marca', align: 'right', render: (a) => <span className="t-num">{a.time || '–'}</span> },
    { id: 'pts', header: 'Pontos', align: 'right', render: (a) => <span className="st-pts">{a.points}</span> },
  ]

  const clubColumns: StandingsColumn<TrofeuPublicStageClub>[] = [
    { id: 'pos', header: 'Lugar', render: (c) => <RankBadge pos={c.pos} highlight={c.urc} />, className: 'st-col-pos' },
    {
      id: 'name',
      header: 'Clube',
      rowHeader: true,
      render: (c) => (
        <div className="min-w-0 py-1">
          <div className={`line-clamp-2 break-words ${c.urc ? 't-strong' : ''}`}>{c.name}</div>
          {c.athletes > 0 && <div className="t-small text-[var(--text-2)]">{count(c.athletes, 'atleta', 'atletas')}</div>}
        </div>
      ),
    },
    { id: 'pts', header: 'Pontos', align: 'right', render: (c) => <span className="st-pts">{c.points}</span> },
  ]

  const mode = isDesktop ? 'box' : 'page'
  const loading = remote.status === 'loading' && isSupabaseConfigured

  return (
    <div className="space-y-4">
      <Segmented<StageView>
        label="Classificação da prova"
        value={view}
        onChange={setView}
        options={[
          { value: 'equipa', label: 'Equipa' },
          { value: 'clubes', label: 'Clubes' },
          { value: 'geral', label: 'Geral' },
        ]}
      />
      {remote.status === 'error' && (
        <p className="t-small t-strong text-[var(--danger)]" role="alert">
          Não foi possível ler a classificação completa. Verifica a ligação e tenta outra vez.
        </p>
      )}

      {view === 'equipa' &&
        (team.length === 0 && !loading ? (
          <EmptyState title="Sem atletas da equipa" text="Ainda não há resultados da U.R. Charneca nesta prova." />
        ) : (
          <div className="space-y-2">
            <p className="t-small text-[var(--text-2)]">
              {count(team.length, 'atleta', 'atletas')}
              {urcClub ? `. A equipa ficou em ${urcClub.pos}.º lugar com ${urcClub.points} pontos.` : '.'} O lugar é dentro do escalão.
            </p>
            <StandingsTable
              caption={`Atletas da U.R. Charneca na prova ${stageNumber(stage)}, por escalão`}
              columns={athleteColumns(false)}
              groups={groupByEscalao(team)}
              showGroupHeaders
              rowKey={(a) => `${a.escalao}|${a.pos}|${a.name}`}
              rowLabel={(a) => a.name}
              mode={mode}
              loading={loading}
            />
          </div>
        ))}

      {view === 'clubes' &&
        (clubs.length === 0 && !loading ? (
          <EmptyState title="Sem classificação de clubes" text="O site oficial ainda não publicou a classificação coletiva desta prova." />
        ) : (
          <StandingsTable
            caption={`Classificação por clubes na prova ${stageNumber(stage)}`}
            columns={clubColumns}
            groups={[{ id: 'all', label: 'Clubes', rows: clubs }]}
            rowKey={(c) => c.name}
            rowLabel={(c) => c.name}
            isHighlighted={(c) => c.urc}
            mode={mode}
            loading={loading}
          />
        ))}

      {view === 'geral' &&
        (all.length === 0 && !loading ? (
          <EmptyState
            title="Classificação geral por sincronizar"
            text={
              isSupabaseConfigured
                ? 'Aparece depois de o administrador atualizar as classificações a partir do site oficial.'
                : 'Indisponível em modo de demonstração.'
            }
          />
        ) : (
          <div className="space-y-3">
            <Filters
              escaloes={general.escaloes}
              escalao={general.escalao}
              onEscalao={general.setEscalao}
              query={general.query}
              onQuery={general.setQuery}
            />
            <Count shown={general.filtered.length} total={all.length} />
            <StandingsTable
              caption={`Classificação geral da prova ${stageNumber(stage)}, todos os clubes, por escalão`}
              columns={athleteColumns(true)}
              groups={groupByEscalao(general.filtered)}
              showGroupHeaders
              rowKey={(a) => `${a.escalao}|${a.pos}|${a.name}|${a.club}`}
              rowLabel={(a) => a.name}
              isHighlighted={(a) => a.urc}
              mode={mode}
              loading={loading}
              empty={<p className="t-small text-[var(--text-2)] py-3">Nenhum atleta corresponde à pesquisa.</p>}
            />
          </div>
        ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Classificação geral individual da época, todos os clubes
// ---------------------------------------------------------------------------

export const GeneralStandingsPanel: React.FC<{ season: TrofeuSeasonData; isDesktop: boolean }> = ({ season, isDesktop }) => {
  const remote = useRemote<TrofeuPublicGeneralAthlete[]>(season.season, () => fetchGeneralStandings(season.season))
  const rows = remote.status === 'ready' ? remote.data ?? [] : []
  const f = useFiltered(rows)
  const loading = remote.status === 'loading' && isSupabaseConfigured
  const stageCodes = useMemo(() => {
    if (!isDesktop) return []
    const set = new Set<string>()
    for (const r of rows) for (const k of Object.keys(r.pts)) set.add(k)
    return [...set].sort((a, b) => stageNumber(a) - stageNumber(b))
  }, [rows, isDesktop])

  if (remote.status === 'error') {
    return (
      <p className="t-small t-strong text-[var(--danger)]" role="alert">
        Não foi possível ler a classificação geral. Verifica a ligação e tenta outra vez.
      </p>
    )
  }
  if (rows.length === 0 && !loading) {
    return (
      <EmptyState
        title="Classificação geral por sincronizar"
        text={
          isSupabaseConfigured
            ? 'Aparece depois de o administrador atualizar as classificações a partir do site oficial.'
            : 'Indisponível em modo de demonstração.'
        }
      />
    )
  }

  const columns: StandingsColumn<TrofeuPublicGeneralAthlete>[] = [
    { id: 'pos', header: 'Lugar', render: (a) => <RankBadge pos={a.pos} highlight={a.urc} />, className: 'st-col-pos' },
    { id: 'name', header: 'Atleta', rowHeader: true, render: (a) => <NameCell name={a.name} club={a.club} urc={a.urc} /> },
    ...stageCodes.map<StandingsColumn<TrofeuPublicGeneralAthlete>>((code) => ({
      id: code,
      header: code,
      title: `Prova ${stageNumber(code)}`,
      align: 'right',
      render: (a) => (a.pts[code] !== undefined ? <span className="t-num">{a.pts[code]}</span> : <span className="st-dash" aria-label="sem pontos">–</span>),
    })),
    { id: 'stages', header: 'Provas', align: 'right', render: (a) => <span className="t-num">{a.stages}</span> },
    { id: 'total', header: 'Pontos', align: 'right', render: (a) => <span className="st-pts">{a.total}</span> },
  ]

  return (
    <div className="space-y-3">
      <p className="t-small text-[var(--text-2)]">
        Lugar acumulado no escalão, com atletas de todos os clubes. Os da U.R. Charneca aparecem destacados.
      </p>
      <Filters escaloes={f.escaloes} escalao={f.escalao} onEscalao={f.setEscalao} query={f.query} onQuery={f.setQuery} />
      <Count shown={f.filtered.length} total={rows.length} />
      <StandingsTable
        caption={`Classificação geral individual, época ${season.season}, todos os clubes, por escalão`}
        columns={columns}
        groups={groupByEscalao(f.filtered)}
        showGroupHeaders
        rowKey={(a) => `${a.escalao}|${a.pos}|${a.name}|${a.club}`}
        rowLabel={(a) => a.name}
        isHighlighted={(a) => a.urc}
        mode={isDesktop ? 'box' : 'page'}
        loading={loading}
        empty={<p className="t-small text-[var(--text-2)] py-3">Nenhum atleta corresponde à pesquisa.</p>}
      />
    </div>
  )
}
