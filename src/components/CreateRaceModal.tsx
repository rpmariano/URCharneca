import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Sheet } from './Sheet'
import { Button, Field, SheetHeader, Toggle, inputClass, Segmented } from './ui'
import type { Race, RaceCategory } from '../types'
import { CATEGORIA_LABELS } from '../types'
import { addDaysISO } from '../utils/formatters'
import { todayISO } from '../utils/dates'

interface Props {
  /** Se definido, o formulário edita esta prova */
  race?: Race
  onClose: () => void
}

const splitList = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

/** Formulário (bottom-sheet) para criar/editar uma prova; atletas só sugerem provas. Requer AppProvider. */
export const CreateRaceModal: React.FC<Props> = ({ race, onClose }) => {
  const { isAdminView, currentUser, createRace, updateRace, registerForRace } = useApp()
  const editing = Boolean(race)

  const [category, setCategory] = useState<RaceCategory>(race?.category || (isAdminView ? 'equipa' : 'individual'))
  const [title, setTitle] = useState(race?.title || '')
  const [date, setDate] = useState(race?.date || addDaysISO(todayISO(), 14))
  const [startTime, setStartTime] = useState(race?.start_time || '09:30')
  const [location, setLocation] = useState(race?.location || '')
  const [distances, setDistances] = useState(race?.distances.join(', ') || '10 km')
  const [deadline, setDeadline] = useState(race?.registration_deadline || '')
  const [externalUrl, setExternalUrl] = useState(race?.external_url || '')
  const [description, setDescription] = useState(race?.description || '')
  const [meetingPoint, setMeetingPoint] = useState(race?.meeting_point || '')
  const [meetingTime, setMeetingTime] = useState(race?.meeting_time || '')
  const [vanAvailable, setVanAvailable] = useState(race ? race.van_available : category !== 'individual')
  const [vanCapacity, setVanCapacity] = useState(race?.van_capacity || 9)
  const [vanDeparture, setVanDeparture] = useState(race?.van_departure_time || '07:30')
  const [vanLocation, setVanLocation] = useState(race?.van_departure_location || 'Sociedade U.R. Charneca')
  const [openToChildren, setOpenToChildren] = useState(race?.open_to_children || false)
  const [childDistances, setChildDistances] = useState(race?.children_distances?.join(', ') || '')
  const [bibInfo, setBibInfo] = useState(race?.bib_pickup_info || '')
  const [stage, setStage] = useState(race?.trophy_stage_number ? String(race.trophy_stage_number) : '')
  const [alsoRegister, setAlsoRegister] = useState(!editing && !isAdminView)

  const showVan = isAdminView && category !== 'individual'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !location.trim()) return
    const distList = splitList(distances)
    const payload = {
      title: title.trim(),
      category,
      date,
      start_time: startTime,
      location: location.trim(),
      distances: distList.length ? distList : ['10 km'],
      registration_deadline: deadline || undefined,
      external_url: externalUrl.trim() || undefined,
      description: description.trim() || undefined,
      meeting_point: meetingPoint.trim() || undefined,
      meeting_time: meetingTime || undefined,
      van_available: showVan && vanAvailable,
      van_capacity: showVan && vanAvailable ? Math.max(1, vanCapacity) : 0,
      van_departure_time: showVan && vanAvailable ? vanDeparture : undefined,
      van_departure_location: showVan && vanAvailable ? vanLocation.trim() : undefined,
      bib_pickup_info: bibInfo.trim() || undefined,
      counts_for_trophy: category === 'trofeu_cascais',
      trophy_stage_number: category === 'trofeu_cascais' && stage ? Number(stage) : undefined,
      open_to_children: openToChildren,
      children_distances: openToChildren ? splitList(childDistances) : undefined,
    }

    if (race) {
      updateRace({ ...race, ...payload })
    } else {
      const created = createRace(payload)
      if (alsoRegister) {
        registerForRace({
          race_id: created.id,
          athlete_id: currentUser.id,
          athlete_name: currentUser.name,
          is_dependent: false,
          escalao: currentUser.escalao,
          distance: created.distances[0],
          transport_mode: 'own_transport',
        })
      }
    }
    onClose()
  }

  const heading = editing ? 'Editar prova' : isAdminView ? 'Nova prova' : 'Sugerir prova'

  return (
    <Sheet onClose={onClose} ariaLabel={heading}>
      <SheetHeader
        title={heading}
        subtitle={isAdminView ? undefined : 'Partilha uma prova em que vais participar. Cada atleta faz a sua inscrição.'}
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {isAdminView && (
          <Field label="Tipo de prova">
            <Segmented<RaceCategory>
              value={category}
              onChange={(c) => {
                setCategory(c)
                setVanAvailable(c !== 'individual')
              }}
              options={[
                { value: 'trofeu_cascais', label: 'Troféu' },
                { value: 'equipa', label: 'Clube' },
                { value: 'individual', label: 'Sugerida' },
              ]}
            />
            <span className="block text-xs text-[var(--text-3)] mt-1.5">{CATEGORIA_LABELS[category].desc}</span>
          </Field>
        )}

        <Field label="Nome da prova *">
          <input className={inputClass} required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Corrida do Tejo" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data *">
            <input type="date" className={inputClass} required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora de partida">
            <input type="time" className={inputClass} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
        </div>

        <Field label="Local *">
          <input className={inputClass} required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Oeiras" />
        </Field>

        <Field label="Distâncias" hint="Separadas por vírgulas">
          <input className={inputClass} value={distances} onChange={(e) => setDistances(e.target.value)} />
        </Field>

        {category === 'trofeu_cascais' && (
          <Field label="Nº da etapa do Troféu">
            <input type="number" min={1} className={inputClass} value={stage} onChange={(e) => setStage(e.target.value)} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Prazo de inscrição">
            <input type="date" className={inputClass} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
          <Field label="Link oficial">
            <input type="url" className={inputClass} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://" />
          </Field>
        </div>

        <Field label="Descrição">
          <textarea rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ponto de encontro">
            <input className={inputClass} value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} />
          </Field>
          <Field label="Hora de encontro">
            <input type="time" className={inputClass} value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-2xl border border-[var(--border-card)] p-3.5 space-y-3">
          <Toggle
            checked={openToChildren}
            onChange={setOpenToChildren}
            label="Aberta a crianças"
            hint="Permite inscrever perfis infantis nesta prova (e na carrinha, se existir)."
          />
          {openToChildren && (
            <Field label="Distâncias / escalões jovens" hint="Vazio = mesmas distâncias da prova">
              <input
                className={inputClass}
                value={childDistances}
                onChange={(e) => setChildDistances(e.target.value)}
                placeholder="Ex: Benjamins 1 km, Infantis 2 km"
              />
            </Field>
          )}
        </div>

        {showVan && (
          <div className="rounded-2xl border border-[var(--border-card)] p-3.5 space-y-3">
            <Toggle checked={vanAvailable} onChange={setVanAvailable} label="Carrinha do clube" hint="Os atletas podem reservar lugar." />
            {vanAvailable && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Lugares">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className={inputClass}
                    value={vanCapacity}
                    onChange={(e) => setVanCapacity(Number(e.target.value))}
                  />
                </Field>
                <Field label="Saída">
                  <input type="time" className={inputClass} value={vanDeparture} onChange={(e) => setVanDeparture(e.target.value)} />
                </Field>
                <Field label="De">
                  <input className={inputClass} value={vanLocation} onChange={(e) => setVanLocation(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        )}

        {isAdminView && category !== 'individual' && (
          <Field label="Levantamento de dorsais">
            <input className={inputClass} value={bibInfo} onChange={(e) => setBibInfo(e.target.value)} />
          </Field>
        )}

        {!editing && (
          <Toggle checked={alsoRegister} onChange={setAlsoRegister} label="Também vou participar" hint="Fico já inscrito(a) nesta prova." />
        )}

        <Button type="submit" block>
          {editing ? 'Guardar alterações' : isAdminView ? 'Publicar prova' : 'Sugerir à equipa'}
        </Button>
      </form>
    </Sheet>
  )
}
