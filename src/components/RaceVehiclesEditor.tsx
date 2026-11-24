import React from 'react'
import { Bus, Plus, Trash2, UserCheck } from 'lucide-react'
import type { AthleteProfile, RaceVehicle } from '../types'
import { Button, Field, Toggle, inputClass } from './ui'

export const createEmptyVehicle = (index: number): RaceVehicle => ({
  id: `veh-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
  name: `Carrinha ${index + 1}`,
  seats: 8,
  driver_name: '',
})

export function normalizeRaceVehiclesInput(vehicles: RaceVehicle[]): RaceVehicle[] {
  return vehicles
    .map((v, idx) => ({
      id: v.id || `veh-${idx + 1}`,
      name: v.name.trim() || `Veículo ${idx + 1}`,
      seats: Math.max(1, Math.min(60, Number(v.seats) || 1)),
      driver_athlete_id: v.driver_athlete_id || undefined,
      driver_name: v.driver_name?.trim() || undefined,
    }))
}

interface Props {
  vanAvailable: boolean
  onVanAvailableChange: (v: boolean) => void
  departureTime: string
  onDepartureTimeChange: (v: string) => void
  departureLocation: string
  onDepartureLocationChange: (v: string) => void
  vehicles: RaceVehicle[]
  onVehiclesChange: (next: RaceVehicle[]) => void
  profiles: AthleteProfile[]
}

/** Editor reutilizável para definir se uma prova tem carrinha e configurar vários veículos, lugares e condutores. */
export const RaceVehiclesEditor: React.FC<Props> = ({
  vanAvailable,
  onVanAvailableChange,
  departureTime,
  onDepartureTimeChange,
  departureLocation,
  onDepartureLocationChange,
  vehicles,
  onVehiclesChange,
  profiles,
}) => {
  const adults = [...profiles].sort((a, b) => a.name.localeCompare(b.name))
  const totalSeats = vehicles.reduce((acc, v) => acc + Math.max(0, Number(v.seats) || 0), 0)

  const handleToggle = (enabled: boolean) => {
    onVanAvailableChange(enabled)
    if (enabled && vehicles.length === 0) {
      onVehiclesChange([createEmptyVehicle(0)])
    }
  }

  const updateVehicle = (idx: number, patch: Partial<RaceVehicle>) => {
    onVehiclesChange(vehicles.map((v, i) => (i === idx ? { ...v, ...patch } : v)))
  }

  const removeVehicle = (idx: number) => {
    const next = vehicles.filter((_, i) => i !== idx)
    onVehiclesChange(next)
    if (next.length === 0) onVanAvailableChange(false)
  }

  return (
    <div className=" border border-[var(--border-card)] p-3.5 space-y-3.5">
      <Toggle
        checked={vanAvailable}
        onChange={handleToggle}
        label="Carrinha / veículos do clube nesta prova"
        hint="Define aqui se a prova tem carrinha, quantos veículos vão, os lugares e os condutores."
      />

      {vanAvailable && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Hora de saída">
              <input
                type="time"
                className={inputClass}
                value={departureTime}
                onChange={(e) => onDepartureTimeChange(e.target.value)}
              />
            </Field>
            <Field label="Local de saída">
              <input
                className={inputClass}
                value={departureLocation}
                onChange={(e) => onDepartureLocationChange(e.target.value)}
                placeholder="Sociedade U.R. Charneca"
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="t-small t-strong text-[var(--text-1)] flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-[var(--run)]" aria-hidden="true" />
              Veículos ({vehicles.length}) · {totalSeats} {totalSeats === 1 ? 'lugar' : 'lugares'}
            </div>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => onVehiclesChange([...vehicles, createEmptyVehicle(vehicles.length)])}
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Adicionar veículo
            </Button>
          </div>

          <div className="space-y-2.5">
            {vehicles.map((veh, idx) => {
              const selectValue = veh.driver_athlete_id
                ? veh.driver_athlete_id
                : veh.driver_name !== undefined && veh.driver_name !== ''
                ? '__custom__'
                : veh.driver_athlete_id === ''
                ? '__custom__'
                : ''

              return (
                <div
                  key={veh.id}
                  className=" bg-[var(--surface-raised)] border border-[var(--border-card)] p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="t-small t-strong text-[var(--text-2)]">Veículo {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeVehicle(idx)}
                      className="inline-flex items-center gap-1 text-xs text-[var(--danger)] hover:underline cursor-pointer"
                      aria-label={`Remover ${veh.name || `Veículo ${idx + 1}`}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Remover
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Identificação *" className="col-span-2">
                      <input
                        className={inputClass}
                        required
                        value={veh.name}
                        onChange={(e) => updateVehicle(idx, { name: e.target.value })}
                        placeholder={`Ex: Carrinha ${idx + 1}`}
                      />
                    </Field>
                    <Field label="Lugares *">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        required
                        className={inputClass}
                        value={veh.seats}
                        onChange={(e) => updateVehicle(idx, { seats: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </Field>
                  </div>

                  <Field label="Condutor">
                    <div className="space-y-2">
                      <div className="relative">
                        <UserCheck
                          className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <select
                          className={`${inputClass} pl-9`}
                          value={selectValue}
                          onChange={(e) => {
                            const val = e.target.value
                            if (!val) {
                              updateVehicle(idx, { driver_athlete_id: undefined, driver_name: undefined })
                            } else if (val === '__custom__') {
                              updateVehicle(idx, { driver_athlete_id: '', driver_name: veh.driver_name || '' })
                            } else {
                              const picked = adults.find((a) => a.id === val)
                              updateVehicle(idx, {
                                driver_athlete_id: val,
                                driver_name: picked?.name || '',
                              })
                            }
                          }}
                        >
                          <option value="">Condutor a definir…</option>
                          {adults.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                          <option value="__custom__">Outro condutor (escrever nome)</option>
                        </select>
                      </div>
                      {selectValue === '__custom__' && (
                        <input
                          className={inputClass}
                          value={veh.driver_name || ''}
                          onChange={(e) => updateVehicle(idx, { driver_athlete_id: '', driver_name: e.target.value })}
                          placeholder="Nome do condutor"
                        />
                      )}
                    </div>
                  </Field>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
