import React, { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CalendarPlus, Download, Megaphone, Pencil, Plus, Search, Trophy, UserPlus, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { AthleteProfile, TransportMode } from '../types'
import { EVENT_TYPE_LABELS } from '../types'
import { calculateAge, formatShortDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateEvent, openCreateNotice, openCreateRace } from '../utils/appEvents'
import { RaceDetailModal } from '../components/RaceDetailModal'
import { AthleteForm, ChildForm, emptyAthlete, emptyChild } from '../components/PeopleForms'
import { Avatar, Button, Card, EmptyState, Field, KIND_COLOR, KindBadge, PageHeader, SectionTitle, Segmented, Tag, inputClass, kindOfEvent } from '../components/ui'

type Tab = 'panel' | 'athletes' | 'children' | 'agenda'

/** Página de administração (/admin) — apenas para administradores. */
export const AdminPage: React.FC = () => {
  const { isAdminView } = useApp()
  const [tab, setTab] = useState<Tab>('panel')
  if (!isAdminView) return <Navigate to="/" replace />

  return (
    <div className="space-y-4 pb-10 stagger">
      <PageHeader eyebrow="Administração" title="Gestão da equipa" />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'panel', label: 'Painel' },
          { value: 'athletes', label: 'Atletas' },
          { value: 'children', label: 'Crianças' },
          { value: 'agenda', label: 'Agenda' },
        ]}
      />
      {tab === 'panel' && <PanelTab />}
      {tab === 'athletes' && <AthletesTab />}
      {tab === 'children' && <ChildrenTab />}
      {tab === 'agenda' && <AgendaTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
const PanelTab: React.FC = () => {
  const { races, registrations, profiles, youthAthletes, currentUser, confirmAllPendingForRace, markAllBibsAtClubForRace } = useApp()
  const [raceId, setRaceId] = useState<string | null>(null)
  const today = todayISO()

  const work = races
    .filter((r) => r.date >= today && r.category !== 'individual')
    .map((race) => {
      const regs = registrations.filter((x) => x.race_id === race.id && x.status !== 'cancelled')
      return {
        race,
        total: regs.length,
        pending: regs.filter((x) => x.status === 'interested').length,
        bibs: regs.filter((x) => x.bib_status === 'pending').length,
      }
    })
    .filter((x) => x.total > 0)

  const selected = raceId ? races.find((r) => r.id === raceId) || null : null
  const actions = [
    { label: 'Prova', icon: Trophy, run: () => openCreateRace() },
    { label: 'Treino', icon: CalendarPlus, run: () => openCreateEvent('training') },
    { label: 'Evento', icon: Users, run: () => openCreateEvent('social') },
    { label: 'Comunicado', icon: Megaphone, run: () => openCreateNotice() },
  ]

  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <SectionTitle title="Criar" />
        <div className="grid grid-cols-4 gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.run}
              className="iron-card py-3 flex flex-col items-center gap-1.5 text-xs font-bold text-[var(--text-1)] cursor-pointer active:scale-95"
            >
              <a.icon className="w-5 h-5 text-[var(--run)]" />
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Atletas', profiles.length],
          ['Crianças', youthAthletes.length],
          ['Provas futuras', races.filter((r) => r.date >= today).length],
        ].map(([label, n]) => (
          <Card key={label} className="py-3">
            <div className="font-display font-black text-xl text-[var(--text-1)]">{n}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">{label}</div>
          </Card>
        ))}
      </div>

      <section className="space-y-2.5">
        <SectionTitle title="Inscrições e dorsais" />
        {work.length === 0 ? (
          <EmptyState text="Nada pendente nas próximas provas." />
        ) : (
          work.map(({ race, total, pending, bibs }) => (
            <Card key={race.id} accent={KIND_COLOR[race.category]} className="p-3.5 space-y-2.5">
              <button type="button" className="w-full text-left cursor-pointer" onClick={() => setRaceId(race.id)}>
                <div className="text-sm font-bold text-[var(--text-1)]">{race.title}</div>
                <div className="text-xs text-[var(--text-3)] flex gap-2 flex-wrap items-center">
                  {formatShortDate(race.date)} · {total} inscritos
                  {pending > 0 ? <Tag tone="warn">{pending} por confirmar</Tag> : <Tag tone="ok">Confirmadas</Tag>}
                  {bibs > 0 && <Tag>{bibs} dorsais por levantar</Tag>}
                </div>
              </button>
              {(pending > 0 || bibs > 0) && (
                <div className="flex gap-2">
                  {pending > 0 && (
                    <Button size="sm" className="flex-1" onClick={() => confirmAllPendingForRace(race.id)}>
                      Confirmar {pending}
                    </Button>
                  )}
                  {bibs > 0 && (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => markAllBibsAtClubForRace(race.id, currentUser.name)}>
                      Dorsais no clube
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </section>
      {selected && <RaceDetailModal race={selected} onClose={() => setRaceId(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
const AthletesTab: React.FC = () => {
  const { profiles, youthAthletes, currentUser, addAthleteProfile, updateProfile, removeAthleteProfile, showToast } = useApp()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...profiles]
      .filter((p) => !s || p.name.toLowerCase().includes(s) || p.escalao.toLowerCase().includes(s) || p.nif.includes(s))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [profiles, q])

  const exportCSV = () => {
    const header = ['Tipo', 'Nome', 'Escalão', 'Nascimento', 'NIF', 'CC', 'Telefone', 'Email', 'T-shirt', 'Responsáveis']
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const rows = [
      ...profiles.map((p) => ['Adulto', p.name, p.escalao, p.birth_date, p.nif, p.cc_number, p.phone, p.email, p.shirt_size, '']),
      ...youthAthletes.map((c) => [
        'Criança',
        c.name,
        c.escalao,
        c.birth_date,
        c.nif,
        c.cc_number || '',
        '',
        '',
        c.shirt_size || '',
        c.associated_adult_ids.map((id) => profiles.find((p) => p.id === id)?.name || '').join(' & '),
      ]),
    ]
    const csv = [header, ...rows].map((r) => r.map(esc).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'equipa-urcharneca.csv'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Lista exportada.')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputClass} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, escalão, NIF…" aria-label="Pesquisar atletas" />
        </div>
        <Button variant="secondary" onClick={exportCSV} aria-label="Exportar CSV">
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {creating ? (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-1)]">Novo atleta</h3>
          <AthleteForm
            initial={emptyAthlete()}
            allowRole
            submitLabel="Criar atleta"
            onSubmit={(v) => {
              const created = addAthleteProfile(v)
              if (created) {
                setCreating(false)
                setOpenId(created.id)
              }
            }}
            onCancel={() => setCreating(false)}
          />
        </Card>
      ) : (
        <Button block onClick={() => setCreating(true)}>
          <UserPlus className="w-4 h-4" /> Novo atleta
        </Button>
      )}

      <SectionTitle title="Atletas" count={list.length} />
      <div className="space-y-2">
        {list.map((p) => {
          const kids = youthAthletes.filter((c) => c.associated_adult_ids.includes(p.id))
          const open = openId === p.id
          return (
            <Card key={p.id} className="p-3">
              <button type="button" className="w-full flex items-center gap-3 text-left cursor-pointer" onClick={() => setOpenId(open ? null : p.id)} aria-expanded={open}>
                <Avatar name={p.name} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[var(--text-1)] truncate">{p.name}</div>
                  <div className="text-xs text-[var(--text-3)] truncate">
                    {p.escalao}
                    {kids.length > 0 && ` · ${kids.length} criança(s)`}
                  </div>
                </div>
                {p.role === 'admin' && <Tag tone="warn">Admin</Tag>}
              </button>
              {open && editId !== p.id && (
                <div className="pt-3 mt-3 border-t border-[var(--border-card)] space-y-3">
                  <div className="text-xs text-[var(--text-2)] space-y-0.5">
                    <div>
                      {p.phone} · {p.email}
                    </div>
                    <div>
                      NIF {p.nif || '—'} · {calculateAge(p.birth_date)} anos · T-shirt {p.shirt_size}
                    </div>
                    {kids.length > 0 && <div>Crianças: {kids.map((k) => k.name).join(', ')}</div>}
                  </div>
                  <EnrollInRace athlete={p} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditId(p.id)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    {p.id !== currentUser.id && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => window.confirm(`Remover ${p.name} da equipa?`) && removeAthleteProfile(p.id)}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {open && editId === p.id && (
                <div className="pt-3 mt-3 border-t border-[var(--border-card)]">
                  <AthleteForm
                    initial={p}
                    allowRole={p.id !== currentUser.id}
                    submitLabel="Guardar"
                    onSubmit={(v) => {
                      updateProfile({ ...p, ...v })
                      setEditId(null)
                    }}
                    onCancel={() => setEditId(null)}
                  />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/** Inscrição rápida de um atleta numa prova futura (pelo admin). */
const EnrollInRace: React.FC<{ athlete: AthleteProfile }> = ({ athlete }) => {
  const { races, registrations, registerForRace } = useApp()
  const [raceId, setRaceId] = useState('')
  const today = todayISO()
  const available = races.filter(
    (r) => r.date >= today && !registrations.some((x) => x.race_id === r.id && !x.is_dependent && x.athlete_id === athlete.id)
  )
  if (available.length === 0) return null
  return (
    <div className="flex gap-2 items-end">
      <Field label="Inscrever em prova" className="flex-1">
        <select className={inputClass} value={raceId} onChange={(e) => setRaceId(e.target.value)}>
          <option value="">Escolher prova…</option>
          {available.map((r) => (
            <option key={r.id} value={r.id}>
              {formatShortDate(r.date)} — {r.title}
            </option>
          ))}
        </select>
      </Field>
      <Button
        size="sm"
        disabled={!raceId}
        onClick={() => {
          const race = races.find((r) => r.id === raceId)
          if (!race) return
          const transport: TransportMode = race.van_available ? 'van_roundtrip' : 'own_transport'
          registerForRace({
            race_id: race.id,
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            is_dependent: false,
            escalao: athlete.escalao,
            distance: race.distances[0],
            transport_mode: transport,
          })
          setRaceId('')
        }}
      >
        Inscrever
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
const ChildrenTab: React.FC = () => {
  const { youthAthletes, profiles, addYouthAthlete, updateYouthAthlete, removeYouthAthlete, associateChildToAdult, disassociateChildFromAdult } =
    useApp()
  const [creating, setCreating] = useState(false)
  const [guardian, setGuardian] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [addGuardian, setAddGuardian] = useState<Record<string, string>>({})
  const adults = [...profiles].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-3">
      {creating ? (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-1)]">Nova criança</h3>
          <Field label="Adulto responsável *">
            <select className={inputClass} value={guardian} onChange={(e) => setGuardian(e.target.value)}>
              <option value="">Escolher…</option>
              {adults.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <ChildForm
            initial={emptyChild()}
            submitLabel="Criar"
            onSubmit={(v) => {
              if (!guardian) return
              addYouthAthlete(v, [guardian])
              setCreating(false)
              setGuardian('')
            }}
            onCancel={() => setCreating(false)}
          />
        </Card>
      ) : (
        <Button block onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" /> Nova criança
        </Button>
      )}

      <SectionTitle title="Crianças" count={youthAthletes.length} />
      {youthAthletes.map((c) => {
        const guardians = c.associated_adult_ids.map((id) => profiles.find((p) => p.id === id)).filter((p): p is AthleteProfile => Boolean(p))
        if (editId === c.id) {
          return (
            <Card key={c.id} className="p-4">
              <ChildForm
                initial={c}
                submitLabel="Guardar"
                onSubmit={(v) => {
                  updateYouthAthlete({ ...c, ...v })
                  setEditId(null)
                }}
                onCancel={() => setEditId(null)}
              />
            </Card>
          )
        }
        return (
          <Card key={c.id} className="p-3.5 space-y-2.5">
            <div className="flex items-center gap-3">
              <Avatar name={c.name} child />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[var(--text-1)] truncate">{c.name}</div>
                <div className="text-xs text-[var(--text-3)]">
                  {c.escalao} · {calculateAge(c.birth_date)} anos
                </div>
              </div>
              <button type="button" aria-label={`Editar ${c.name}`} onClick={() => setEditId(c.id)} className="p-2 rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-raised)] cursor-pointer">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {guardians.length === 0 && <Tag tone="danger">Sem responsável</Tag>}
              {guardians.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => disassociateChildFromAdult(c.id, g.id)}
                  title="Remover responsável"
                  className="cursor-pointer"
                >
                  <Tag>{g.name} ✕</Tag>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {guardians.length < 2 && (
                <>
                  <select
                    className={`${inputClass} flex-1`}
                    aria-label="Adicionar responsável"
                    value={addGuardian[c.id] || ''}
                    onChange={(e) => setAddGuardian((s) => ({ ...s, [c.id]: e.target.value }))}
                  >
                    <option value="">+ Responsável…</option>
                    {adults
                      .filter((p) => !c.associated_adult_ids.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!addGuardian[c.id]}
                    onClick={() => {
                      associateChildToAdult(c.id, addGuardian[c.id])
                      setAddGuardian((s) => ({ ...s, [c.id]: '' }))
                    }}
                  >
                    Associar
                  </Button>
                </>
              )}
              <Button size="sm" variant="danger" onClick={() => window.confirm(`Apagar ${c.name}?`) && removeYouthAthlete(c.id)}>
                Apagar
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
const AgendaTab: React.FC = () => {
  const { races, events } = useApp()
  const [raceId, setRaceId] = useState<string | null>(null)
  const today = todayISO()
  const items = [
    ...races.filter((r) => r.date >= today).map((r) => ({ id: r.id, date: r.date, time: r.start_time, title: r.title, race: r })),
    ...events.filter((e) => e.date >= today).map((e) => ({ id: e.id, date: e.date, time: e.time, title: e.title, event: e })),
  ].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  const selected = raceId ? races.find((r) => r.id === raceId) || null : null

  return (
    <div className="space-y-2">
      <SectionTitle title="Próximas atividades" count={items.length} />
      {items.map((i) => {
        const race = 'race' in i ? i.race : undefined
        const event = 'event' in i ? i.event : undefined
        const kind = race ? race.category : kindOfEvent(event!)
        return (
          <Card key={i.id} accent={KIND_COLOR[kind]} className="p-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <KindBadge kind={kind} label={event ? EVENT_TYPE_LABELS[event.type].short : undefined} />
              <div className="text-sm font-bold text-[var(--text-1)] truncate mt-0.5">{i.title}</div>
              <div className="text-xs text-[var(--text-3)]">
                {formatShortDate(i.date)} · {i.time}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => (race ? setRaceId(race.id) : event && openCreateEvent(event.type, event))}>
              {race ? 'Gerir' : 'Editar'}
            </Button>
          </Card>
        )
      })}
      {selected && <RaceDetailModal race={selected} onClose={() => setRaceId(null)} />}
    </div>
  )
}
