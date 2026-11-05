import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Sheet } from './Sheet'
import type { RaceCategory } from '../types'

interface Props {
  defaultCategory?: RaceCategory
  onClose: () => void
}

export const CreateRaceModal: React.FC<Props> = ({ defaultCategory, onClose }) => {
  const { isAdminView, currentUser, createRace, registerForRace } = useApp()

  const [category, setCategory] = useState<RaceCategory>(
    defaultCategory || (isAdminView ? 'equipa' : 'individual')
  )
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('2026-11-29')
  const [startTime, setStartTime] = useState('09:30')
  const [location, setLocation] = useState('')
  const [distancesInput, setDistancesInput] = useState('10 km, 5 km')
  const [externalUrl, setExternalUrl] = useState('')
  const [vanAvailable, setVanAvailable] = useState(category !== 'individual')
  const [vanDepartureTime, setVanDepartureTime] = useState('07:30')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !location.trim()) return

    const distances = distancesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const created = createRace({
      title: title.trim(),
      category,
      date,
      start_time: startTime,
      location: location.trim(),
      distances: distances.length > 0 ? distances : ['10 km'],
      external_url: externalUrl.trim() || undefined,
      van_available: vanAvailable,
      van_capacity: vanAvailable ? 9 : 0,
      van_departure_time: vanAvailable ? vanDepartureTime : undefined,
      van_departure_location: 'Sociedade U.R. Charneca',
      counts_for_trophy: category === 'trofeu_cascais',
    })

    // Inscrever o próprio
    registerForRace({
      race_id: created.id,
      athlete_id: currentUser.id,
      athlete_name: currentUser.name,
      is_dependent: false,
      escalao: currentUser.escalao,
      distance: created.distances[0],
      transport_mode: created.van_available ? 'van_roundtrip' : 'meeting_point',
    })

    onClose()
  }

  return (
    <Sheet onClose={onClose} ariaLabel="Adicionar prova">
        <div className="px-5 pt-2 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="font-display font-bold text-base text-slate-900">
            {isAdminView ? 'Adicionar Prova' : 'Partilhar Prova'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-full text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
          {isAdminView && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tipo de Prova</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCategory('trofeu_cascais')
                    setVanAvailable(true)
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-center font-semibold transition cursor-pointer ${
                    category === 'trofeu_cascais'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  🏆 Troféu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('equipa')
                    setVanAvailable(true)
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-center font-semibold transition cursor-pointer ${
                    category === 'equipa'
                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  🚐 Equipa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('individual')
                    setVanAvailable(false)
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-center font-semibold transition cursor-pointer ${
                    category === 'individual'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  👟 Individual
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="create-race-title" className="block font-medium text-slate-700 mb-1">
              Nome da Prova *
            </label>
            <input
              id="create-race-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Corrida 10 km Marginal"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="create-race-date" className="block font-medium text-slate-700 mb-1">
                Data *
              </label>
              <input
                id="create-race-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="create-race-time" className="block font-medium text-slate-700 mb-1">
                Hora da Partida *
              </label>
              <input
                id="create-race-time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="create-race-location" className="block font-medium text-slate-700 mb-1">
              Local / Percurso *
            </label>
            <input
              id="create-race-location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Cascais / Oeiras"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="create-race-distances" className="block font-medium text-slate-700 mb-1">
              Distâncias (separadas por vírgula)
            </label>
            <input
              id="create-race-distances"
              type="text"
              value={distancesInput}
              onChange={(e) => setDistancesInput(e.target.value)}
              placeholder="Ex: 10 km, 21 km"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="create-race-url" className="block font-medium text-slate-700 mb-1">
              Link Oficial (opcional)
            </label>
            <input
              id="create-race-url"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
            />
          </div>

          {category !== 'individual' && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
              <label htmlFor="create-race-van-checkbox" className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-800">
                  🚐 Incluir Carrinha da Charneca
                </span>
                <input
                  id="create-race-van-checkbox"
                  type="checkbox"
                  checked={vanAvailable}
                  onChange={(e) => setVanAvailable(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              {vanAvailable && (
                <div>
                  <label htmlFor="create-race-van-time" className="block text-[11px] text-slate-500 mb-0.5">
                    Hora de Saída
                  </label>
                  <input
                    id="create-race-van-time"
                    type="time"
                    value={vanDepartureTime}
                    onChange={(e) => setVanDepartureTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              Publicar Prova
            </button>
          </div>
        </form>
    </Sheet>
  )
}
