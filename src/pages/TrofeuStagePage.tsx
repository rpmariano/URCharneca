import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { AppHeader, HeaderButton } from '../components/AppHeader'
import { StageResultsPanel } from '../components/TrofeuFullResults'
import { EmptyState } from '../components/ui'
import { useDesktopShell } from '../layout/useDesktopShell'
import { formatShortDate } from '../utils/formatters'
import { seasonOf } from '../utils/dates'
import { raceTitleParts, tidyText } from '../utils/display'

/** Classificação de uma etapa do Troféu (`/trofeu/etapa/:n?epoca=2026/2027`): a nossa equipa, clubes e geral. */
export const TrofeuStagePage: React.FC = () => {
  const { n } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isDesktop = useDesktopShell()
  const { trofeuSeasons, races } = useApp()
  const seasonId = params.get('epoca') || trofeuSeasons.find((s) => s.status === 'open')?.season || '2026/2027'
  const season = trofeuSeasons.find((s) => s.season === seasonId)
  const stageNo = Number(n)
  const stage = `P${stageNo}`
  const race = races.find((r) => r.category === 'trofeu_cascais' && r.trophy_stage_number === stageNo && seasonOf(r.date) === seasonId)
  const calendar = season?.stages.find((s) => s.stage_number === stageNo)
  const title = race ? raceTitleParts(race).name : calendar?.title || `Prova ${stageNo}`
  const when = race ? `${formatShortDate(race.date)} · ${tidyText(race.location)}` : calendar ? `${formatShortDate(calendar.date)} · ${calendar.location}` : ''
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/trofeu', { replace: true })
  }

  return (
    <div className="page-read px-5 pb-28 space-y-5" style={{ '--read-max': '1200px' } as React.CSSProperties}>
      <AppHeader
        className="-mx-5"
        title={`Prova ${stageNo}`}
        emblem={false}
        leading={
          <HeaderButton label="Voltar" onClick={goBack}>
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
          </HeaderButton>
        }
      />
      {!season || !Number.isFinite(stageNo) || stageNo <= 0 ? (
        <EmptyState title="Prova não encontrada" text="O link pode estar incompleto." action="Abrir o Troféu" onAction={() => navigate('/trofeu', { replace: true })} />
      ) : (
        <>
          <section className="space-y-1">
            <h2 className="t-title text-[var(--text-1)]">{title}</h2>
            <p className="t-body text-[var(--text-2)]">
              {when}
              {when ? ' · ' : ''}Época {season.season}
            </p>
            {race && (
              <button type="button" className="inline-flex items-center gap-1.5 min-h-11 t-small t-strong text-[var(--link)] underline underline-offset-4 cursor-pointer" onClick={() => navigate(`/prova/${race.id}`)}>
                Ver a prova <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </section>
          <StageResultsPanel key={`${season.season}|${stage}`} season={season} stage={stage} isDesktop={isDesktop} />
        </>
      )}
    </div>
  )
}
