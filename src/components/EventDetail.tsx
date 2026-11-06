import React from 'react'
import { ArrowLeft, CalendarDays, ClipboardList, MapPin, Pencil, Share, Shirt, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { TeamEvent } from '../types'
import { EVENT_TYPE_LABELS } from '../types'
import { formatLongDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateEvent } from '../utils/appEvents'
import { ActivityCover } from './ActivityCover'
import { RsvpButtons, countdownLabel } from './ActivityItems'
import { FactRow, shareLink } from './RaceDetail'
import { Avatar, Button, IconButton, KindBadge, SectionTitle, Tag, kindOfEvent } from './ui'

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
    <div className="pb-28 w-full max-w-[480px] mx-auto">
      <ActivityCover kind={kind} seed={event.id} imageUrl={event.image_url} alt="" className="w-full aspect-[4/3]">
        <div className="absolute top-3 inset-x-4 flex items-center justify-between">
          <IconButton label="Voltar" floating onClick={onBack}>
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </IconButton>
          <IconButton label="Partilhar" floating onClick={() => shareLink(event.title, `evento/${event.id}`, showToast)}>
            <Share className="w-5 h-5" aria-hidden="true" />
          </IconButton>
        </div>
      </ActivityCover>

      <div className="px-5 divide-soft">
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

        <section className="py-6 space-y-3">
          <SectionTitle title="Quem vai" count={going.length} />
          {going.length === 0 ? (
            <p className="t-body text-[var(--text-3)]">Ainda ninguém confirmou. Sê o primeiro.</p>
          ) : (
            <div className="divide-soft">
              {going.map((a) => (
                <div key={a.athlete_id} className="flex items-center gap-4 py-2.5">
                  <Avatar name={a.athlete_name} />
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

      {/* Barra fixa: presença na zona do polegar */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-5 pt-3 border-t border-[var(--border-card)]"
        style={{ background: 'var(--bg-nav)', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
      >
        {past ? (
          <p className="t-body text-[var(--text-3)] text-center min-h-11 flex items-center justify-center">
            Este {event.type === 'training' ? 'treino' : 'evento'} já se realizou.
          </p>
        ) : (
          <RsvpButtons event={event} />
        )}
      </div>
    </div>
  )
}
