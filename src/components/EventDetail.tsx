import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useDesktopShell } from '../layout/useDesktopShell'
import type { TeamEvent } from '../types'
import { EVENT_TYPE_LABELS } from '../types'
import { formatLongDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateEvent } from '../utils/appEvents'
import { tidyText } from '../utils/display'
import { DetailBar } from './AppHeader'
import { RsvpButtons, countdownLabel } from './ActivityItems'
import { DetailHero, FactRow, shareLink } from './RaceDetail'
import { PersonAvatar } from './PersonAvatar'
import { Button, FactStrip, HeroTag, KindMark, SectionTitle, kindOfEvent } from './ui'

/**
 * Detalhe de um treino/evento/reunião em página inteira: bloco azul com a data, faixa de factos, plano de treino,
 * confirmados e barra fixa com os botões de presença. Requer AppProvider.
 */
export const EventDetail: React.FC<{ event: TeamEvent; onBack: () => void }> = ({ event, onBack }) => {
  const { isAdminView, deleteEvent, showToast } = useApp()
  const kind = kindOfEvent(event)
  const going = event.attendees.filter((a) => a.status === 'going')
  const maybe = event.attendees.filter((a) => a.status === 'maybe')
  const past = event.date < todayISO()
  const countdown = countdownLabel(event.date)
  const title = tidyText(event.title)
  const typeLabel = EVENT_TYPE_LABELS[event.type].short

  const desktop = useDesktopShell()

  return (
    <>
    <DetailBar title={title} onBack={onBack} onShare={() => shareLink(event.title, `evento/${event.id}`, showToast)} />
    {/* Telemóvel: 1 coluna. Computador: duas colunas, info à esquerda e quem vai à direita (como o detalhe de prova) */}
    <div className={desktop ? 'desk-detail' : 'detail'}>
      <DetailHero
        date={event.date}
        title={title}
        when={`${formatLongDate(event.date)}, ${event.time}${countdown ? `. ${countdown}` : ''}`}
        desktop={desktop}
        imageUrl={event.image_url}
        extra={past && <span className="flex pt-1"><HeroTag>Realizado</HeroTag></span>}
      />
      <FactStrip
        className={desktop ? 'px-10' : ''}
        items={[
          { label: 'Tipo', value: typeLabel },
          { label: 'Local', value: tidyText(event.location) },
          { label: 'Vão', value: String(going.length), accent: going.length > 0 },
        ]}
      />

      <div className={desktop ? 'desk-detail-grid pt-4' : 'detail-body'}>
      <div className="desk-detail-col min-w-0">
        <section className="pt-6 pb-2">
          <SectionTitle title="Informação" />
          <dl className="rule-list m-0">
            <FactRow label="Tipo" title={<span className="inline-flex items-center gap-2"><KindMark kind={kind} />{EVENT_TYPE_LABELS[event.type].label}</span>} />
            <FactRow
              label="Quando"
              title={<span className="first-letter:uppercase inline-block">{formatLongDate(event.date)}</span>}
              detail={`Às ${event.time}`}
            />
            <FactRow label="Local" title={tidyText(event.location)} />
            {event.workout_plan && <FactRow label="Plano" title="Plano de treino" detail={<span className="whitespace-pre-line">{tidyText(event.workout_plan)}</span>} />}
            {event.requires_official_kit && <FactRow label="Equipamento" title="Levar o equipamento oficial" />}
          </dl>
        </section>

        {(event.description || event.created_by_name) && (
          <section className="py-6">
            <SectionTitle title="Sobre" />
            <div className="rule-top pt-3 space-y-3">
              {event.description && <p className="t-body text-[var(--text-1)] whitespace-pre-line">{tidyText(event.description)}</p>}
              <p className="t-small text-[var(--text-2)]">Marcado por {event.created_by_name}</p>
            </div>
          </section>
        )}
      </div>

      <div className={`desk-detail-col min-w-0${desktop ? '' : ' detail-side'}`}>
        <section className="py-6">
          <SectionTitle title="Quem vai" count={going.length} />
          {going.length === 0 ? (
            <p className="rule-top pt-3 t-body text-[var(--text-2)]">Ainda ninguém confirmou. Sê o primeiro.</p>
          ) : (
            <div className="rule-list">
              {going.map((a) => (
                <div key={a.athlete_id} className="flex items-center gap-3 min-h-12 py-2">
                  <PersonAvatar id={a.athlete_id} name={a.athlete_name} size={36} />
                  <span className="t-body t-strong text-[var(--text-1)] truncate">{a.athlete_name}</span>
                </div>
              ))}
            </div>
          )}
          {maybe.length > 0 && <p className="t-small text-[var(--text-2)] pt-3">Talvez: {maybe.map((a) => a.athlete_name).join(', ')}</p>}
        </section>

        {isAdminView && (
          <section className="py-6 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => openCreateEvent(event.type, event)}>
              <Pencil className="w-4 h-4" aria-hidden="true" /> Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={() => {
                if (window.confirm(`Remover "${title}"?`)) {
                  deleteEvent(event.id)
                  onBack()
                }
              }}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Remover
            </Button>
          </section>
        )}
      </div>
      </div>

      {/* Barra fixa: presença na zona do polegar. No computador: resumo à esquerda e botões com largura limitada à direita */}
      <div
        className="fixed-bar fixed-bar-pad pt-3 border-t-[3px] border-[var(--rule-strong)] lg:flex lg:items-center lg:justify-between lg:gap-6"
        style={{ background: 'var(--bg-nav)', paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="hidden lg:block min-w-0 flex-1">
          <div className="t-body t-strong text-[var(--text-1)] truncate first-letter:uppercase">{formatLongDate(event.date)}</div>
          <div className="t-small text-[var(--text-2)] truncate">
            Às {event.time} · {going.length} {going.length === 1 ? 'confirmado' : 'confirmados'}
          </div>
        </div>
        {past ? (
          <p className="t-body t-strong text-[var(--text-1)] text-center min-h-11 flex items-center justify-center">
            Este {event.type === 'training' ? 'treino' : 'evento'} já se realizou.
          </p>
        ) : (
          <div className="lg:w-[360px] lg:shrink-0">
            <RsvpButtons event={event} />
          </div>
        )}
      </div>
    </div>
    </>
  )
}
