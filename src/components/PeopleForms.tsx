import React, { useState } from 'react'
import type { AthleteProfile, UserRole, YouthAthlete } from '../types'
import { ESCALOES_ATLETISMO } from '../types'
import { estimateEscalao } from '../utils/formatters'
import { Button, Field, Segmented, inputClass } from './ui'

const SHIRTS: AthleteProfile['shirt_size'][] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const CHILD_SHIRTS = ['4-6 anos', '6-8 anos', '8-10 anos', '10-12 anos', '12-14 anos', 'XS', 'S']

const EscalaoSelect: React.FC<{ value: string; onChange: (v: string) => void; youth?: boolean }> = ({ value, onChange, youth }) => {
  const options = (youth ? ESCALOES_ATLETISMO.slice(0, 6) : ESCALOES_ATLETISMO.slice(6)) as readonly string[]
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {!options.includes(value) && value && <option value={value}>{value}</option>}
      {options.map((e) => (
        <option key={e} value={e}>
          {e}
        </option>
      ))}
    </select>
  )
}

export type AthleteFormValue = Omit<AthleteProfile, 'id' | 'dependents'>

export const emptyAthlete = (): AthleteFormValue => ({
  name: '',
  nickname: '',
  email: '',
  phone: '+351 ',
  role: 'athlete',
  gender: 'M',
  birth_date: '1990-01-01',
  escalao: estimateEscalao('1990-01-01', 'M'),
  nif: '',
  cc_number: '',
  shirt_size: 'M',
  has_official_kit: false,
})

/** Ficha de atleta adulto (dados pessoais, escalão automático, contacto de emergência). */
export const AthleteForm: React.FC<{
  initial: AthleteFormValue
  allowRole?: boolean
  submitLabel: string
  onSubmit: (v: AthleteFormValue) => void
  onCancel?: () => void
}> = ({ initial, allowRole, submitLabel, onSubmit, onCancel }) => {
  const [v, setV] = useState<AthleteFormValue>(initial)
  const set = <K extends keyof AthleteFormValue>(k: K, val: AthleteFormValue[K]) => setV((p) => ({ ...p, [k]: val }))

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!v.name.trim()) return
        onSubmit({ ...v, name: v.name.trim(), nickname: v.nickname.trim() || v.name.trim().split(' ')[0] })
      }}
    >
      <Field label="Nome completo *">
        <input className={inputClass} required value={v.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Alcunha">
          <input className={inputClass} value={v.nickname} onChange={(e) => set('nickname', e.target.value)} />
        </Field>
        <Field label="Género">
          <Segmented<'M' | 'F'>
            value={v.gender || 'M'}
            onChange={(g) => setV((p) => ({ ...p, gender: g, escalao: estimateEscalao(p.birth_date, g) }))}
            options={[
              { value: 'M', label: 'M' },
              { value: 'F', label: 'F' },
            ]}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data de nascimento">
          <input
            type="date"
            className={inputClass}
            value={v.birth_date}
            onChange={(e) => setV((p) => ({ ...p, birth_date: e.target.value, escalao: estimateEscalao(e.target.value, p.gender || 'M') }))}
          />
        </Field>
        <Field label="Escalão">
          <EscalaoSelect value={v.escalao} onChange={(x) => set('escalao', x)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Telemóvel">
          <input type="tel" className={inputClass} value={v.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" className={inputClass} value={v.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="NIF">
          <input className={inputClass} value={v.nif} onChange={(e) => set('nif', e.target.value)} />
        </Field>
        <Field label="Cartão de Cidadão">
          <input className={inputClass} value={v.cc_number} onChange={(e) => set('cc_number', e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="T-shirt">
          <select className={inputClass} value={v.shirt_size} onChange={(e) => set('shirt_size', e.target.value as AthleteProfile['shirt_size'])}>
            {SHIRTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Nº federado">
          <input className={inputClass} value={v.federation_number || ''} onChange={(e) => set('federation_number', e.target.value || undefined)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contacto de emergência">
          <input className={inputClass} value={v.emergency_name || ''} onChange={(e) => set('emergency_name', e.target.value || undefined)} />
        </Field>
        <Field label="Tel. emergência">
          <input type="tel" className={inputClass} value={v.emergency_phone || ''} onChange={(e) => set('emergency_phone', e.target.value || undefined)} />
        </Field>
      </div>
      <Field label="Notas médicas / alergias">
        <textarea rows={2} className={inputClass} value={v.medical_notes || ''} onChange={(e) => set('medical_notes', e.target.value || undefined)} />
      </Field>
      {allowRole && (
        <Field label="Perfil de acesso">
          <Segmented<UserRole>
            value={v.role}
            onChange={(r) => set('role', r)}
            options={[
              { value: 'athlete', label: 'Atleta' },
              { value: 'admin', label: 'Administrador' },
            ]}
          />
        </Field>
      )}
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

export type ChildFormValue = Omit<YouthAthlete, 'id' | 'associated_adult_ids'>

export const emptyChild = (): ChildFormValue => ({
  name: '',
  birth_date: '2016-01-01',
  escalao: estimateEscalao('2016-01-01'),
  nif: '',
  shirt_size: '8-10 anos',
})

/** Ficha de perfil infantil (nome, nascimento, escalão jovem, NIF, t-shirt). */
export const ChildForm: React.FC<{
  initial: ChildFormValue
  submitLabel: string
  onSubmit: (v: ChildFormValue) => void
  onCancel?: () => void
}> = ({ initial, submitLabel, onSubmit, onCancel }) => {
  const [v, setV] = useState<ChildFormValue>(initial)
  const set = <K extends keyof ChildFormValue>(k: K, val: ChildFormValue[K]) => setV((p) => ({ ...p, [k]: val }))
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!v.name.trim()) return
        onSubmit({ ...v, name: v.name.trim() })
      }}
    >
      <Field label="Nome completo *">
        <input className={inputClass} required value={v.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data de nascimento *">
          <input
            type="date"
            required
            className={inputClass}
            value={v.birth_date}
            onChange={(e) => setV((p) => ({ ...p, birth_date: e.target.value, escalao: estimateEscalao(e.target.value) }))}
          />
        </Field>
        <Field label="Escalão">
          <EscalaoSelect youth value={v.escalao} onChange={(x) => set('escalao', x)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="NIF">
          <input className={inputClass} value={v.nif} onChange={(e) => set('nif', e.target.value)} />
        </Field>
        <Field label="Cartão de Cidadão">
          <input className={inputClass} value={v.cc_number || ''} onChange={(e) => set('cc_number', e.target.value || undefined)} />
        </Field>
      </div>
      <Field label="T-shirt">
        <select className={inputClass} value={v.shirt_size || ''} onChange={(e) => set('shirt_size', e.target.value)}>
          {(v.shirt_size && !CHILD_SHIRTS.includes(v.shirt_size) ? [v.shirt_size, ...CHILD_SHIRTS] : CHILD_SHIRTS).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Notas médicas / alergias">
        <textarea rows={2} className={inputClass} value={v.medical_notes || ''} onChange={(e) => set('medical_notes', e.target.value || undefined)} />
      </Field>
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
