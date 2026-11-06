import React, { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ClipboardCheck, Download, Pencil, Plus, Search, UserPlus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { AthleteProfile, TransportMode } from '../types'
import { EVENT_TYPE_LABELS } from '../types'
import { calculateAge, formatShortDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateEvent } from '../utils/appEvents'
import { ActivityCover } from '../components/ActivityCover'
import { CreateMenuSheet } from '../components/CreateMenuSheet'
import { AthleteForm, ChildForm, emptyAthlete, emptyChild } from '../components/PeopleForms'
import { Sheet } from '../components/Sheet'
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  IconButton,
  PageHeader,
  SectionTitle,
  Segmented,
  SheetHeader,
  StatTile,
  Tag,
  inputClass,
  kindOfEvent,
} from '../components/ui'

type Tab = 'panel' | 'athletes' | 'children' | 'agenda'

/** Gerir (/admin) — apenas para administradores: painel, atletas, crianças e agenda. */
export const AdminPage: React.FC = () => {
  const { isAdminView } = useApp()
  const [tab, setTab] = useState<Tab>('panel')
  const [createOpen, setCreateOpen] = useState(false)
  if (!isAdminView) return <Navigate to="/" replace />

  return (
    <div className="px-5 pb-28 space-y-5">
      <PageHeader
        title="Gerir a equipa"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" /> Criar
          </Button>
        }
      />
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
      {tab === 'panel' && <PanelTab onTab={setTab} />}
      {tab === 'athletes' && <AthletesTab />}
      {tab === 'children' && <ChildrenTab />}
      {tab === 'agenda' && <AgendaTab />}
      {createOpen && <CreateMenuSheet onClose={() => setCreateOpen(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
const PanelTab: React.FC<{ onTab: (t: Tab) => void }> = ({ onTab }) => {
  const { races, registrations, profiles, youthAthletes, currentUser, confirmAllPendingForRace, markAllBibsAtClubForRace } = useApp()
  const navigate = useNavigate()
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-2">
        <StatTile value={profiles.length} label="Atletas" onClick={() => onTab('athletes')} />
        <StatTile value={youthAthletes.length} label="Crianças" onClick={() => onTab('children')} />
        <StatTile value={races.filter((r) => r.date >= today).length} label="Provas futuras" onClick={() => onTab('agenda')} />
      </div>

      <section className="space-y-2">
        <SectionTitle title="Inscrições e dorsais" />
        {work.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Tudo em dia" text="Não há inscrições nem dorsais pendentes nas próximas provas." />
        ) : (
          <div className="divide-soft">
            {work.map(({ race, total, pending, bibs }) => (
              <div key={race.id} className="py-4 space-y-3">
                <button type="button" className="w-full flex items-center gap-4 text-left pressable" onClick={() => navigate(`/prova/${race.id}`)}>
                  <ActivityCover kind={race.category} seed={race.id} imageUrl={race.image_url} className="w-14 h-14 rounded-xl shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="t-body t-strong text-[var(--text-1)] line-clamp-2">{race.title}</span>
                    <span className="block t-small text-[var(--text-3)]">
                      {formatShortDate(race.date)} · {total} {total === 1 ? 'inscrito' : 'inscritos'}
                    </span>
                  </span>
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {pending > 0 ? <Tag tone="warn">{pending} por confirmar</Tag> : <Tag tone="ok">Inscrições confirmadas</Tag>}
                  {bibs > 0 && <Tag>{bibs} dorsais por levantar</Tag>}
                </div>
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
              </div>
            ))}
          </div>
        )}
      </section>
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
  const editing = editId ? profiles.find((p) => p.id === editId) || null : null

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
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-[var(--text-3)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            className={`${inputClass} pl-11`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, escalão ou NIF"
            aria-label="Pesquisar atletas"
          />
        </div>
        <IconButton label="Exportar lista em CSV" onClick={exportCSV} className="!w-12 !h-12">
          <Download className="w-5 h-5" aria-hidden="true" />
        </IconButton>
      </div>

      <Button block onClick={() => setCreating(true)}>
        <UserPlus className="w-4 h-4" aria-hidden="true" /> Novo atleta
      </Button>

      <SectionTitle title="Atletas" count={list.length} />
      {list.length === 0 && <p className="t-body text-[var(--text-3)]">Nenhum atleta corresponde à pesquisa.</p>}
      <div className="divide-soft">
        {list.map((p) => {
          const kids = youthAthletes.filter((c) => c.associated_adult_ids.includes(p.id))
          const open = openId === p.id
          return (
            <div key={p.id} className="py-1">
              <button
                type="button"
                className="w-full min-h-14 flex items-center gap-4 text-left cursor-pointer"
                onClick={() => setOpenId(open ? null : p.id)}
                aria-expanded={open}
              >
                <Avatar name={p.name} />
                <span className="min-w-0 flex-1">
                  <span className="block t-body text-[var(--text-1)] truncate">{p.name}</span>
                  <span className="block t-small text-[var(--text-3)] truncate">
                    {p.escalao}
                    {kids.length > 0 && ` · ${kids.length} ${kids.length === 1 ? 'criança' : 'crianças'}`}
                  </span>
                </span>
                {p.role === 'admin' && <Tag tone="warn">Admin</Tag>}
              </button>
              {open && (
                <div className="pb-4 pt-1 space-y-4">
                  <div className="t-small text-[var(--text-2)] space-y-0.5">
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
                      <Pencil className="w-4 h-4" aria-hidden="true" /> Editar
                    </Button>
                    {p.id !== currentUser.id && (
                      <Button size="sm" variant="danger" onClick={() => window.confirm(`Remover ${p.name} da equipa?`) && removeAthleteProfile(p.id)}>
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {creating && (
        <Sheet onClose={() => setCreating(false)} ariaLabel="Novo atleta">
          <SheetHeader title="Novo atleta" onClose={() => setCreating(false)} />
          <div className="flex-1 overflow-y-auto px-5 py-4">
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
            />
          </div>
        </Sheet>
      )}

      {editing && (
        <Sheet onClose={() => setEditId(null)} ariaLabel={`Editar ${editing.name}`}>
          <SheetHeader title={editing.name} subtitle="Editar atleta" onClose={() => setEditId(null)} />
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <AthleteForm
              key={editing.id}
              initial={editing}
              allowRole={editing.id !== currentUser.id}
              submitLabel="Guardar"
              onSubmit={(v) => {
                updateProfile({ ...editing, ...v })
                setEditId(null)
              }}
            />
          </div>
        </Sheet>
      )}
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
      <Field label="Inscrever em prova" className="flex-1 min-w-0">
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
  const [openId, setOpenId] = useState<string | null>(null)
  const [addGuardian, setAddGuardian] = useState<Record<string, string>>({})
  const adults = [...profiles].sort((a, b) => a.name.localeCompare(b.name))
  const editing = editId ? youthAthletes.find((c) => c.id === editId) || null : null

  return (
    <div className="space-y-4">
      <Button block onClick={() => setCreating(true)}>
        <Plus className="w-4 h-4" aria-hidden="true" /> Nova criança
      </Button>

      <SectionTitle title="Crianças" count={youthAthletes.length} />
      {youthAthletes.length === 0 && <p className="t-body text-[var(--text-3)]">Ainda não há perfis infantis.</p>}
      <div className="divide-soft">
        {youthAthletes.map((c) => {
          const guardians = c.associated_adult_ids.map((id) => profiles.find((p) => p.id === id)).filter((p): p is AthleteProfile => Boolean(p))
          const open = openId === c.id
          return (
            <div key={c.id} className="py-1">
              <button
                type="button"
                className="w-full min-h-14 flex items-center gap-4 text-left cursor-pointer"
                onClick={() => setOpenId(open ? null : c.id)}
                aria-expanded={open}
              >
                <Avatar name={c.name} child />
                <span className="min-w-0 flex-1">
                  <span className="block t-body text-[var(--text-1)] truncate">{c.name}</span>
                  <span className="block t-small text-[var(--text-3)] truncate">
                    {c.escalao} · {calculateAge(c.birth_date)} anos
                  </span>
                </span>
                {guardians.length === 0 && <Tag tone="danger">Sem responsável</Tag>}
              </button>
              {open && (
                <div className="pb-4 pt-1 space-y-3">
                  <div className="space-y-1">
                    <div className="t-small t-strong text-[var(--text-1)]">Responsáveis</div>
                    {guardians.length === 0 && <p className="t-small text-[var(--text-3)]">Nenhum adulto associado.</p>}
                    {guardians.map((g) => (
                      <div key={g.id} className="flex items-center gap-3">
                        <span className="t-body text-[var(--text-2)] flex-1 min-w-0 truncate">{g.name}</span>
                        <IconButton label={`Remover ${g.name} como responsável`} onClick={() => disassociateChildFromAdult(c.id, g.id)}>
                          <X className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                  {guardians.length < 2 && (
                    <div className="flex gap-2">
                      <select
                        className={`${inputClass} flex-1 min-w-0`}
                        aria-label="Adicionar responsável"
                        value={addGuardian[c.id] || ''}
                        onChange={(e) => setAddGuardian((s) => ({ ...s, [c.id]: e.target.value }))}
                      >
                        <option value="">Adicionar responsável…</option>
                        {adults
                          .filter((p) => !c.associated_adult_ids.includes(p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                      <Button
                        variant="secondary"
                        disabled={!addGuardian[c.id]}
                        onClick={() => {
                          associateChildToAdult(c.id, addGuardian[c.id])
                          setAddGuardian((s) => ({ ...s, [c.id]: '' }))
                        }}
                      >
                        Associar
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditId(c.id)}>
                      <Pencil className="w-4 h-4" aria-hidden="true" /> Editar
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => window.confirm(`Apagar ${c.name}?`) && removeYouthAthlete(c.id)}>
                      Apagar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {creating && (
        <Sheet onClose={() => setCreating(false)} ariaLabel="Nova criança">
          <SheetHeader title="Nova criança" onClose={() => setCreating(false)} />
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
            />
            {!guardian && <p className="t-small text-[var(--text-3)]">Escolhe o adulto responsável antes de criar.</p>}
          </div>
        </Sheet>
      )}

      {editing && (
        <Sheet onClose={() => setEditId(null)} ariaLabel={`Editar ${editing.name}`}>
          <SheetHeader title={editing.name} subtitle="Editar perfil infantil" onClose={() => setEditId(null)} />
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ChildForm
              key={editing.id}
              initial={editing}
              submitLabel="Guardar"
              onSubmit={(v) => {
                updateYouthAthlete({ ...editing, ...v })
                setEditId(null)
              }}
            />
          </div>
        </Sheet>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
const AgendaTab: React.FC = () => {
  const { races, events } = useApp()
  const navigate = useNavigate()
  const today = todayISO()
  const items = [
    ...races.filter((r) => r.date >= today).map((r) => ({ id: r.id, date: r.date, time: r.start_time, title: r.title, race: r })),
    ...events.filter((e) => e.date >= today).map((e) => ({ id: e.id, date: e.date, time: e.time, title: e.title, event: e })),
  ].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))

  return (
    <div className="space-y-2">
      <SectionTitle title="Próximas atividades" count={items.length} />
      {items.length === 0 && <p className="t-body text-[var(--text-3)]">Não há atividades agendadas.</p>}
      <div className="divide-soft">
        {items.map((i) => {
          const race = 'race' in i ? i.race : undefined
          const event = 'event' in i ? i.event : undefined
          const kind = race ? race.category : kindOfEvent(event!)
          return (
            <div key={i.id} className="py-3 flex items-center gap-4">
              <button
                type="button"
                className="flex-1 min-w-0 flex items-center gap-4 text-left pressable"
                onClick={() => navigate(race ? `/prova/${race.id}` : `/evento/${event!.id}`)}
              >
                <ActivityCover kind={kind} seed={i.id} imageUrl={race?.image_url || event?.image_url} className="w-14 h-14 rounded-xl shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="t-body text-[var(--text-1)] line-clamp-2">{i.title}</span>
                  <span className="block t-small text-[var(--text-3)] truncate">
                    {formatShortDate(i.date)} · {i.time}
                    {event ? ` · ${EVENT_TYPE_LABELS[event.type].short}` : ''}
                  </span>
                </span>
              </button>
              {event && (
                <IconButton label={`Editar ${i.title}`} onClick={() => openCreateEvent(event.type, event)}>
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </IconButton>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
