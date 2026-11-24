import React from 'react'
import { CalendarDays, ClipboardList, MapPin, Pencil, Shirt, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { TeamEvent } from '../types'
import { EVENT_TYPE_LABELS } from '../types'
import { formatLongDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateEvent } from '../utils/appEvents'
import { ActivityCover } from './ActivityCover'
import { DetailBar } from './AppHeader'
import { RsvpButtons, countdownLabel } from './ActivityItems'
import { FactRow, shareLink } from './RaceDetail'
import { PersonAvatar } from './PersonAvatar'
import { Button, KindBadge, SectionTitle, Tag, kindOfEvent } from './ui'

/**
 * Detalhe de um treino/evento/reunião em página inteira: capa, data, local, plano de treino,
 * confirmados e barra fixa com os botões de presença. Requer AppProvider.
 */
export const EventDetail: React.FC<{ event: TeamEvent; onBack: () => void }> = ({ event, onBack }) => {
  const { isAdminView, deleteEvent, showToast } = useApp()
  const kind = kindOfEvent(event)
  const going = event.attendees.filter((a) => a.status === 'going')
  const maybe = event.attendees.filter((a) => a.status === 'maybe')
  const past = event.date < todayISO()
  const countdown = countdownLabel(event.date)

  return (
    // 1 coluna em mobile; a partir de 768 px: info à esquerda, quem vai e ações à direita (layout/responsive.css)
    <div className="detail">
      <DetailBar title={event.title} onBack={onBack} onShare={() => shareLink(event.title, `evento/${event.id}`, showToast)} />
      <ActivityCover kind={kind} seed={event.id} imageUrl={event.image_url} alt="" className="detail-cover" />

      <div className="detail-body detail-grid">
      <div className="divide-soft min-w-0">
        <header className="py-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <KindBadge kind={kind} label={EVENT_TYPE_LABELS[event.type].short} />
            {past && <Tag>Realizado</Tag>}
          </div>
          <h1 className="t-title text-[var(--text-1)]">{event.title}</h1>
          <p className="t-body text-[var(--text-3)]">
            {event.location}
            {countdown && <span className="text-[var(--text-1)] t-strong"> · {countdown}</span>}
          </p>
        </header>

        <section className="py-3" aria-label="Informação">
          <FactRow
            icon={CalendarDays}
            title={<span className="first-letter:uppercase inline-block">{formatLongDate(event.date)}</span>}
            detail={`Às ${event.time}`}
          />
          <FactRow icon={MapPin} title={event.location} />
          {event.workout_plan && <FactRow icon={ClipboardList} title="Plano de treino" detail={event.workout_plan} />}
          {event.requires_official_kit && <FactRow icon={Shirt} title="Levar o equipamento oficial" />}
        </section>

        {(event.description || event.created_by_name) && (
          <section className="py-6 space-y-3">
            <h2 className="t-heading text-[var(--text-1)]">Sobre</h2>
            {event.description && <p className="t-body text-[var(--text-2)] whitespace-pre-line">{event.description}</p>}
            <p className="t-small text-[var(--text-3)]">Marcado por {event.created_by_name}</p>
          </section>
        )}
      </div>

      <div className="divide-soft min-w-0 detail-side">
        <section className="py-6 space-y-3">
          <SectionTitle title="Quem vai" count={going.length} />
          {going.length === 0 ? (
            <p className="t-body text-[var(--text-3)]">Ainda ninguém confirmou. Sê o primeiro.</p>
          ) : (
            <div className="divide-soft">
              {going.map((a) => (
                <div key={a.athlete_id} className="flex items-center gap-4 py-2.5">
                  <PersonAvatar id={a.athlete_id} name={a.athlete_name} />
                  <span className="t-body text-[var(--text-1)] truncate">{a.athlete_name}</span>
                </div>
              ))}
            </div>
          )}
          {maybe.length > 0 && <p className="t-small text-[var(--text-3)]">Talvez: {maybe.map((a) => a.athlete_name).join(', ')}</p>}
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
                if (window.confirm(`Remover "${event.title}"?`)) {
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

      {/* Barra fixa: presença na zona do polegar. Em >= 640 px: resumo à esquerda e botões com largura limitada à direita */}
      <div
        className="fixed-bar fixed-bar-pad pt-3 border-t border-[var(--border-card)] sm:flex sm:items-center sm:justify-between sm:gap-6"
        style={{ background: 'var(--bg-nav)', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="hidden sm:block min-w-0 flex-1">
          <div className="t-body t-strong text-[var(--text-1)] truncate first-letter:uppercase">{formatLongDate(event.date)}</div>
          <div className="t-small text-[var(--text-3)] truncate">
            Às {event.time} · {going.length} {going.length === 1 ? 'confirmado' : 'confirmados'}
          </div>
        </div>
        {past ? (
          <p className="t-body text-[var(--text-3)] text-center min-h-11 flex items-center justify-center">
            Este {event.type === 'training' ? 'treino' : 'evento'} já se realizou.
          </p>
        ) : (
          <div className="sm:w-[360px] sm:shrink-0">
            <RsvpButtons event={event} />
          </div>
        )}
      </div>
    </div>
  )
}
