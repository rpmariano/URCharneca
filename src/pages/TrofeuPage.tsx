import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ExternalLink, FileText, RefreshCw, Trophy } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  TROFEU_COLLECTIVE_PRIZES_2026_2027,
  TROFEU_ESCALOES_2026_2027,
  TROFEU_POINTS_TABLE,
  TROFEU_REGULATION_2026_2027_URL,
  TROFEU_SITE_URL,
} from '../data/trofeuData'
import { computeNextBiweeklyCheck } from '../services/trofeuSyncService'
import { formatShortDate } from '../utils/formatters'
import { seasonOf, todayISO } from '../utils/dates'
import { raceTitleParts, tidyText } from '../utils/display'
import { AppHeader, HeaderButton, HeaderSegmented } from '../components/AppHeader'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { Button, Chip, EmptyState, SectionTitle, Segmented, Tag } from '../components/ui'
import { AthleteStandingsView, ClubStandingsView } from '../components/TrofeuStandings'
import { GeneralStandingsPanel } from '../components/TrofeuFullResults'
import { useDesktopShell } from '../layout/useDesktopShell'

type TrofeuTab = 'clubes' | 'atletas' | 'provas' | 'regulamento'

const formatSyncedAt = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * Troféu de Atletismo de Cascais (/trofeu): onde está a U.R. Charneca na classificação, os atletas,
 * as provas de cada época e as regras. Os dorsais editam-se na ficha do atleta (Gerir), não aqui.
 * A classificação de clubes é um "marcador" escuro (como a maqueta Pista).
 */
export const TrofeuPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    races,
    isAdminView,
    trofeuSeasons,
    trofeuSyncLogs,
    isSyncingTrofeu,
    pendingDorsalAthletesCount,
    syncTrofeuCascais,
    syncTrofeuResults,
    isSyncingTrofeuResults,
    checkRaceDocumentsNow,
    currentUser,
    youthAthletes,
  } = useApp()

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    () => trofeuSeasons.find((s) => s.status === 'open')?.season || '2026/2027'
  )
  const [tab, setTab] = useState<TrofeuTab>('clubes')
  const [athleteScope, setAthleteScope] = useState<'equipa' | 'todos'>('equipa')
  const isDesktop = useDesktopShell()

  const today = todayISO()
  // Só épocas em que a U.R. Charneca teve atletas (ou a época em curso)
  const visibleSeasons = useMemo(
    () => trofeuSeasons.filter((s) => s.status === 'open' || s.athlete_standings.length > 0),
    [trofeuSeasons]
  )
  const activeSeason = useMemo(
    () => trofeuSeasons.find((s) => s.season === selectedSeasonId) || trofeuSeasons[0],
    [trofeuSeasons, selectedSeasonId]
  )

  const standings = activeSeason?.athlete_standings || []
  // Fichas "minhas": o próprio e as crianças a cargo (para o filtro "Os meus" e o destaque nas linhas)
  const myChildIds = useMemo(
    () => youthAthletes.filter((y) => y.associated_adult_ids.includes(currentUser.id)).map((y) => y.id),
    [youthAthletes, currentUser.id]
  )
  // Provas da época escolhida (o calendário histórico vem do site oficial)
  const seasonRaces = useMemo(
    () =>
      races
        .filter((r) => r.category === 'trofeu_cascais' && seasonOf(r.date) === activeSeason?.season)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [races, activeSeason]
  )

  const lastLog = trofeuSyncLogs[0]
  const nextAutoCheck = computeNextBiweeklyCheck(lastLog ? new Date(lastLog.timestamp) : new Date())
  const urc = activeSeason?.club_standings.find((c) => c.is_urc)
  const isOpen = activeSeason?.status === 'open'

  const syncedAt = activeSeason ? formatSyncedAt(activeSeason.results_synced_at || activeSeason.last_synced_at) : ''
  const syncInfo = (syncedAt || (isAdminView && isOpen && isSupabaseConfigured)) && (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {syncedAt && <p className="t-small text-[var(--text-2)]">Dados oficiais atualizados em {syncedAt}</p>}
      {isAdminView && isOpen && isSupabaseConfigured && (
        <Button size="sm" variant="secondary" disabled={isSyncingTrofeuResults} onClick={() => void syncTrofeuResults()} aria-busy={isSyncingTrofeuResults}>
          <RefreshCw className={`w-4 h-4 ${isSyncingTrofeuResults ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isSyncingTrofeuResults ? 'A atualizar…' : 'Atualizar classificações'}
        </Button>
      )}
    </div>
  )

  if (!activeSeason) {
    return (
      <div className="px-5 pt-6">
        <EmptyState title="Sem dados do Troféu" text="Ainda não há épocas carregadas." />
      </div>
    )
  }

  const stagesTotal = activeSeason.stages.length

  return (
    // page-read: coluna de 960 px (provas em 2 colunas no computador); as tabelas de classificação usam até 1200 px
    <div
      className="page-read px-5 pb-28 space-y-5"
      style={{ '--read-max': tab === 'clubes' || tab === 'atletas' ? '1200px' : '960px' } as React.CSSProperties}
    >
      <AppHeader
        className="-mx-5"
        title="Troféu de Cascais"
        emblem={false}
        leading={
          <HeaderButton label="Voltar" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
          </HeaderButton>
        }
        action={
          <>
            <a
              href={TROFEU_SITE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Site oficial do Troféu (abre noutro separador)"
              title="Site oficial"
              className="w-11 h-11 flex items-center justify-center shrink-0 bg-[#ffffff] text-[#004c94] hover:bg-[#dfe8f3]"
            >
              <ExternalLink className="w-5 h-5" aria-hidden="true" />
            </a>
            {isAdminView && (
              <HeaderButton label={isSyncingTrofeu ? 'A atualizar' : 'Atualizar dados do site'} disabled={isSyncingTrofeu} onClick={() => void syncTrofeuCascais('manual_admin')}>
                <RefreshCw className={`w-5 h-5 ${isSyncingTrofeu ? 'animate-spin' : ''}`} aria-hidden="true" />
              </HeaderButton>
            )}
          </>
        }
      >
        <div className="px-5 pb-4">
          <HeaderSegmented<TrofeuTab>
            label="Secção do Troféu"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'clubes', label: 'Clubes' },
              { value: 'atletas', label: 'Atletas' },
              { value: 'provas', label: 'Provas' },
              { value: 'regulamento', label: 'Regras' },
            ]}
          />
        </div>
      </AppHeader>

      {/* Época */}
      <section className="space-y-2" aria-label="Época">
        <p className="t-body text-[var(--text-1)]">Como está a U.R. Charneca nas provas do concelho.</p>
        <div className="scroll-row gap-2 lg:flex-wrap">
          {visibleSeasons.map((s) => (
            <Chip
              key={s.season}
              active={s.season === activeSeason.season}
              onClick={() => {
                setSelectedSeasonId(s.season)
              }}
            >
              {s.season}
              {s.status === 'open' && <span className="font-normal">em curso</span>}
            </Chip>
          ))}
        </div>
        <p className="t-small text-[var(--text-2)]">
          {activeSeason.edition_number}.º Troféu, {isOpen ? 'em curso. Os pontos contam só desta época.' : 'terminado. Classificação final.'}
        </p>
      </section>

      {/* ------------------------------ CLUBES ------------------------------ */}
      {tab === 'clubes' && (
        <div className="space-y-6">
          <section className="st-board scope-dark on-band space-y-5" aria-labelledby="trofeu-clubes-h">
            {urc && (
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div className="flex items-end gap-3">
                  <span className="num text-[88px] text-[var(--band-accent)]" aria-hidden="true">
                    {urc.pos}
                  </span>
                  <span className="pb-2">
                    <span className="block t-small text-[var(--text-3)]">U.R. Charneca</span>
                    <span className="block num-wide text-[30px]">{urc.total} pontos</span>
                    <span className="sr-only">: {urc.pos}.º lugar</span>
                  </span>
                </div>
                <dl className="m-0 flex gap-6 pb-2">
                  <div>
                    <dt className="t-label text-[var(--text-3)]">Provas pontuadas</dt>
                    <dd className="m-0 num-wide text-[22px]">
                      {Object.keys(urc.points_per_stage).length} de {stagesTotal || '–'}
                    </dd>
                  </div>
                  <div>
                    <dt className="t-label text-[var(--text-3)]">Apoio da Câmara</dt>
                    <dd className="m-0 num-wide text-[22px]">
                      {urc.prize_amount_eur ? `${urc.prize_amount_eur} €` : isOpen ? 'No fim da época' : '–'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            {activeSeason.club_standings.length > 0 ? (
              <>
                <div id="trofeu-clubes-h">
                  <SectionTitle title="Classificação por clubes" count={activeSeason.club_standings.length} />
                </div>
                {syncInfo}
                <ClubStandingsView key={activeSeason.season} season={activeSeason} isDesktop={isDesktop} />
              </>
            ) : (
              <EmptyState title={`Época ${activeSeason.season}`} text="O detalhe prova a prova desta época está nos documentos oficiais abaixo." />
            )}
          </section>
          {(activeSeason.awarded_collective_pdf || activeSeason.awarded_individual_pdf) && (
            <section>
              <SectionTitle title="Documentos oficiais" />
              <div className="rule-list">
                {activeSeason.awarded_collective_pdf && (
                  <a href={activeSeason.awarded_collective_pdf} target="_blank" rel="noreferrer" className="row-link min-h-14 py-2 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-[var(--link)] shrink-0" aria-hidden="true" />
                      <span className="t-body t-strong text-[var(--text-1)]">Premiados por clubes</span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-[var(--text-1)] shrink-0" aria-hidden="true" />
                  </a>
                )}
                {activeSeason.awarded_individual_pdf && (
                  <a href={activeSeason.awarded_individual_pdf} target="_blank" rel="noreferrer" className="row-link min-h-14 py-2 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-[var(--link)] shrink-0" aria-hidden="true" />
                      <span className="t-body t-strong text-[var(--text-1)]">Premiados individuais</span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-[var(--text-1)] shrink-0" aria-hidden="true" />
                  </a>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ------------------------------ ATLETAS ------------------------------ */}
      {tab === 'atletas' && (
        <div className="space-y-4">
          {isAdminView && pendingDorsalAthletesCount > 0 && (
            <div className="bg-[var(--tint-amber-bg)] p-4 flex items-start gap-3" role="note">
              <AlertTriangle className="w-5 h-5 text-[var(--tint-amber-fg)] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="t-small t-strong text-[var(--tint-amber-fg)]">
                  {pendingDorsalAthletesCount} {pendingDorsalAthletesCount === 1 ? 'atleta ainda não tem' : 'atletas ainda não têm'} dorsal do Troféu. Preenche-o na ficha de cada atleta.
                </p>
                <Button size="sm" variant="secondary" onClick={() => navigate('/admin')}>
                  Abrir Gerir
                </Button>
              </div>
            </div>
          )}

          {syncInfo}

          <Segmented<'equipa' | 'todos'>
            label="Atletas a mostrar"
            value={athleteScope}
            onChange={setAthleteScope}
            options={[
              { value: 'equipa', label: 'A nossa equipa' },
              { value: 'todos', label: 'Todos os clubes' },
            ]}
          />

          {athleteScope === 'todos' ? (
            <section className="space-y-3" aria-labelledby="trofeu-geral-h">
              <div id="trofeu-geral-h">
                <SectionTitle title="Classificação geral individual" />
              </div>
              <GeneralStandingsPanel key={activeSeason.season} season={activeSeason} isDesktop={isDesktop} />
            </section>
          ) : standings.length === 0 && !isSyncingTrofeuResults ? (
            <EmptyState title="Sem atletas nesta época" text="Quando houver classificações da U.R. Charneca, aparecem aqui." />
          ) : (
            <section className="space-y-3" aria-labelledby="trofeu-atletas-h">
              <div id="trofeu-atletas-h">
                <SectionTitle title="Atletas da U.R. Charneca" count={standings.length} />
              </div>
              <p className="t-small text-[var(--text-2)]">
                O lugar é o acumulado no escalão (soma dos pontos das provas). Para os prémios finais conta ter feito pelo menos 70% das provas.
              </p>
              <AthleteStandingsView
                key={activeSeason.season}
                season={activeSeason}
                isDesktop={isDesktop}
                isAdminView={isAdminView}
                currentUserId={currentUser.id}
                childIds={myChildIds}
                loading={isSyncingTrofeuResults}
              />
            </section>
          )}
        </div>
      )}
      {/* ------------------------------ PROVAS ------------------------------ */}
      {tab === 'provas' && (
        <div className="space-y-4">
          {isAdminView && isOpen && (
            <p className="t-small text-[var(--text-2)]">
              A app procura novos documentos no site (croquis, regulamentos) duas vezes por semana. Próxima verificação:{' '}
              {new Date(nextAutoCheck).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' })}.
            </p>
          )}

          <section>
            <SectionTitle title={`Provas ${activeSeason.season}`} count={seasonRaces.length} />

            {seasonRaces.length === 0 ? (
              <EmptyState title="Sem provas nesta época" text="O calendário desta época não está disponível." />
            ) : (
              <div className="rule-list">
                {seasonRaces.map((r, index) => {
                  const isPast = r.date < today
                  const docs = r.documents || []
                  const hasCroqui = docs.some((d) => d.type === 'croqui')
                  const { stage, name } = raceTitleParts(r)
                  const n = stage ?? r.trophy_stage_number ?? index + 1
                  return (
                    <div key={r.id} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3.5 py-3">
                      <span className={`num text-[44px] pt-1 ${isPast ? 'text-[var(--text-1)]' : 'text-[var(--link)]'}`} aria-hidden="true">
                        {n}
                      </span>
                      <div className="min-w-0 space-y-2">
                        <button type="button" onClick={() => navigate(`/prova/${r.id}`)} className="w-full text-left cursor-pointer space-y-1 hover:underline underline-offset-4">
                          <h3 className="t-item text-[var(--text-1)]">
                            <span className="sr-only">Prova {n}: </span>
                            {name}
                          </h3>
                          <span className="block t-small text-[var(--text-2)]">
                            {formatShortDate(r.date)} · {tidyText(r.location)}
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {!isPast && (hasCroqui ? <Tag tone="ok">Croqui</Tag> : <Tag tone="warn">Croqui por publicar</Tag>)}
                          {isPast && <Tag tone="neutral">Realizada</Tag>}
                        </div>

                        {docs.length > 0 && (
                          <div className="divide-soft border-t border-[var(--rule)]">
                            {docs.map((doc) => (
                              <a
                                key={doc.id}
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="row-link flex items-center justify-between gap-2 min-h-11 t-small text-[var(--text-1)]"
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-[var(--link)] shrink-0" aria-hidden="true" />
                                  <span className="truncate">{tidyText(doc.title)}</span>
                                  {doc.is_new && <Tag tone="danger">Novo</Tag>}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 text-[var(--text-1)] shrink-0" aria-hidden="true" />
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          {isPast && (
                            <Button size="sm" onClick={() => navigate(`/trofeu/etapa/${n}?epoca=${encodeURIComponent(activeSeason.season)}`)}>
                              <Trophy className="w-4 h-4" aria-hidden="true" /> Classificação
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/prova/${r.id}`)}>
                            Ver prova
                          </Button>
                          {isAdminView && !isPast && (
                            <Button size="sm" variant="ghost" onClick={() => void checkRaceDocumentsNow(r.id)}>
                              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Procurar documentos
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------ REGRAS ------------------------------ */}
      {tab === 'regulamento' && (
        <div className="space-y-8">
          <section className="block-blue on-blue p-5 flex flex-col items-start gap-4">
            <h2 className="t-heading text-[var(--hdr-fg)]">Regulamento 2026/2027</h2>
            <a
              href={TROFEU_REGULATION_2026_2027_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 min-h-12 bg-[#ffffff] text-[#004c94] text-[16px] t-strong hover:bg-[#dfe8f3]"
            >
              <FileText className="w-4 h-4" aria-hidden="true" /> Abrir o regulamento (PDF)
            </a>
          </section>

          <section>
            <SectionTitle title="O que precisas de saber" />
            <dl className="rule-list m-0">
              {[
                ['Inscrições', 'Fecham às 24h do 3.º dia útil antes da prova (quarta-feira, para provas ao domingo).'],
                ['Dorsal', 'É o mesmo para toda a época e é pessoal. Usar o de outra pessoa dá desclassificação.'],
                ['Prémios individuais', 'Para ter direito aos prémios finais (1.º ao 10.º) é preciso ter feito pelo menos 70% das provas.'],
                ['Prémios de clubes', 'Contam pelo menos 4 atletas por prova. Para o apoio final, o clube precisa de 10 atletas com 50% das provas.'],
                ['Desempate', 'Ganha quem fez mais provas; depois, quem tem mais 1.os, 2.os e 3.os lugares.'],
                ['Épocas', 'Os pontos de cada época são independentes: não se somam aos das épocas anteriores.'],
              ].map(([title, text]) => (
                <div key={title} className="py-3 lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-4">
                  <dt className="t-body t-strong text-[var(--text-1)]">{title}</dt>
                  <dd className="m-0 t-body text-[var(--text-1)]">{text}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <SectionTitle title="Pontos por lugar" />
            <div className="grid grid-cols-3 gap-x-4 lg:grid-cols-6">
              {TROFEU_POINTS_TABLE.map((row) => (
                <div key={row.label} className="rule-top pt-1.5 pb-3">
                  <div className="num text-[44px] text-[var(--text-1)]">{row.points}</div>
                  <div className="t-small text-[var(--text-2)]">{row.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle title="Apoio da Câmara aos clubes" />
            <div className="rule-list">
              {TROFEU_COLLECTIVE_PRIZES_2026_2027.map((p) => (
                <div key={p.pos} className="min-h-12 py-2 flex items-center justify-between gap-3">
                  <span className="t-body text-[var(--text-1)]">{p.label}</span>
                  <span className="num-wide text-[24px] text-[var(--text-1)]">{p.amountEur} €</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle title="Escalões e distâncias" />
            <div className="rule-list">
              {TROFEU_ESCALOES_2026_2027.map((e) => (
                <div key={e.escalao} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="t-body t-strong text-[var(--text-1)]">{e.escalao}</div>
                    <div className="t-small text-[var(--text-2)]">Nascidos em {e.years}</div>
                  </div>
                  <div className="text-right t-small text-[var(--text-1)]">
                    <div>Estrada: {e.estrada}</div>
                    <div className="text-[var(--text-2)]">Corta-mato: {e.cortaMato}</div>
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
