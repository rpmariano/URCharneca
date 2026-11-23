import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  History,
  Map as MapIcon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag as TagIcon,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  TROFEU_COLLECTIVE_PRIZES_2026_2027,
  TROFEU_ESCALOES_2026_2027,
  TROFEU_POINTS_TABLE,
  TROFEU_REGULATION_2026_2027_URL,
  TROFEU_SITE_URL,
} from '../data/trofeuData'
import { computeNextBiweeklyCheck, normalizeName } from '../services/trofeuSyncService'
import { formatShortDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import {
  Button,
  Chip,
  EmptyState,
  IconButton,
  PageHeader,
  SectionTitle,
  Segmented,
  Tag,
  inputClass,
} from '../components/ui'

type TrofeuTab = 'clubes' | 'atletas' | 'provas' | 'regulamento'
type AthleteFilter = 'season' | 'past_only' | 'new_only' | 'missing_dorsal'

/** Página dedicada ao Troféu de Atletismo de Cascais (/trofeu) */
export const TrofeuPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    races,
    profiles,
    youthAthletes,
    isAdminView,
    trofeuSeasons,
    trofeuSyncLogs,
    isSyncingTrofeu,
    pendingDorsalAthletesCount,
    syncTrofeuCascais,
    assignTrofeuDorsal,
    checkRaceDocumentsNow,
  } = useApp()

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('2026/2027')
  const [tab, setTab] = useState<TrofeuTab>('clubes')
  const [athleteFilter, setAthleteFilter] = useState<AthleteFilter>('season')
  const [escalaoFilter, setEscalaoFilter] = useState<string>('all')
  const [searchQ, setSearchQ] = useState('')
  const [dorsalDrafts, setDorsalDrafts] = useState<Record<string, string>>({})

  const today = todayISO()
  const activeSeason = useMemo(
    () => trofeuSeasons.find((s) => s.season === selectedSeasonId) || trofeuSeasons[0],
    [trofeuSeasons, selectedSeasonId]
  )

  const openSeason = useMemo(
    () => trofeuSeasons.find((s) => s.status === 'open') || trofeuSeasons[0],
    [trofeuSeasons]
  )
  const pastSeason2526 = useMemo(
    () => trofeuSeasons.find((s) => s.season === '2025/2026'),
    [trofeuSeasons]
  )

  // Conjuntos para detetar participação apenas no passado vs estreia em 2026/2027
  const active2627Keys = useMemo(() => {
    const set = new Set<string>()
    for (const a of openSeason?.athlete_standings || []) {
      set.add(`${normalizeName(a.name)}|${a.birth_year}`)
    }
    return set
  }, [openSeason])

  const past2526Keys = useMemo(() => {
    const set = new Set<string>()
    for (const a of pastSeason2526?.athlete_standings || []) {
      set.add(`${normalizeName(a.name)}|${a.birth_year}`)
    }
    return set
  }, [pastSeason2526])

  // Combinar atletas da época selecionada + visão transversal de passado/presente
  const displayedAthletes = useMemo(() => {
    let base = activeSeason?.athlete_standings || []

    if (athleteFilter === 'past_only') {
      base = (pastSeason2526?.athlete_standings || []).filter(
        (a) => !active2627Keys.has(`${normalizeName(a.name)}|${a.birth_year}`)
      )
    } else if (athleteFilter === 'new_only') {
      base = (openSeason?.athlete_standings || []).filter(
        (a) => !past2526Keys.has(`${normalizeName(a.name)}|${a.birth_year}`)
      )
    } else if (athleteFilter === 'missing_dorsal') {
      // Unir todos os atletas sem dorsal (priorizando época atual e depois histórico)
      const seen = new Set<string>()
      const merged = [...(openSeason?.athlete_standings || []), ...(pastSeason2526?.athlete_standings || [])].filter(
        (a) => {
          const key = a.matched_profile_id || `${normalizeName(a.name)}|${a.birth_year}`
          if (seen.has(key)) return false
          seen.add(key)
          return !a.dorsal
        }
      )
      base = merged
    }

    const q = searchQ.trim().toLowerCase()
    return base.filter((a) => {
      if (escalaoFilter !== 'all' && !a.escalao.toLowerCase().includes(escalaoFilter.toLowerCase())) return false
      if (q) {
        return (
          a.name.toLowerCase().includes(q) ||
          a.escalao.toLowerCase().includes(q) ||
          (a.dorsal && a.dorsal.toLowerCase().includes(q)) ||
          a.season.includes(q)
        )
      }
      return true
    })
  }, [
    activeSeason,
    athleteFilter,
    escalaoFilter,
    searchQ,
    pastSeason2526,
    openSeason,
    active2627Keys,
    past2526Keys,
  ])

  const escalaoOptions = useMemo(() => {
    const groups = new Set<string>()
    for (const a of activeSeason?.athlete_standings || []) {
      groups.add(a.escalao.replace(/\s*\([MF]\)$/, ''))
    }
    return ['all', ...Array.from(groups)]
  }, [activeSeason])

  // Provas da época 2026/2027 sincronizadas na app
  const trofeuRaces = useMemo(
    () =>
      races
        .filter((r) => r.category === 'trofeu_cascais')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [races]
  )

  const lastLog = trofeuSyncLogs[0]
  const nextAutoCheck = computeNextBiweeklyCheck(lastLog ? new Date(lastLog.timestamp) : new Date())

  const urcClubStanding = activeSeason?.club_standings.find((c) => c.is_urc)

  // Resolver dorsal (por época) e perfil associado na app
  const findAppPerson = (matchedId?: string) => {
    if (!matchedId) return null
    const adult = profiles.find((p) => p.id === matchedId)
    if (adult)
      return {
        id: adult.id,
        isYouth: false,
        dorsal: adult.dorsal_trofeu,
        dorsais_trofeu: adult.dorsais_trofeu,
        needsReview: adult.needs_admin_review,
      }
    const child = youthAthletes.find((y) => y.id === matchedId)
    if (child)
      return {
        id: child.id,
        isYouth: true,
        dorsal: child.dorsal_trofeu,
        dorsais_trofeu: child.dorsais_trofeu,
        needsReview: child.needs_admin_review,
      }
    return null
  }

  return (
    <div className="px-5 pb-28 space-y-5">
      {/* Navegação superior */}
      <div className="flex items-center justify-between pt-4">
        <IconButton label="Voltar" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </IconButton>
        <div className="flex items-center gap-2">
          <a
            href={TROFEU_SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 min-h-10 rounded-full border border-[var(--border-card)] bg-[var(--surface-card)] t-small t-strong text-[var(--text-1)]"
          >
            Site oficial <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
          <Button
            size="sm"
            variant="secondary"
            disabled={isSyncingTrofeu}
            onClick={() => void syncTrofeuCascais('manual_admin')}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingTrofeu ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isSyncingTrofeu ? 'A sincronizar...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      <PageHeader
        title="Troféu de Cascais"
        subtitle="Classificações oficiais, documentos e identificação por ID de dorsal."
      />

      {/* Alerta para Administradores sobre atletas auto-criados / sem dorsal */}
      {isAdminView && pendingDorsalAthletesCount > 0 && (
        <div className="card p-4 border-l-4 border-[var(--warn)] bg-[var(--tint-amber-bg)] space-y-2.5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--tint-amber-fg)] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="t-body t-strong text-[var(--text-1)]">
                {pendingDorsalAthletesCount} {pendingDorsalAthletesCount === 1 ? 'atleta aguarda' : 'atletas aguardam'} ID de Dorsal
              </div>
              <p className="t-small text-[var(--text-2)] mt-0.5">
                Atletas detetados no site do Troféu foram pré-criados automaticamente na app. Preenche o nº de dorsal (único para toda a época) para concluir a identificação.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setTab('atletas')
              setAthleteFilter('missing_dorsal')
            }}
          >
            <Ticket className="w-4 h-4" aria-hidden="true" /> Atribuir dorsais agora
          </Button>
        </div>
      )}

      {/* Seletor de Época: Época Aberta (2026/2027) vs Histórico Concluído */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="t-small t-strong text-[var(--text-2)]">Selecionar época do Troféu</span>
          {lastLog && (
            <span className="t-small text-[var(--text-3)]">
              Sync: {new Date(lastLog.timestamp).toLocaleDateString('pt-PT')}
            </span>
          )}
        </div>

        <div className="scroll-row gap-2">
          {trofeuSeasons.map((s) => {
            const isSelected = s.season === activeSeason?.season
            return (
              <Chip
                key={s.season}
                active={isSelected}
                color={s.status === 'open' ? 'var(--ok)' : 'var(--text-3)'}
                onClick={() => {
                  setSelectedSeasonId(s.season)
                  setAthleteFilter('season')
                  setEscalaoFilter('all')
                }}
              >
                <span>{s.season}</span>
                <span className="text-[10px] opacity-80">
                  {s.status === 'open' ? 'Aberto' : 'Concluído'}
                </span>
              </Chip>
            )
          })}
        </div>

        {/* Estado explícito da época selecionada (Aberto vs Histórico Concluído) */}
        <div className="card p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="t-body t-strong text-[var(--text-1)]">
                {activeSeason?.edition_number}º Troféu · Época {activeSeason?.season}
              </span>
              {activeSeason?.status === 'open' ? (
                <Tag tone="ok">
                  <Sparkles className="w-3 h-3" aria-hidden="true" /> Troféu Aberto (Em Curso)
                </Tag>
              ) : (
                <Tag tone="neutral">
                  <History className="w-3 h-3" aria-hidden="true" /> Troféu Concluído (Histórico)
                </Tag>
              )}
            </div>
            <p className="t-small text-[var(--text-3)] mt-1">
              {activeSeason?.status === 'open'
                ? 'A pontuação contabiliza exclusivamente as etapas realizadas na época 2026/2027 (épocas anteriores ficam apenas no histórico).'
                : `Classificação final oficial arquivada da época ${activeSeason?.season}. Não acumula para a época aberta.`}
            </p>
          </div>
        </div>
      </section>

      {/* Separadores de Conteúdo */}
      <Segmented<TrofeuTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'clubes', label: 'Clubes' },
          { value: 'atletas', label: 'Atletas' },
          { value: 'provas', label: 'Provas' },
          { value: 'regulamento', label: 'Regras' },
        ]}
      />

      {/* =================================================================== */}
      {/* TAB 1: CLASSIFICAÇÃO COLETIVA DE CLUBES                             */}
      {/* =================================================================== */}
      {tab === 'clubes' && (
        <div className="space-y-5">
          {/* Resumo da U.R. Charneca na época selecionada */}
          {urcClubStanding && (
            <div className="card-raised p-5 space-y-3 border-l-4 border-[var(--run)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="t-small t-strong text-[var(--run)] uppercase tracking-wider">
                    União Recreativa da Charneca · {activeSeason.season}
                  </div>
                  <div className="t-title t-num text-[var(--text-1)] mt-1">
                    {urcClubStanding.pos}º Lugar{' '}
                    <span className="t-body font-normal text-[var(--text-3)]">
                      ({urcClubStanding.total} pts)
                    </span>
                  </div>
                </div>
                <Tag tone={activeSeason.status === 'open' ? 'info' : 'ok'}>
                  {activeSeason.status === 'open' ? 'Aberto' : 'Final'}
                </Tag>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <div className="t-small text-[var(--text-3)]">Apoio Municipal (7.6.1)</div>
                  <div className="t-body t-strong t-num text-[var(--text-1)]">
                    {urcClubStanding.prize_amount_eur ? `${urcClubStanding.prize_amount_eur} €` : '—'}
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <div className="t-small text-[var(--text-3)]">Etapas pontuadas</div>
                  <div className="t-body t-strong t-num text-[var(--text-1)]">
                    {Object.keys(urcClubStanding.points_per_stage).length} / {activeSeason.stages.length || '—'}
                  </div>
                </div>
              </div>

              {activeSeason.status === 'open' && (
                <p className="t-small text-[var(--text-3)]">
                  Regra 5.2 & 5.3: Mínimo de 4 atletas por prova para pontuar coletivamente; prémio final exige 10 atletas com ≥ 50% das provas.
                </p>
              )}
            </div>
          )}

          {/* Lista de Clubes ou PDFs Históricos */}
          {activeSeason.club_standings.length > 0 ? (
            <section className="space-y-3">
              <SectionTitle
                title={`Classificação Coletiva · ${activeSeason.season}`}
                count={activeSeason.club_standings.length}
              />
              <div className="divide-soft">
                {activeSeason.club_standings.map((c) => (
                  <div
                    key={`${c.season}-${c.team}`}
                    className={`py-3 px-2 rounded-xl flex items-center gap-3 ${
                      c.is_urc ? 'bg-[var(--tint-blue-bg)] px-3' : ''
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center t-small t-strong t-num shrink-0 ${
                        c.pos <= 3
                          ? 'bg-[var(--tint-amber-bg-strong)] text-[var(--tint-amber-fg)]'
                          : c.is_urc
                          ? 'bg-[var(--run)] text-[var(--on-accent)]'
                          : 'bg-[var(--surface-raised)] text-[var(--text-2)]'
                      }`}
                    >
                      {c.pos}º
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`t-body truncate ${c.is_urc ? 't-strong text-[var(--run)]' : 'text-[var(--text-1)]'}`}>
                        {c.team}
                      </div>
                      <div className="t-small text-[var(--text-3)] truncate">
                        {Object.entries(c.points_per_stage)
                          .slice(-5)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="t-body t-strong t-num text-[var(--text-1)]">{c.total}</div>
                      <div className="t-small text-[var(--text-3)]">pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <EmptyState
              icon={History}
              title={`Arquivo ${activeSeason.season}`}
              text="Os resultados detalhados etapa-a-etapa desta época anterior estão disponíveis nos documentos oficiais PDF em baixo."
            />
          )}

          {/* PDFs de Premiados Históricos */}
          {(activeSeason.awarded_collective_pdf || activeSeason.awarded_individual_pdf) && (
            <section className="space-y-2 pt-2">
              <SectionTitle title={`Documentos Oficiais · ${activeSeason.season}`} />
              <div className="grid grid-cols-1 gap-2">
                {activeSeason.awarded_collective_pdf && (
                  <a
                    href={activeSeason.awarded_collective_pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="card p-3.5 flex items-center justify-between gap-3 pressable"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Trophy className="w-5 h-5 text-[var(--gold-ink)] shrink-0" aria-hidden="true" />
                      <span className="t-body text-[var(--text-1)] truncate">
                        Premiados Classificação Coletiva ({activeSeason.season})
                      </span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-[var(--text-3)] shrink-0" aria-hidden="true" />
                  </a>
                )}
                {activeSeason.awarded_individual_pdf && (
                  <a
                    href={activeSeason.awarded_individual_pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="card p-3.5 flex items-center justify-between gap-3 pressable"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Award className="w-5 h-5 text-[var(--run)] shrink-0" aria-hidden="true" />
                      <span className="t-body text-[var(--text-1)] truncate">
                        Premiados Classificação Individual ({activeSeason.season})
                      </span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-[var(--text-3)] shrink-0" aria-hidden="true" />
                  </a>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: CLASSIFICAÇÃO INDIVIDUAL DE ATLETAS DA URC POR ESCALÃO E ANO */}
      {/* =================================================================== */}
      {tab === 'atletas' && (
        <div className="space-y-4">
          {/* Pesquisa */}
          <div className="relative">
            <Search className="w-5 h-5 text-[var(--text-3)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              className={`${inputClass} pl-11`}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Pesquisar atleta, escalão ou nº dorsal..."
              aria-label="Pesquisar atletas do Troféu"
            />
          </div>

          {/* Filtros de Participação Cruzada (Atual vs Passado) */}
          <div className="scroll-row gap-2">
            <Chip active={athleteFilter === 'season'} onClick={() => setAthleteFilter('season')}>
              Época {activeSeason.season}
            </Chip>
            <Chip active={athleteFilter === 'new_only'} onClick={() => setAthleteFilter('new_only')}>
              Estreia 2026/2027
            </Chip>
            <Chip active={athleteFilter === 'past_only'} onClick={() => setAthleteFilter('past_only')}>
              Só no passado (2025/26)
            </Chip>
            <Chip
              active={athleteFilter === 'missing_dorsal'}
              color={pendingDorsalAthletesCount > 0 ? 'var(--warn)' : undefined}
              onClick={() => setAthleteFilter('missing_dorsal')}
            >
              Sem dorsal ({pendingDorsalAthletesCount})
            </Chip>
          </div>

          {/* Filtros por Escalão */}
          <div className="scroll-row gap-1.5">
            {escalaoOptions.map((esc) => (
              <Chip key={esc} active={escalaoFilter === esc} onClick={() => setEscalaoFilter(esc)}>
                {esc === 'all' ? 'Todos os escalões' : esc}
              </Chip>
            ))}
          </div>

          <SectionTitle
            title={
              athleteFilter === 'past_only'
                ? 'Atletas com histórico (2025/2026) ausentes em 2026/2027'
                : athleteFilter === 'new_only'
                ? 'Estreias em 2026/2027'
                : athleteFilter === 'missing_dorsal'
                ? 'Atletas sem ID de Dorsal'
                : `Atletas U.R. Charneca · ${activeSeason.season}`
            }
            count={displayedAthletes.length}
          />

          {displayedAthletes.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sem classificações neste filtro"
              text="Experimenta mudar a época selecionada ou limpar o filtro de escalão."
            />
          ) : (
            <div className="space-y-2.5">
              {displayedAthletes.map((a) => {
                const person = findAppPerson(a.matched_profile_id)
                const key = `${normalizeName(a.name)}|${a.birth_year}`
                const in2627 = active2627Keys.has(key)
                const in2526 = past2526Keys.has(key)
                const seasonDorsal = person?.dorsais_trofeu?.[a.season] || a.dorsal
                const draftKey = `${a.id}:${a.season}`
                const draftVal = dorsalDrafts[draftKey] ?? (seasonDorsal || '')

                return (
                  <div key={a.id} className="card p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Tag tone={a.season_status === 'open' ? 'info' : 'neutral'}>
                            {a.season} · {a.season_status === 'open' ? 'Aberto' : 'Histórico'}
                          </Tag>
                          <Tag tone={a.pos > 0 && a.pos <= 3 ? 'warn' : 'neutral'}>
                            {a.pos > 0 ? `${a.pos}º ` : 'Inscrito · '}
                            {a.escalao}
                          </Tag>
                          {seasonDorsal ? (
                            <Tag tone="ok">Dorsal #{seasonDorsal}</Tag>
                          ) : (
                            <Tag tone="danger">Sem dorsal ({a.season})</Tag>
                          )}
                        </div>

                        <div className="t-body t-strong text-[var(--text-1)] mt-1.5 truncate">
                          {a.name}{' '}
                          <span className="t-small font-normal text-[var(--text-3)]">({a.birth_year})</span>
                        </div>

                        <div className="t-small text-[var(--text-3)] mt-0.5">
                          {in2627 && in2526
                            ? 'Ativo em 2026/2027 · Também pontuou em 2025/2026'
                            : in2627
                            ? 'Estreia na época 2026/2027 (sem registo anterior)'
                            : 'Participou em 2025/2026 · Sem presença registada em 2026/2027'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="t-heading t-num text-[var(--text-1)]">{a.total}</div>
                        <div className="t-small text-[var(--text-3)]">pts</div>
                      </div>
                    </div>

                    {/* Pontos por etapa e regra de assiduidade 70% */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-card)] flex-wrap">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(a.points_per_stage).map(([stage, pts]) => (
                          <span
                            key={stage}
                            className="px-1.5 py-0.5 rounded bg-[var(--surface-raised)] t-small t-num text-[var(--text-2)]"
                          >
                            {stage}: <strong>{pts}</strong>
                          </span>
                        ))}
                      </div>
                      <span className="t-small text-[var(--text-3)]">
                        {a.stages_participated}/{a.total_season_stages} provas ({Math.round((a.stages_participated / Math.max(1, a.total_season_stages)) * 100)}%)
                        {a.eligible_for_prize ? ' · Elegível 70%' : ''}
                      </span>
                    </div>

                    {/* Atribuição rápida do ID de Dorsal da época selecionada (exclusivo Troféu) */}
                    {isAdminView && person && (
                      <div className="pt-2 border-t border-[var(--border-card)] flex items-center gap-2">
                        <TagIcon className="w-4 h-4 text-[var(--text-3)] shrink-0" aria-hidden="true" />
                        <input
                          type="text"
                          value={draftVal}
                          onChange={(e) => setDorsalDrafts((prev) => ({ ...prev, [draftKey]: e.target.value }))}
                          placeholder={`Nº Dorsal ${a.season} (ex: 1129)`}
                          className="flex-1 min-w-0 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-card-strong)] px-3 py-1.5 t-small text-[var(--text-1)]"
                          aria-label={`ID de dorsal de ${a.name} na época ${a.season}`}
                        />
                        <Button
                          size="sm"
                          variant={seasonDorsal === draftVal && seasonDorsal ? 'secondary' : 'primary'}
                          onClick={() => assignTrofeuDorsal(person.id, person.isYouth, draftVal, a.season)}
                        >
                          <Check className="w-4 h-4" aria-hidden="true" /> Guardar
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: AS 13 PROVAS 2026/2027 & DOCUMENTAÇÃO BISSEMANAL             */}
      {/* =================================================================== */}
      {tab === 'provas' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-2 bg-[var(--tint-blue-bg)]">
            <div className="flex items-center gap-2 t-body t-strong text-[var(--text-1)]">
              <Clock className="w-5 h-5 text-[var(--run)] shrink-0" aria-hidden="true" />
              Motor Bissemanal de Documentação (2x/semana)
            </div>
            <p className="t-small text-[var(--text-2)]">
              Até passar a data de cada prova, a app verifica automaticamente <strong>2 vezes por semana (Terça e Sexta às 09:00)</strong> novos documentos no site oficial (ex: Croqui do percurso, Regulamento específico e Classificações).
            </p>
            <div className="t-small text-[var(--text-3)]">
              Próxima verificação automática: <strong>{new Date(nextAutoCheck).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' })}</strong>
            </div>
          </div>

          <SectionTitle title="Calendário Oficial 2026/2027" count={trofeuRaces.length} />

          <div className="space-y-3">
            {trofeuRaces.map((r) => {
              const isPast = r.date < today
              const docs = r.documents || []
              const hasCroqui = docs.some((d) => d.type === 'croqui')
              return (
                <div key={r.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/prova/${r.id}`)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag tone={isPast ? 'neutral' : 'info'}>
                          Etapa {r.trophy_stage_number || '—'}
                        </Tag>
                        {hasCroqui ? (
                          <Tag tone="ok">
                            <MapIcon className="w-3 h-3" aria-hidden="true" /> Croqui disponível
                          </Tag>
                        ) : (
                          <Tag tone="warn">Aguarda croqui</Tag>
                        )}
                      </div>
                      <h3 className="t-body t-strong text-[var(--text-1)] mt-1">{r.title}</h3>
                      <div className="t-small text-[var(--text-3)] mt-0.5">
                        {formatShortDate(r.date)} · {r.location}
                        {r.organizer && ` · ${r.organizer}`}
                      </div>
                    </button>
                  </div>

                  {/* Documentos sincronizados desta etapa */}
                  {docs.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[var(--border-card)]">
                      {docs.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-[var(--surface-raised)] hover:opacity-90 t-small text-[var(--text-1)]"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-[var(--run)] shrink-0" aria-hidden="true" />
                            <span className="truncate">{doc.title}</span>
                            {doc.is_new && <Tag tone="ok">Novo</Tag>}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="t-small text-[var(--text-3)]">
                      {isPast ? 'Prova realizada' : 'Monitorização 2x/semana ativa'}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isPast && (
                        <Button size="sm" variant="ghost" onClick={() => void checkRaceDocumentsNow(r.id)}>
                          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Verificar docs
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/prova/${r.id}`)}>
                        Abrir prova
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: REGULAMENTO OFICIAL 2026/2027                                */}
      {/* =================================================================== */}
      {tab === 'regulamento' && (
        <div className="space-y-5">
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2 t-heading text-[var(--text-1)]">
              <BookOpen className="w-5 h-5 text-[var(--run)] shrink-0" aria-hidden="true" />
              Documento Orientador 2026/2027
            </div>
            <p className="t-body text-[var(--text-2)]">
              Regras oficiais lidas e integradas diretamente do regulamento publicado pela Câmara Municipal de Cascais para validar pontuações e escalões.
            </p>
            <a
              href={TROFEU_REGULATION_2026_2027_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 min-h-11 rounded-xl bg-[var(--run)] text-[var(--on-accent)] t-small t-strong"
            >
              <FileText className="w-4 h-4" aria-hidden="true" /> Descarregar Regulamento Oficial (PDF)
            </a>
          </div>

          {/* Regras principais */}
          <section className="space-y-2">
            <SectionTitle title="Critérios e Validação Oficial" />
            <div className="card p-4 space-y-2.5 t-small text-[var(--text-2)]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--ok)] shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Inscrições (Ponto 3.2):</strong> Terminam às 24h00 do 3º dia útil anterior (quarta-feira para provas ao domingo).</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--ok)] shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Dorsal Único (Ponto 6.6):</strong> Dorsal com chip é o mesmo para toda a época; usar dorsal alheio implica desclassificação.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--ok)] shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Classificação Coletiva (Ponto 5.2 & 5.3):</strong> Mínimo 4 atletas por prova. Prémios finais/apoio exigem 10 atletas com 50% das provas.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--ok)] shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Classificação Individual (Ponto 5.3.1):</strong> Prémios finais (1º ao 10º) exigem cumprir 70% das provas do escalão.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--run)] shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Desempate (Ponto 5.5):</strong> 1) Mais provas participadas; 2) Maior nº de 1ºs, 2ºs, 3ºs lugares sucessivamente.</span>
              </div>
            </div>
          </section>

          {/* Tabela de Pontuação */}
          <section className="space-y-2">
            <SectionTitle title="Tabela de Pontuação por Prova" />
            <div className="grid grid-cols-3 gap-2">
              {TROFEU_POINTS_TABLE.map((row) => (
                <div key={row.label} className="card p-3 text-center">
                  <div className="t-small text-[var(--text-3)]">{row.label}</div>
                  <div className="t-heading t-num text-[var(--text-1)]">{row.points} pts</div>
                </div>
              ))}
            </div>
          </section>

          {/* Comparticipação Financeira Coletiva */}
          <section className="space-y-2">
            <SectionTitle title="Apoio Financeiro Coletivo (Ponto 7.6.1)" />
            <div className="grid grid-cols-2 gap-2">
              {TROFEU_COLLECTIVE_PRIZES_2026_2027.map((p) => (
                <div key={p.pos} className="card p-3 flex items-center justify-between">
                  <span className="t-small text-[var(--text-2)]">{p.label}</span>
                  <span className="t-body t-strong t-num text-[var(--text-1)]">{p.amountEur} €</span>
                </div>
              ))}
            </div>
          </section>

          {/* Escalões 2026/2027 */}
          <section className="space-y-2">
            <SectionTitle title="Escalões e Distâncias (2026/2027)" />
            <div className="divide-soft card px-4">
              {TROFEU_ESCALOES_2026_2027.map((e) => (
                <div key={e.escalao} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="t-body t-strong text-[var(--text-1)]">{e.escalao}</div>
                    <div className="t-small text-[var(--text-3)]">Nascidos: {e.years}</div>
                  </div>
                  <div className="text-right t-small text-[var(--text-2)]">
                    <div>Estrada: {e.estrada}</div>
                    <div className="text-[var(--text-3)]">Corta-Mato: {e.cortaMato}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
