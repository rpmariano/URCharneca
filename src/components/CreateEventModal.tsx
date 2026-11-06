import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Sheet } from './Sheet'
import { Button, Field, Segmented, SheetHeader, Toggle, inputClass } from './ui'
import type { TeamEvent, TeamEventType } from '../types'
import { addDaysISO } from '../utils/formatters'
import { todayISO } from '../utils/dates'

interface Props {
  event?: TeamEvent
  defaultType?: TeamEventType
  onClose: () => void
}

/** Formulário (bottom-sheet) para criar/editar treino, evento ou reunião (admin). Requer AppProvider. */
export const CreateEventModal: React.FC<Props> = ({ event, defaultType = 'training', onClose }) => {
  const { createEvent, updateEvent, sendNotification } = useApp()
  const editing = Boolean(event)

  const [type, setType] = useState<TeamEventType>(event?.type || defaultType)
  const [title, setTitle] = useState(event?.title || '')
  const [date, setDate] = useState(event?.date || addDaysISO(todayISO(), 1))
  const [time, setTime] = useState(event?.time || (defaultType === 'training' ? '18:00' : '20:00'))
  const [location, setLocation] = useState(event?.location || (defaultType === 'training' ? 'Quinta da Marinha, Cascais' : 'Sociedade U.R. Charneca'))
  const [workoutPlan, setWorkoutPlan] = useState(event?.workout_plan || '')
  const [description, setDescription] = useState(event?.description || '')
  const [requiresKit, setRequiresKit] = useState(event?.requires_official_kit || false)
  const [imageUrl, setImageUrl] = useState(event?.image_url || '')
  const [notify, setNotify] = useState(!editing && type !== 'training')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !location.trim()) return
    const payload = {
      title: title.trim(),
      type,
      date,
      time,
      location: location.trim(),
      description: description.trim(),
      workout_plan: type === 'training' ? workoutPlan.trim() || undefined : undefined,
      requires_official_kit: requiresKit,
      image_url: imageUrl.trim() || undefined,
    }
    if (event) {
      updateEvent({ ...event, ...payload })
    } else {
      const created = createEvent(payload)
      if (created && notify) {
        sendNotification({
          title: `${type === 'training' ? 'Novo treino' : type === 'meeting' ? 'Reunião' : 'Evento'}: ${created.title}`,
          message: `${created.date} às ${created.time} — ${created.location}. ${created.description}`.trim(),
          type: 'general',
        })
      }
    }
    onClose()
  }

  const heading = editing ? 'Editar' : type === 'training' ? 'Novo treino' : type === 'meeting' ? 'Nova reunião' : 'Novo evento'

  return (
    <Sheet onClose={onClose} ariaLabel={heading}>
      <SheetHeader title={heading} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <Field label="Tipo">
          <Segmented<TeamEventType>
            value={type}
            onChange={setType}
            options={[
              { value: 'training', label: 'Treino' },
              { value: 'social', label: 'Evento' },
              { value: 'meeting', label: 'Reunião' },
            ]}
          />
        </Field>

        <Field label="Título *">
          <input
            className={inputClass}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'training' ? 'Ex: Séries 1000 m' : 'Ex: Jantar de Natal'}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data *">
            <input type="date" className={inputClass} required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora *">
            <input type="time" className={inputClass} required value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        <Field label="Local *">
          <input className={inputClass} required value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>

        {type === 'training' && (
          <Field label="Plano de treino">
            <input
              className={inputClass}
              value={workoutPlan}
              onChange={(e) => setWorkoutPlan(e.target.value)}
              placeholder="Ex: Aquecimento 2 km + 5x 1000 m + retorno"
            />
          </Field>
        )}

        <Field label="Imagem de capa" hint="Opcional. Cola o link de uma imagem; sem ele usa-se a capa do tipo de atividade.">
          <input type="url" className={inputClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
        </Field>

        <Field label="Descrição">
          <textarea rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <Toggle checked={requiresKit} onChange={setRequiresKit} label="Levar equipamento oficial" />
        {!editing && <Toggle checked={notify} onChange={setNotify} label="Publicar comunicado" hint="Avisa a equipa na página de comunicados." />}

        <Button type="submit" block>
          {editing ? 'Guardar alterações' : 'Agendar'}
        </Button>
      </form>
    </Sheet>
  )
}
