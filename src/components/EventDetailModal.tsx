import React from 'react'
import { CalendarDays, Check, HelpCircle, MapPin, Pencil, Shirt, Trash2, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { TeamEvent } from '../types'
import { EVENT_TYPE_LABELS } from '../types'
import { formatLongDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateEvent } from '../utils/appEvents'
import { Sheet } from './Sheet'
import { Avatar, Button, KindBadge, SectionTitle, SheetHeader, Tag, kindOfEvent } from './ui'

/** Três botões de presença (Vou / Talvez / Não) para um treino ou evento. Requer AppProvider. */
export const RsvpButtons: React.FC<{ event: TeamEvent; compact?: boolean }> = ({ event, compact }) => {
  const { currentUser, rsvpEvent } = useApp()
  const mine = event.attendees.find((a) => a.athlete_id === currentUser.id)?.status
  const past = event.date < todayISO()
  const opts = [
    { value: 'going' as const, label: 'Vou', icon: Check },
    { value: 'maybe' as const, label: 'Talvez', icon: HelpCircle },
    { value: 'not_going' as const, label: 'Não', icon: X },
  ]
  return (
    <div className={`grid grid-cols-3 gap-1.5 ${compact ? '' : 'pt-1'}`}>
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={past}
          aria-pressed={mine === o.value}
          onClick={(e) => {
            e.stopPropagation()
            rsvpEvent(event.id, o.value)
          }}
          className={`py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            mine === o.value
              ? o.value === 'going'
                ? 'bg-[var(--run)] text-[var(--on-accent)] border-transparent'
                : 'bg-[var(--text-1)] text-[var(--bg-app)] border-transparent'
              : 'bg-[var(--surface-raised)] text-[var(--text-2)] border-[var(--border-card)]'
          }`}
        >
          <o.icon className="w-3.5 h-3.5" />
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Bottom-sheet com o detalhe de um treino/evento: data, local, plano, presença e confirmados. Requer AppProvider. */
export const EventDetailModal: React.FC<{ event: TeamEvent; onClose: () => void }> = ({ event, onClose }) => {
  const { isAdminView, deleteEvent } = useApp()
  const going = event.attendees.filter((a) => a.status === 'going')
  const maybe = event.attendees.filter((a) => a.status === 'maybe')

  return (
    <Sheet onClose={onClose} ariaLabel={event.title}>
      <SheetHeader title={event.title} onClose={onClose}>
        <div className="flex items-center gap-1.5 mb-1">
          <KindBadge kind={kindOfEvent(event)} label={EVENT_TYPE_LABELS[event.type].short} />
          {event.requires_official_kit && (
            <Tag tone="warn">
              <Shirt className="w-3 h-3" /> Equipamento
            </Tag>
          )}
        </div>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <section className="space-y-2 text-sm text-[var(--text-2)]">
          <p className="flex items-center gap-2 capitalize">
            <CalendarDays className="w-4 h-4 text-[var(--run)]" />
            {formatLongDate(event.date)} <span className="normal-case text-[var(--text-3)]">· {event.time}</span>
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[var(--run)] mt-0.5 shrink-0" />
            {event.location}
          </p>
          {event.workout_plan && (
            <p className="text-xs rounded-xl bg-[var(--surface-raised)] border border-[var(--border-card)] px-3 py-2">
              <strong className="text-[var(--text-1)]">Plano:</strong> {event.workout_plan}
            </p>
          )}
          {event.description && <p className="text-xs text-[var(--text-3)] leading-relaxed">{event.description}</p>}
          <p className="text-[11px] text-[var(--text-muted)]">Marcado por {event.created_by_name}</p>
        </section>

        <section className="space-y-2">
          <SectionTitle title="A tua presença" />
          <RsvpButtons event={event} />
        </section>

        <section className="space-y-2">
          <SectionTitle title="Confirmados" count={going.length} />
          {going.length === 0 ? (
            <p className="text-xs text-[var(--text-3)]">Ainda ninguém confirmou.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {going.map((a) => (
                <span key={a.athlete_id} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-2)]">
                  <Avatar name={a.athlete_name} size={22} /> {a.athlete_name}
                </span>
              ))}
            </div>
          )}
          {maybe.length > 0 && <p className="text-xs text-[var(--text-3)]">Talvez: {maybe.map((a) => a.athlete_name).join(', ')}</p>}
        </section>

        {isAdminView && (
          <div className="flex gap-2 pt-2 border-t border-[var(--border-card)]">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => {
                onClose()
                openCreateEvent(event.type, event)
              }}
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={() => {
                if (window.confirm(`Remover "${event.title}"?`)) {
                  deleteEvent(event.id)
                  onClose()
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
