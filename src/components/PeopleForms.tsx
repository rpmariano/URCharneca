import React, { useState } from 'react'
import type { AthleteProfile, UserRole, YouthAthlete } from '../types'
import { ESCALOES_ATLETISMO } from '../types'
import { estimateEscalao } from '../utils/formatters'
import { Button, Field, Segmented, inputClass } from './ui'
import { PhotoField } from './PhotoField'

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

/** Campo partilhado para o dorsal da época 2026/2027 (exclusivo Troféu de Cascais) + histórico em leitura. */
const TrofeuDorsalField: React.FC<{
  dorsal?: string
  dorsais?: Record<string, string>
  placeholder?: string
  onChange: (dorsal: string | undefined, nextMap: Record<string, string> | undefined) => void
}> = ({ dorsal, dorsais, placeholder = 'Ex: 1129', onChange }) => {
  const current = dorsais?.['2026/2027'] ?? dorsal ?? ''
  const history = Object.entries(dorsais || {})
    .filter(([s]) => s !== '2026/2027')
    .sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <Field
      label="Dorsal Troféu de Cascais (Época 2026/2027)"
      hint="Exclusivo para o Troféu de Cascais. Muda todos os anos."
    >
      <input
        className={inputClass}
        value={current}
        placeholder={placeholder}
        onChange={(e) => {
          const val = e.target.value.trim()
          const nextMap = { ...(dorsais || {}) }
          if (val) nextMap['2026/2027'] = val
          else delete nextMap['2026/2027']
          onChange(val || undefined, Object.keys(nextMap).length > 0 ? nextMap : undefined)
        }}
      />
      {history.length > 0 && (
        <div className="t-small text-[var(--text-3)] mt-1">
          Épocas anteriores: {history.map(([s, num]) => `${s}: #${num}`).join(' · ')}
        </div>
      )}
    </Field>
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
  login_authorized: false,
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
  const [formErr, setFormErr] = useState('')
  const set = <K extends keyof AthleteFormValue>(k: K, val: AthleteFormValue[K]) => setV((p) => ({ ...p, [k]: val }))
  const emailRequired = Boolean(v.login_authorized || v.role === 'admin')

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        setFormErr('')
        if (!v.name.trim()) return
        const cleanEmail = v.email.trim().toLowerCase()
        if (emailRequired && (!cleanEmail || !cleanEmail.includes('@'))) {
          setFormErr('Para autorizar o login, o atleta tem de ter um email válido associado.')
          return
        }
        onSubmit({
          ...v,
          name: v.name.trim(),
          nickname: v.nickname.trim() || v.name.trim().split(' ')[0],
          email: cleanEmail,
          login_email: cleanEmail || v.login_email,
        })
      }}
    >
      <PhotoField name={v.name} value={v.photo_url} gender={v.gender} onChange={(x) => set('photo_url', x)} />
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
        <Field label={emailRequired ? 'Email associado *' : 'Email'}>
          <input
            type="email"
            required={emailRequired}
            className={inputClass}
            value={v.email}
            onChange={(e) => set('email', e.target.value)}
          />
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
      <TrofeuDorsalField
        dorsal={v.dorsal_trofeu}
        dorsais={v.dorsais_trofeu}
        placeholder="Ex: 1129"
        onChange={(dorsal, nextMap) =>
          setV((p) => ({
            ...p,
            dorsal_trofeu: dorsal,
            dorsais_trofeu: nextMap,
            needs_admin_review: dorsal ? false : p.needs_admin_review,
          }))
        }
      />
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
        <>
          <Field label="Perfil de acesso">
            <Segmented<UserRole>
              value={v.role}
              onChange={(r) =>
                setV((p) => ({
                  ...p,
                  role: r,
                  login_authorized: r === 'admin' ? true : p.login_authorized,
                }))
              }
              options={[
                { value: 'athlete', label: 'Atleta' },
                { value: 'admin', label: 'Administrador' },
              ]}
            />
          </Field>
          <Field
            label="Autorização de login na aplicação (Admin)"
            hint={
              v.role === 'admin'
                ? 'Administradores têm login autorizado automaticamente e precisam de email associado.'
                : 'O atleta só consegue fazer login com o email associado na ficha quando autorizado aqui.'
            }
          >
            <Segmented<'blocked' | 'authorized'>
              value={v.login_authorized || v.role === 'admin' ? 'authorized' : 'blocked'}
              onChange={(mode) => {
                if (v.role === 'admin') return
                setFormErr('')
                set('login_authorized', mode === 'authorized')
              }}
              options={[
                { value: 'blocked', label: 'Login bloqueado' },
                { value: 'authorized', label: 'Login autorizado' },
              ]}
            />
          </Field>
        </>
      )}
      {formErr && <p className="t-small text-[var(--danger)]">{formErr}</p>}
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
  can_self_manage: false,
})

/** Ficha de perfil infantil / menor (nome, nascimento, escalão jovem, NIF, dorsal, modo de gestão). */
export const ChildForm: React.FC<{
  initial: ChildFormValue
  allowSelfManageControl?: boolean
  submitLabel: string
  onSubmit: (v: ChildFormValue) => void
  onCancel?: () => void
}> = ({ initial, allowSelfManageControl, submitLabel, onSubmit, onCancel }) => {
  const [v, setV] = useState<ChildFormValue>(initial)
  const [formErr, setFormErr] = useState('')
  const set = <K extends keyof ChildFormValue>(k: K, val: ChildFormValue[K]) => setV((p) => ({ ...p, [k]: val }))
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        setFormErr('')
        if (!v.name.trim()) return
        const cleanEmail = (v.email || '').trim().toLowerCase()
        if (v.can_self_manage && (!cleanEmail || !cleanEmail.includes('@'))) {
          setFormErr('Para ativar o Login próprio do menor, associa um email válido na ficha.')
          return
        }
        onSubmit({
          ...v,
          name: v.name.trim(),
          email: cleanEmail || undefined,
          login_email: cleanEmail || v.login_email,
        })
      }}
    >
      <PhotoField name={v.name} value={v.photo_url} gender={v.gender} child onChange={(x) => set('photo_url', x)} />
      <Field label="Nome completo *">
        <input className={inputClass} required value={v.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Género" hint="Define a figura por defeito quando não há foto.">
        <Segmented<'M' | 'F'>
          value={(v.gender ?? '') as 'M' | 'F'}
          onChange={(g) => set('gender', g)}
          options={[
            { value: 'M', label: 'Masculino' },
            { value: 'F', label: 'Feminino' },
          ]}
        />
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
      <TrofeuDorsalField
        dorsal={v.dorsal_trofeu}
        dorsais={v.dorsais_trofeu}
        placeholder="Ex: 1125"
        onChange={(dorsal, nextMap) =>
          setV((p) => ({
            ...p,
            dorsal_trofeu: dorsal,
            dorsais_trofeu: nextMap,
            needs_admin_review: dorsal ? false : p.needs_admin_review,
          }))
        }
      />
      <Field label="Notas médicas / alergias">
        <textarea rows={2} className={inputClass} value={v.medical_notes || ''} onChange={(e) => set('medical_notes', e.target.value || undefined)} />
      </Field>
      {allowSelfManageControl && (
        <Field
          label="Modo de acesso (gerido pelo Admin)"
          hint="Com Login próprio, o menor entra exclusivamente pelo email associado abaixo."
        >
          <Segmented<'adults' | 'self'>
            value={v.can_self_manage ? 'self' : 'adults'}
            onChange={(mode) => {
              setFormErr('')
              set('can_self_manage', mode === 'self')
            }}
            options={[
              { value: 'adults', label: 'Gerido por adultos (máx. 2)' },
              { value: 'self', label: 'Login próprio' },
            ]}
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Telemóvel (opcional)">
          <input type="tel" className={inputClass} value={v.phone || ''} onChange={(e) => set('phone', e.target.value || undefined)} />
        </Field>
        <Field label={v.can_self_manage ? 'Email associado *' : 'Email (opcional)'}>
          <input
            type="email"
            required={Boolean(v.can_self_manage)}
            className={inputClass}
            value={v.email || ''}
            onChange={(e) => set('email', e.target.value || undefined)}
          />
        </Field>
      </div>
      {formErr && <p className="t-small text-[var(--danger)]">{formErr}</p>}
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
