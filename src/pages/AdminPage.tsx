import React, { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, ClipboardCheck, Download, LogIn, Pencil, Plus, RefreshCw, Search, ShieldCheck, Ticket, Trophy, UserPlus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { AthleteProfile, TransportMode } from '../types'
import { EVENT_TYPE_LABELS } from '../types'
import { calculateAge, formatShortDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateEvent, openCreateRace } from '../utils/appEvents'
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
  KIND_SINGULAR,
  StatTile,
  Tag,
  inputClass,
  kindOfEvent,
} from '../components/ui'

type Tab = 'panel' | 'athletes' | 'children' | 'agenda'

function formatTrofeuDorsalTag(person: { dorsal_trofeu?: string; dorsais_trofeu?: Record<string, string> }) {
  const cur = person.dorsais_trofeu?.['2026/2027'] || person.dorsal_trofeu
  if (cur) return { label: `26/27 #${cur}`, current: true }
  const entries = Object.entries(person.dorsais_trofeu || {}).sort((a, b) => b[0].localeCompare(a[0]))
  if (entries.length === 0) return null
  const [yr, num] = entries[0]
  return { label: `${yr.slice(2, 4)}/${yr.slice(7, 9)} #${num}`, current: false }
}

function formatTrofeuDorsalsSummary(dorsais?: Record<string, string>): string | null {
  if (!dorsais || Object.keys(dorsais).length === 0) return null
  return Object.entries(dorsais)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([s, d]) => `${s}: #${d}`)
    .join(' · ')
}

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
  const {
    races,
    registrations,
    profiles,
    youthAthletes,
    currentUser,
    isSyncingTrofeu,
    pendingDorsalAthletesCount,
    trofeuSyncLogs,
    syncTrofeuCascais,
    assignTrofeuDorsal,
    confirmAllPendingForRace,
    markAllBibsAtClubForRace,
  } = useApp()
  const navigate = useNavigate()
  const [dorsalInputs, setDorsalInputs] = useState<Record<string, string>>({})
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

  const pendingDorsalPeople = useMemo(() => {
    const adults = profiles
      .filter((p) => p.needs_admin_review || (!p.dorsal_trofeu && p.trofeu_seasons?.includes('2026/2027')))
      .map((p) => ({ id: p.id, name: p.name, escalao: p.escalao, isYouth: false, seasons: p.trofeu_seasons || [] }))
    const kids = youthAthletes
      .filter((y) => y.needs_admin_review || (!y.dorsal_trofeu && y.trofeu_seasons?.includes('2026/2027')))
      .map((y) => ({ id: y.id, name: y.name, escalao: y.escalao, isYouth: true, seasons: y.trofeu_seasons || [] }))
    return [...adults, ...kids]
  }, [profiles, youthAthletes])

  const trofeuStageCount = races.filter((r) => r.category === 'trofeu_cascais').length
  const lastLog = trofeuSyncLogs[0]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-2">
        <StatTile value={profiles.length} label="Atletas" onClick={() => onTab('athletes')} />
        <StatTile value={youthAthletes.length} label="Crianças" onClick={() => onTab('children')} />
        <StatTile value={races.filter((r) => r.date >= today).length} label="Provas futuras" onClick={() => onTab('agenda')} />
      </div>

      {/* Troféu de Cascais — Sincronização & Gestão de Dorsais */}
      <section className="space-y-3">
        <SectionTitle
          title="Troféu de Cascais · Sincronização"
          action="Abrir Troféu"
          onAction={() => navigate('/trofeu')}
        />
        <div className="card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--gold-ink)] shrink-0" aria-hidden="true" />
                <span className="t-body t-strong text-[var(--text-1)]">
                  {trofeuStageCount} etapas sincronizadas (2026/2027)
                </span>
              </div>
              <p className="t-small text-[var(--text-3)] mt-1">
                {lastLog
                  ? `Última sync: ${new Date(lastLog.timestamp).toLocaleDateString('pt-PT')} — ${lastLog.summary}`
                  : 'Ligação automática ao site trofeuatletismocascais.pt ativa (procura de documentos 2x/semana).'}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={isSyncingTrofeu}
              onClick={() => void syncTrofeuCascais('manual_admin')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTrofeu ? 'animate-spin' : ''}`} aria-hidden="true" />
              Sincronizar
            </Button>
          </div>

          {pendingDorsalAthletesCount > 0 && (
            <div className="rounded-xl bg-[var(--tint-amber-bg)] p-3.5 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--tint-amber-fg)] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="t-small text-[var(--text-1)]">
                  <strong>{pendingDorsalAthletesCount} atletas</strong> detetados no Troféu aguardam ID de Dorsal (preencher para identificar automaticamente nas provas):
                </div>
              </div>

              <div className="space-y-2">
                {pendingDorsalPeople.slice(0, 5).map((person) => (
                  <div key={person.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="t-small t-strong text-[var(--text-1)] truncate">
                        {person.name} {person.isYouth && '(Jovem)'}
                      </div>
                      <div className="text-[11px] text-[var(--text-3)] truncate">
                        {person.escalao} · {person.seasons.join(', ') || 'Troféu'}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={dorsalInputs[person.id] ?? ''}
                      onChange={(e) => setDorsalInputs((prev) => ({ ...prev, [person.id]: e.target.value }))}
                      placeholder="Dorsal"
                      className="w-20 rounded-lg bg-[var(--surface-card)] border border-[var(--border-card-strong)] px-2 py-1 t-small text-[var(--text-1)]"
                      aria-label={`Dorsal de ${person.name}`}
                    />
                    <Button
                      size="sm"
                      disabled={!(dorsalInputs[person.id] || '').trim()}
                      onClick={() => assignTrofeuDorsal(person.id, person.isYouth, dorsalInputs[person.id] || '')}
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>

              {pendingDorsalPeople.length > 5 && (
                <Button size="sm" variant="ghost" onClick={() => navigate('/trofeu')}>
                  <Ticket className="w-3.5 h-3.5" aria-hidden="true" /> Ver todos os {pendingDorsalPeople.length} pendentes no Troféu
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

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
                  {bibs > 0 && <Tag>{bibs} sem dorsal no clube</Tag>}
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
  const {
    profiles,
    youthAthletes,
    currentUser,
    addAthleteProfile,
    updateProfile,
    removeAthleteProfile,
    setAthleteRole,
    setAthleteLoginAuthorization,
    resetPersonLoginPassword,
    showToast,
  } = useApp()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [draftEmails, setDraftEmails] = useState<Record<string, string>>({})

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...profiles]
      .filter(
        (p) =>
          !s ||
          p.name.toLowerCase().includes(s) ||
          p.escalao.toLowerCase().includes(s) ||
          p.nif.includes(s) ||
          (p.dorsal_trofeu && p.dorsal_trofeu.toLowerCase().includes(s))
      )
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
          const dorsalTag = formatTrofeuDorsalTag(p)
          const dorsalsSummary = formatTrofeuDorsalsSummary(p.dorsais_trofeu)
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
                    {p.trofeu_seasons && p.trofeu_seasons.length > 0 && ` · Troféu: ${p.trofeu_seasons.join(', ')}`}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {dorsalTag ? (
                    <Tag tone={dorsalTag.current ? 'info' : 'neutral'}>{dorsalTag.label}</Tag>
                  ) : p.needs_admin_review ? (
                    <Tag tone="warn">Sem dorsal</Tag>
                  ) : null}
                  {p.login_email ? (
                    <Tag tone="ok">Login ativo</Tag>
                  ) : p.login_authorized || p.role === 'admin' ? (
                    <Tag tone="info">Autorizado</Tag>
                  ) : (
                    <Tag tone="neutral">Sem login</Tag>
                  )}
                  {p.role === 'admin' && <Tag tone="warn">Admin</Tag>}
                </span>
              </button>
              {open && (
                <div className="pb-4 pt-1 space-y-4">
                  <div className="t-small text-[var(--text-2)] space-y-0.5">
                    <div>
                      {p.phone || 'Sem telemóvel'} · {p.email || 'Sem email'}
                    </div>
                    <div>
                      NIF {p.nif || '—'} · {calculateAge(p.birth_date)} anos · T-shirt {p.shirt_size}
                    </div>
                    {dorsalsSummary && (
                      <div>Dorsais Troféu (exclusivos por época): {dorsalsSummary}</div>
                    )}
                    {kids.length > 0 && <div>Crianças: {kids.map((k) => k.name).join(', ')}</div>}
                  </div>
                  {/* Autorização expressa de login pelo Admin + Email obrigatório na ficha do atleta */}
                  <div className="rounded-xl bg-[var(--surface-raised)] p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="t-small t-strong text-[var(--text-1)]">Acesso e Login na Aplicação (Admin)</span>
                      <Tag
                        tone={
                          p.login_password_hash || p.auth_user_id
                            ? 'ok'
                            : p.login_authorized || p.role === 'admin'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {p.login_password_hash || p.auth_user_id
                          ? 'Ativo'
                          : p.login_authorized || p.role === 'admin'
                          ? 'Autorizado'
                          : 'Bloqueado'}
                      </Tag>
                    </div>
                    <Field
                      label="Email associado ao atleta (obrigatório para login)"
                      hint="O utilizador entra exclusivamente com este email (Google ou email/password)."
                    >
                      <div className="flex gap-2">
                        <input
                          type="email"
                          className={`${inputClass} flex-1 min-w-0`}
                          placeholder="email@exemplo.com"
                          value={draftEmails[p.id] ?? p.login_email ?? p.email ?? ''}
                          onChange={(e) => setDraftEmails((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const emailVal = (draftEmails[p.id] ?? p.login_email ?? p.email ?? '').trim()
                            setAthleteLoginAuthorization(p.id, Boolean(p.login_authorized || p.role === 'admin'), emailVal)
                          }}
                        >
                          Guardar email
                        </Button>
                      </div>
                    </Field>
                    {p.role === 'admin' ? (
                      <p className="t-small text-[var(--text-3)]">
                        Administradores têm acesso autorizado automaticamente pelo email acima.
                      </p>
                    ) : (
                      <Segmented<'blocked' | 'authorized'>
                        value={p.login_authorized ? 'authorized' : 'blocked'}
                        onChange={(mode) => {
                          const emailVal = (draftEmails[p.id] ?? p.login_email ?? p.email ?? '').trim()
                          setAthleteLoginAuthorization(p.id, mode === 'authorized', emailVal)
                        }}
                        options={[
                          { value: 'blocked', label: 'Login bloqueado' },
                          { value: 'authorized', label: 'Login autorizado' },
                        ]}
                      />
                    )}
                    {(p.login_password_hash || p.auth_user_id) && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="t-small text-[var(--text-2)] truncate">
                          Palavra-passe configurada ({p.login_provider === 'google' ? 'Google' : 'Email'})
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => resetPersonLoginPassword(p.id, false)}>
                          Repor senha
                        </Button>
                      </div>
                    )}
                  </div>
                  <EnrollInRace athlete={p} />
                  {p.id !== currentUser.id && (
                    <Button
                      size="sm"
                      variant={p.role === 'admin' ? 'secondary' : 'primary'}
                      block
                      onClick={() => setAthleteRole(p.id, p.role === 'admin' ? 'athlete' : 'admin')}
                    >
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      {p.role === 'admin' ? 'Remover perfil de Administrador' : 'Atribuir perfil de Administrador'}
                    </Button>
                  )}
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
  const {
    youthAthletes,
    profiles,
    addYouthAthlete,
    updateYouthAthlete,
    removeYouthAthlete,
    associateChildToAdult,
    disassociateChildFromAdult,
    setYouthManagementMode,
    resetPersonLoginPassword,
    setCurrentUserById,
    showToast,
  } = useApp()
  const [creating, setCreating] = useState(false)
  const [guardian, setGuardian] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [addGuardian, setAddGuardian] = useState<Record<string, string>>({})
  const [draftEmails, setDraftEmails] = useState<Record<string, string>>({})
  const adults = [...profiles].sort((a, b) => a.name.localeCompare(b.name))
  const editing = editId ? youthAthletes.find((c) => c.id === editId) || null : null

  return (
    <div className="space-y-4">
      <Button block onClick={() => setCreating(true)}>
        <Plus className="w-4 h-4" aria-hidden="true" /> Novo menor
      </Button>

      <SectionTitle title="Menores / Jovens" count={youthAthletes.length} />
      {youthAthletes.length === 0 && <p className="t-body text-[var(--text-3)]">Ainda não há perfis de menores.</p>}
      <div className="divide-soft">
        {youthAthletes.map((c) => {
          const guardians = c.associated_adult_ids.map((id) => profiles.find((p) => p.id === id)).filter((p): p is AthleteProfile => Boolean(p))
          const open = openId === c.id
          const dorsalTag = formatTrofeuDorsalTag(c)
          const dorsalsSummary = formatTrofeuDorsalsSummary(c.dorsais_trofeu)
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
                    {c.trofeu_seasons && c.trofeu_seasons.length > 0 && ` · Troféu: ${c.trofeu_seasons.join(', ')}`}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {dorsalTag ? (
                    <Tag tone={dorsalTag.current ? 'info' : 'neutral'}>{dorsalTag.label}</Tag>
                  ) : c.needs_admin_review ? (
                    <Tag tone="warn">Sem dorsal</Tag>
                  ) : null}
                  {c.can_self_manage ? (
                    <Tag tone="ok">Login próprio</Tag>
                  ) : guardians.length > 0 ? (
                    <Tag tone="info">{guardians.length}/2 adultos</Tag>
                  ) : (
                    <Tag tone="danger">Sem responsável</Tag>
                  )}
                </span>
              </button>
              {open && (
                <div className="pb-4 pt-1 space-y-3">
                  {dorsalsSummary && (
                    <div className="t-small text-[var(--text-2)]">
                      Dorsais Troféu (exclusivos por época): {dorsalsSummary}
                    </div>
                  )}
                  {/* Opção exclusiva do Administrador: Login próprio (com email obrigatório) vs Máximo 2 adultos */}
                  <div className="rounded-xl bg-[var(--surface-raised)] p-3 space-y-2.5">
                    <div className="t-small t-strong text-[var(--text-1)]">Modo de gestão da conta (Admin)</div>
                    <Field label="Email associado ao menor (obrigatório para Login próprio)">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          className={`${inputClass} flex-1 min-w-0`}
                          placeholder="email@exemplo.com"
                          value={draftEmails[c.id] ?? c.login_email ?? c.email ?? ''}
                          onChange={(e) => setDraftEmails((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const emailVal = (draftEmails[c.id] ?? c.login_email ?? c.email ?? '').trim()
                            setYouthManagementMode(c.id, Boolean(c.can_self_manage), emailVal)
                          }}
                        >
                          Guardar
                        </Button>
                      </div>
                    </Field>
                    <Segmented<'adults' | 'self'>
                      value={c.can_self_manage ? 'self' : 'adults'}
                      onChange={(mode) => {
                        const emailVal = (draftEmails[c.id] ?? c.login_email ?? c.email ?? '').trim()
                        setYouthManagementMode(c.id, mode === 'self', emailVal)
                      }}
                      options={[
                        { value: 'adults', label: 'Gerido por adultos (máx. 2)' },
                        { value: 'self', label: 'Login próprio' },
                      ]}
                    />
                    <p className="t-small text-[var(--text-3)]">
                      {c.can_self_manage
                        ? 'O menor entra exclusivamente pelo email associado acima (Google ou email/password).'
                        : 'Sem login direto: apenas os adultos associados (máx. 2) ou um admin gerem este perfil.'}
                    </p>
                    {c.can_self_manage && (c.login_password_hash || c.auth_user_id) && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="t-small text-[var(--text-2)] truncate">
                          Palavra-passe configurada ({c.login_provider === 'google' ? 'Google' : 'Email'})
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => resetPersonLoginPassword(c.id, true)}>
                          Repor senha
                        </Button>
                      </div>
                    )}
                    {c.can_self_manage && (
                      <Button size="sm" variant="secondary" onClick={() => setCurrentUserById(c.id)}>
                        <LogIn className="w-4 h-4" aria-hidden="true" /> Iniciar sessão como {c.name.split(' ')[0]}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="t-small t-strong text-[var(--text-1)]">Adultos responsáveis (máx. 2)</div>
                    {guardians.length === 0 && (
                      <p className="t-small text-[var(--text-3)]">
                        {c.can_self_manage ? 'Sem adultos associados (conta gerida pelo próprio menor).' : 'Nenhum adulto associado.'}
                      </p>
                    )}
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
        <Sheet onClose={() => setCreating(false)} ariaLabel="Novo perfil de menor">
          <SheetHeader title="Novo perfil de menor" onClose={() => setCreating(false)} />
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <Field label="Adulto responsável (obrigatório se gerido por adultos)">
              <select className={inputClass} value={guardian} onChange={(e) => setGuardian(e.target.value)}>
                <option value="">Sem adulto associado…</option>
                {adults.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <ChildForm
              initial={emptyChild()}
              allowSelfManageControl
              submitLabel="Criar"
              onSubmit={(v) => {
                if (!guardian && !v.can_self_manage) {
                  showToast('Escolhe um adulto responsável ou ativa o Login próprio do menor.', 'warning')
                  return
                }
                addYouthAthlete(v, guardian ? [guardian] : [])
                setCreating(false)
                setGuardian('')
              }}
            />
          </div>
        </Sheet>
      )}

      {editing && (
        <Sheet onClose={() => setEditId(null)} ariaLabel={`Editar ${editing.name}`}>
          <SheetHeader title={editing.name} subtitle="Editar perfil de menor" onClose={() => setEditId(null)} />
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ChildForm
              key={editing.id}
              initial={editing}
              allowSelfManageControl
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
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming')
  const all = [
    ...races.map((r) => ({ id: r.id, date: r.date, time: r.start_time, title: r.title, race: r })),
    ...events.map((e) => ({ id: e.id, date: e.date, time: e.time, title: e.title, event: e })),
  ]
  const upcoming = all.filter((i) => i.date >= today).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  const past = all.filter((i) => i.date < today).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
  const items = when === 'upcoming' ? upcoming : past

  return (
    <div className="space-y-4">
      <Segmented
        value={when}
        onChange={setWhen}
        options={[
          { value: 'upcoming', label: `Próximas (${upcoming.length})` },
          { value: 'past', label: `Passadas (${past.length})` },
        ]}
      />
      <p className="t-small text-[var(--text-3)]">Toca numa atividade para a abrir. O lápis edita provas, treinos e eventos.</p>
      {items.length === 0 && <p className="t-body text-[var(--text-3)]">Não há atividades {when === 'upcoming' ? 'agendadas' : 'passadas'}.</p>}
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
                  <span className="block t-body text-[var(--text-1)] line-clamp-2">{i.title}</span>
                  <span className="block t-small text-[var(--text-3)] truncate">
                    {formatShortDate(i.date)} · {i.time}
                    {race ? ` · ${KIND_SINGULAR[race.category]}` : event ? ` · ${EVENT_TYPE_LABELS[event.type].short}` : ''}
                  </span>
                </span>
              </button>
              <IconButton
                label={`Editar ${i.title}`}
                onClick={() => (race ? openCreateRace(race) : event && openCreateEvent(event.type, event))}
              >
                <Pencil className="w-4 h-4" aria-hidden="true" />
              </IconButton>
            </div>
          )
        })}
      </div>
    </div>
  )
}
