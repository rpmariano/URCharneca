import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Map as MapIcon,
  RefreshCw,
  Search,
  ShieldCheck,
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
import { computeNextBiweeklyCheck } from '../services/trofeuSyncService'
import { formatShortDate } from '../utils/formatters'
import { seasonOf, todayISO } from '../utils/dates'
import { AppHeader, HeaderButton } from '../components/AppHeader'
import { Button, Chip, EmptyState, SectionTitle, Segmented, Tag, inputClass } from '../components/ui'

type TrofeuTab = 'clubes' | 'atletas' | 'provas' | 'regulamento'

/** Mínimo de provas para entrar nos prémios finais individuais: 70% das provas (Regulamento, ponto 5.3.1). */
const minStagesForPrize = (total: number) => Math.ceil(total * 0.7)

/**
 * Troféu de Atletismo de Cascais (/trofeu): onde está a U.R. Charneca na classificação, os atletas,
 * as provas de cada época e as regras. Os dorsais editam-se na ficha do atleta (Gerir), não aqui.
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
    checkRaceDocumentsNow,
  } = useApp()

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    () => trofeuSeasons.find((s) => s.status === 'open')?.season || '2026/2027'
  )
  const [tab, setTab] = useState<TrofeuTab>('clubes')
  const [escalaoFilter, setEscalaoFilter] = useState<string>('all')
  const [searchQ, setSearchQ] = useState('')

  const today = todayISO()
  const activeSeason = useMemo(
    () => trofeuSeasons.find((s) => s.season === selectedSeasonId) || trofeuSeasons[0],
    [trofeuSeasons, selectedSeasonId]
  )

  const standings = activeSeason?.athlete_standings || []
  const escalaoOptions = useMemo(() => {
    const groups = new Set<string>()
    for (const a of standings) groups.add(a.escalao.replace(/\s*\([MF]\)$/, ''))
    return ['all', ...Array.from(groups)]
  }, [standings])

  const displayedAthletes = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    return standings.filter((a) => {
      if (escalaoFilter !== 'all' && !a.escalao.toLowerCase().includes(escalaoFilter.toLowerCase())) return false
      if (!q) return true
      return a.name.toLowerCase().includes(q) || a.escalao.toLowerCase().includes(q) || Boolean(a.dorsal?.toLowerCase().includes(q))
    })
  }, [standings, escalaoFilter, searchQ])

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

  if (!activeSeason) {
    return (
      <div className="px-5 pt-6">
        <EmptyState icon={Trophy} title="Sem dados do Troféu" text="Ainda não há épocas carregadas." />
      </div>
    )
  }

  return (
    <div className="px-5 pb-28 space-y-5">
      <AppHeader
        className="-mx-5"
        title="Troféu de Cascais"
        leading={
          <HeaderButton label="Voltar" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </HeaderButton>
        }
        action={
          <>
            <a
              href={TROFEU_SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-full bg-[var(--surface-card)] t-small t-strong text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hdr-fg)]"
            >
              Site oficial <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
            {isAdminView && (
              <HeaderButton label={isSyncingTrofeu ? 'A atualizar' : 'Atualizar dados do site'} disabled={isSyncingTrofeu} onClick={() => void syncTrofeuCascais('manual_admin')}>
                <RefreshCw className={`w-5 h-5 ${isSyncingTrofeu ? 'animate-spin' : ''}`} aria-hidden="true" />
              </HeaderButton>
            )}
          </>
        }
      />
      <p className="t-body text-[var(--text-3)]">Como está a U.R. Charneca nas provas do concelho.</p>

      {/* Época */}
      <section className="space-y-2" aria-label="Época">
        <div className="scroll-row gap-2">
          {trofeuSeasons.map((s) => (
            <Chip
              key={s.season}
              active={s.season === activeSeason.season}
              onClick={() => {
                setSelectedSeasonId(s.season)
                setEscalaoFilter('all')
                setSearchQ('')
              }}
            >
              {s.season}
              {s.status === 'open' && <span className="w-2 h-2 rounded-full bg-[var(--ok)]" aria-label="em curso" />}
            </Chip>
          ))}
        </div>
        <p className="t-small text-[var(--text-3)]">
          {activeSeason.edition_number}.º Troféu · {isOpen ? 'em curso. Os pontos contam só desta época.' : 'terminado. Classificação final.'}
        </p>
      </section>

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

      {/* ------------------------------ CLUBES ------------------------------ */}
      {tab === 'clubes' && (
        <div className="space-y-5">
          {urc && (
            <div className="card-raised p-5 space-y-4 border-l-4 border-[var(--run)]">
              <div>
                <div className="t-small t-strong text-[var(--text-3)]">U.R. Charneca</div>
                <div className="t-title t-num text-[var(--text-1)]">
                  {urc.pos}.º lugar <span className="t-body font-normal text-[var(--text-3)]">· {urc.total} pontos</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <div className="t-small text-[var(--text-3)]">Provas pontuadas</div>
                  <div className="t-body t-strong t-num text-[var(--text-1)]">
                    {Object.keys(urc.points_per_stage).length} de {activeSeason.stages.length || '—'}
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--surface-raised)] p-3">
                  <div className="t-small text-[var(--text-3)]">Apoio da Câmara</div>
                  <div className="t-body t-strong t-num text-[var(--text-1)]">
                    {urc.prize_amount_eur ? `${urc.prize_amount_eur} €` : isOpen ? 'No fim da época' : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSeason.club_standings.length > 0 ? (
            <section className="space-y-3">
              <SectionTitle title="Classificação por clubes" count={activeSeason.club_standings.length} />
              <div className="divide-soft">
                {activeSeason.club_standings.map((c) => (
                  <div key={`${c.season}-${c.team}`} className={`py-3 px-2 rounded-xl flex items-center gap-3 ${c.is_urc ? 'bg-[var(--tint-blue-bg)] px-3' : ''}`}>
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center t-small t-strong t-num shrink-0 ${
                        c.pos <= 3
                          ? 'bg-[var(--tint-amber-bg-strong)] text-[var(--tint-amber-fg)]'
                          : c.is_urc
                          ? 'bg-[var(--run)] text-[var(--on-accent)]'
                          : 'bg-[var(--surface-raised)] text-[var(--text-2)]'
                      }`}
                    >
                      {c.pos}.º
                    </span>
                    <div className={`min-w-0 flex-1 t-body truncate ${c.is_urc ? 't-strong text-[var(--run)]' : 'text-[var(--text-1)]'}`}>{c.team}</div>
                    <div className="text-right shrink-0">
                      <span className="t-body t-strong t-num text-[var(--text-1)]">{c.total}</span> <span className="t-small text-[var(--text-3)]">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <EmptyState
              icon={History}
              title={`Época ${activeSeason.season}`}
              text="O detalhe prova a prova desta época está nos documentos oficiais abaixo."
            />
          )}

          {(activeSeason.awarded_collective_pdf || activeSeason.awarded_individual_pdf) && (
            <section className="space-y-2">
              <SectionTitle title="Documentos oficiais" />
              <div className="space-y-2">
                {activeSeason.awarded_collective_pdf && (
                  <a href={activeSeason.awarded_collective_pdf} target="_blank" rel="noreferrer" className="card p-4 flex items-center justify-between gap-3 pressable">
                    <span className="flex items-center gap-3 min-w-0">
                      <Trophy className="w-5 h-5 text-[var(--gold-ink)] shrink-0" aria-hidden="true" />
                      <span className="t-body text-[var(--text-1)]">Premiados por clubes</span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-[var(--text-3)] shrink-0" aria-hidden="true" />
                  </a>
                )}
                {activeSeason.awarded_individual_pdf && (
                  <a href={activeSeason.awarded_individual_pdf} target="_blank" rel="noreferrer" className="card p-4 flex items-center justify-between gap-3 pressable">
                    <span className="flex items-center gap-3 min-w-0">
                      <Award className="w-5 h-5 text-[var(--run)] shrink-0" aria-hidden="true" />
                      <span className="t-body text-[var(--text-1)]">Premiados individuais</span>
                    </span>
                    <ExternalLink className="w-4 h-4 text-[var(--text-3)] shrink-0" aria-hidden="true" />
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
            <div className="card p-4 border-l-4 border-[var(--warn)] bg-[var(--tint-amber-bg)] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--tint-amber-fg)] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="t-small text-[var(--text-1)]">
                  {pendingDorsalAthletesCount} {pendingDorsalAthletesCount === 1 ? 'atleta ainda não tem' : 'atletas ainda não têm'} dorsal do Troféu. Preenche-o na ficha de cada atleta.
                </p>
                <Button size="sm" variant="secondary" onClick={() => navigate('/admin')}>
                  Abrir Gerir
                </Button>
              </div>
            </div>
          )}

          {standings.length === 0 ? (
            <EmptyState icon={Users} title="Sem atletas nesta época" text="Quando houver classificações da U.R. Charneca, aparecem aqui." />
          ) : (
            <>
              <div className="relative">
                <Search className="w-5 h-5 text-[var(--text-3)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  className={`${inputClass} pl-11`}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Procurar atleta, escalão ou dorsal"
                  aria-label="Procurar atletas do Troféu"
                />
              </div>

              {escalaoOptions.length > 2 && (
                <div className="scroll-row gap-2">
                  {escalaoOptions.map((esc) => (
                    <Chip key={esc} active={escalaoFilter === esc} onClick={() => setEscalaoFilter(esc)}>
                      {esc === 'all' ? 'Todos' : esc}
                    </Chip>
                  ))}
                </div>
              )}

              <SectionTitle title="Atletas da U.R. Charneca" count={displayedAthletes.length} />

              {displayedAthletes.length === 0 ? (
                <EmptyState icon={Users} title="Nada encontrado" text="Experimenta outro escalão ou outra pesquisa." />
              ) : (
                <div className="space-y-3">
                  {displayedAthletes.map((a) => {
                    const need = minStagesForPrize(a.total_season_stages)
                    const meets = a.stages_participated >= need
                    const pct = Math.min(100, Math.round((a.stages_participated / Math.max(1, a.total_season_stages)) * 100))
                    return (
                      <div key={a.id} className="card p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-9 h-9 rounded-lg flex items-center justify-center t-small t-strong t-num shrink-0 ${
                              a.pos > 0 && a.pos <= 3 ? 'bg-[var(--tint-amber-bg-strong)] text-[var(--tint-amber-fg)]' : 'bg-[var(--surface-raised)] text-[var(--text-2)]'
                            }`}
                            aria-label={a.pos > 0 ? `${a.pos}.º lugar` : 'Sem classificação'}
                          >
                            {a.pos > 0 ? `${a.pos}.º` : '—'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="t-body t-strong text-[var(--text-1)] truncate">{a.name}</div>
                            <div className="t-small text-[var(--text-3)]">
                              {a.escalao} · {a.birth_year}
                              {a.dorsal ? ` · dorsal ${a.dorsal}` : ' · sem dorsal'}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="t-heading t-num text-[var(--text-1)]">{a.total}</div>
                            <div className="t-small text-[var(--text-3)]">pontos</div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between t-small text-[var(--text-2)]">
                            <span>
                              {a.stages_participated} de {a.total_season_stages} provas
                            </span>
                            <span className={meets ? 'text-[var(--ok)] t-strong' : 'text-[var(--text-3)]'}>
                              {meets ? 'Já cumpre o mínimo para prémios' : `Para prémios: mínimo ${need} provas`}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Provas feitas">
                            <div className="h-full rounded-full bg-[var(--run)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {Object.keys(a.points_per_stage).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(a.points_per_stage).map(([stage, pts]) => (
                              <span key={stage} className="px-2 py-0.5 rounded-md bg-[var(--surface-raised)] t-small t-num text-[var(--text-2)]">
                                {stage}: <strong>{pts}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ------------------------------ PROVAS ------------------------------ */}
      {tab === 'provas' && (
        <div className="space-y-4">
          {isAdminView && isOpen && (
            <p className="t-small text-[var(--text-3)]">
              A app procura novos documentos no site (croquis, regulamentos) duas vezes por semana. Próxima verificação:{' '}
              {new Date(nextAutoCheck).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' })}.
            </p>
          )}

          <SectionTitle title={`Provas · ${activeSeason.season}`} count={seasonRaces.length} />

          {seasonRaces.length === 0 ? (
            <EmptyState icon={Trophy} title="Sem provas nesta época" text="O calendário desta época não está disponível." />
          ) : (
            <div className="space-y-3">
              {seasonRaces.map((r, index) => {
                const isPast = r.date < today
                const docs = r.documents || []
                const hasCroqui = docs.some((d) => d.type === 'croqui')
                return (
                  <div key={r.id} className="card p-4 space-y-3">
                    <button type="button" onClick={() => navigate(`/prova/${r.id}`)} className="w-full text-left cursor-pointer space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag tone={isPast ? 'neutral' : 'info'}>Prova {r.trophy_stage_number || index + 1}</Tag>
                        {!isPast && (hasCroqui ? <Tag tone="ok"><MapIcon className="w-3 h-3" aria-hidden="true" /> Croqui</Tag> : <Tag tone="warn">Croqui por publicar</Tag>)}
                        {isPast && <Tag tone="neutral">Realizada</Tag>}
                      </div>
                      <h3 className="t-body t-strong text-[var(--text-1)]">{r.title}</h3>
                      <div className="t-small text-[var(--text-3)]">
                        {formatShortDate(r.date)} · {r.location}
                      </div>
                    </button>

                    {docs.length > 0 && (
                      <div className="space-y-1.5">
                        {docs.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-2 min-h-11 px-3 rounded-lg bg-[var(--surface-raised)] t-small text-[var(--text-1)]"
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

                    <div className="flex items-center justify-end gap-2">
                      {isAdminView && !isPast && (
                        <Button size="sm" variant="ghost" onClick={() => void checkRaceDocumentsNow(r.id)}>
                          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Procurar documentos
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/prova/${r.id}`)}>
                        Ver prova
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------ REGRAS ------------------------------ */}
      {tab === 'regulamento' && (
        <div className="space-y-5">
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2 t-heading text-[var(--text-1)]">
              <BookOpen className="w-5 h-5 text-[var(--run)] shrink-0" aria-hidden="true" />
              Regulamento 2026/2027
            </div>
            <a
              href={TROFEU_REGULATION_2026_2027_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 min-h-11 rounded-xl bg-[var(--run)] text-[var(--on-accent)] t-small t-strong"
            >
              <FileText className="w-4 h-4" aria-hidden="true" /> Abrir o regulamento (PDF)
            </a>
          </div>

          <section className="space-y-2">
            <SectionTitle title="O que precisas de saber" />
            <div className="card p-4 space-y-3 t-small text-[var(--text-2)]">
              {[
                ['Inscrições', 'Fecham às 24h do 3.º dia útil antes da prova (quarta-feira, para provas ao domingo).'],
                ['Dorsal', 'É o mesmo para toda a época e é pessoal. Usar o de outra pessoa dá desclassificação.'],
                ['Prémios individuais', 'Para ter direito aos prémios finais (1.º ao 10.º) é preciso ter feito pelo menos 70% das provas.'],
                ['Prémios de clubes', 'Contam pelo menos 4 atletas por prova. Para o apoio final, o clube precisa de 10 atletas com 50% das provas.'],
                ['Desempate', 'Ganha quem fez mais provas; depois, quem tem mais 1.os, 2.os e 3.os lugares.'],
              ].map(([title, text]) => (
                <div key={title} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--ok)] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong className="text-[var(--text-1)]">{title}.</strong> {text}
                  </span>
                </div>
              ))}
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--run)] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Os pontos de cada época são independentes: não se somam aos das épocas anteriores.</span>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle title="Pontos por lugar" />
            <div className="grid grid-cols-3 gap-2">
              {TROFEU_POINTS_TABLE.map((row) => (
                <div key={row.label} className="card p-3 text-center">
                  <div className="t-small text-[var(--text-3)]">{row.label}</div>
                  <div className="t-heading t-num text-[var(--text-1)]">{row.points}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle title="Apoio da Câmara aos clubes" />
            <div className="grid grid-cols-2 gap-2">
              {TROFEU_COLLECTIVE_PRIZES_2026_2027.map((p) => (
                <div key={p.pos} className="card p-3 flex items-center justify-between">
                  <span className="t-small text-[var(--text-2)]">{p.label}</span>
                  <span className="t-body t-strong t-num text-[var(--text-1)]">{p.amountEur} €</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <SectionTitle title="Escalões e distâncias" />
            <div className="divide-soft card px-4">
              {TROFEU_ESCALOES_2026_2027.map((e) => (
                <div key={e.escalao} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="t-body t-strong text-[var(--text-1)]">{e.escalao}</div>
                    <div className="t-small text-[var(--text-3)]">Nascidos em {e.years}</div>
                  </div>
                  <div className="text-right t-small text-[var(--text-2)]">
                    <div>Estrada: {e.estrada}</div>
                    <div className="text-[var(--text-3)]">Corta-mato: {e.cortaMato}</div>
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
