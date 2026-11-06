import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Sheet } from './Sheet'
import { Button, Field, SheetHeader, Toggle, inputClass } from './ui'
import type { NotificationType } from '../types'
import { todayISO } from '../utils/dates'

const TYPES: Array<{ value: NotificationType; label: string }> = [
  { value: 'general', label: 'Geral' },
  { value: 'race_open', label: 'Inscrições' },
  { value: 'deadline', label: 'Prazo' },
  { value: 'transport', label: 'Carrinha / transporte' },
  { value: 'bibs_ready', label: 'Dorsais' },
]

/** Formulário (bottom-sheet) para publicar um comunicado à equipa (admin). Requer AppProvider. */
export const CreateNoticeModal: React.FC<{ relatedRaceId?: string; onClose: () => void }> = ({ relatedRaceId, onClose }) => {
  const { races, sendNotification } = useApp()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NotificationType>('general')
  const [raceId, setRaceId] = useState(relatedRaceId || '')
  const [pinned, setPinned] = useState(false)

  const today = todayISO()
  const upcoming = races.filter((r) => r.date >= today)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    sendNotification({
      title: title.trim(),
      message: message.trim(),
      type,
      related_race_id: raceId || undefined,
      pinned,
    })
    onClose()
  }

  return (
    <Sheet onClose={onClose} ariaLabel="Novo comunicado">
      <SheetHeader title="Novo comunicado" subtitle="Visível para toda a equipa na página inicial e em Comunicados." onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <Field label="Título *">
          <input className={inputClass} required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Mensagem *">
          <textarea rows={5} className={inputClass} required value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as NotificationType)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prova relacionada">
            <select className={inputClass} value={raceId} onChange={(e) => setRaceId(e.target.value)}>
              <option value="">Nenhuma</option>
              {upcoming.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Toggle checked={pinned} onChange={setPinned} label="Fixar no topo" />
        <Button type="submit" block>
          Publicar
        </Button>
      </form>
    </Sheet>
  )
}
