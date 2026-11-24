import React, { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, ClipboardCheck, Download, LogIn, Pencil, Plus, RefreshCw, Search, ShieldCheck, Ticket, Trophy, UserPlus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { AthleteProfile, RaceRegistration, TransportMode, YouthAthlete } from '../types'
import { BIB_STATUS_LABELS, EVENT_TYPE_LABELS, TRANSPORT_LABELS } from '../types'
import type { RegistrationBulkAction } from '../context/AppContext'
import { calculateAge, formatShortDate } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateEvent, openCreateRace } from '../utils/appEvents'
import { DataTable, type Column } from '../layout/DataTable'
import { CsvExportDialog, type CsvField } from '../components/CsvExportDialog'
import { useDesktopAdmin } from '../layout/useDesktopAdmin'
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

type Tab = 'panel' | 'athletes' | 'children' | 'regs' | 'agenda'

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
  const desktop = useDesktopAdmin()
  if (!isAdminView) return <Navigate to="/" replace />

  return (
    <div className={desktop ? 'px-2 pt-0 pb-12 space-y-5' : 'px-5 pb-28 space-y-5'}>
      <PageHeader
        bleed={desktop ? '-mx-2' : undefined}
        title="Gerir a equipa"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" /> Criar
          </Button>
        }
      />
      <div className={desktop ? 'max-w-[640px]' : undefined}>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'panel', label: 'Painel' },
          { value: 'athletes', label: 'Atletas' },
          { value: 'children', label: 'Crianças' },
          ...(desktop ? [{ value: 'regs' as Tab, label: 'Inscrições e dorsais' }] : []),
          { value: 'agenda', label: 'Agenda' },
        ]}
      />
      </div>
      {tab === 'panel' && <PanelTab onTab={setTab} />}
      {tab === 'athletes' && <AthletesTab />}
      {tab === 'children' && <ChildrenTab />}
      {tab === 'regs' && desktop && <RegistrationsTable />}
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
        <StatTile value={profiles.length} label="Atletas" tone="blue" onClick={() => onTab('athletes')} />
        <StatTile value={youthAthletes.length} label="Crianças" tone="yellow" onClick={() => onTab('children')} />
        <StatTile value={races.filter((r) => r.date >= today).length} label="Provas futuras" tone="green" onClick={() => onTab('agenda')} />
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
  const desktop = useDesktopAdmin()
  const [access, setAccess] = useState<'all' | 'login' | 'authorized' | 'blocked' | 'admin' | 'nodorsal'>('all')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const tableRows = useMemo(
    () =>
      list.filter((p) => {
        if (access === 'login') return Boolean(p.login_email)
        if (access === 'authorized') return !p.login_email && Boolean(p.login_authorized || p.role === 'admin')
        if (access === 'blocked') return !p.login_email && !p.login_authorized && p.role !== 'admin'
        if (access === 'admin') return p.role === 'admin'
        if (access === 'nodorsal') return !formatTrofeuDorsalTag(p)
        return true
      }),
    [list, access]
  )
  const openAthlete = openId ? profiles.find((p) => p.id === openId) || null : null
  const kidCount = (p: AthleteProfile) => youthAthletes.filter((c) => c.associated_adult_ids.includes(p.id)).length
  const athleteColumns: Column<AthleteProfile>[] = [
    { id: 'name', header: 'Nome', sortValue: (p) => p.name, render: (p) => (
        <span className="flex items-center gap-3">
          <Avatar name={p.name} photo={p.photo_url} gender={p.gender} size={32} />
          {p.name}
        </span>
      ),
    },
    { id: 'escalao', header: 'Escalão', sortValue: (p) => p.escalao, render: (p) => p.escalao },
    { id: 'age', header: 'Idade', sortValue: (p) => calculateAge(p.birth_date), render: (p) => <span className="t-num">{calculateAge(p.birth_date)}</span> },
    {
      id: 'dorsal',
      header: 'Dorsal Troféu',
      sortValue: (p) => formatTrofeuDorsalTag(p)?.label ?? '',
      render: (p) => {
        const t = formatTrofeuDorsalTag(p)
        return t ? (
          <Tag tone={t.current ? 'info' : 'neutral'}>{t.label}</Tag>
        ) : p.needs_admin_review ? (
          <Tag tone="warn">Sem dorsal</Tag>
        ) : (
          <span className="text-[var(--text-3)]">—</span>
        )
      },
    },
    {
      id: 'access',
      header: 'Acesso',
      sortValue: (p) => (p.login_email ? '1' : p.login_authorized || p.role === 'admin' ? '2' : '3'),
      render: (p) =>
        p.login_email ? <Tag tone="ok">Login ativo</Tag> : p.login_authorized || p.role === 'admin' ? <Tag tone="info">Autorizado</Tag> : <Tag>Sem login</Tag>,
    },
    { id: 'role', header: 'Perfil', sortValue: (p) => p.role, render: (p) => (p.role === 'admin' ? <Tag tone="warn">Admin</Tag> : 'Atleta') },
    { id: 'kids', header: 'Crianças', sortValue: kidCount, render: (p) => <span className="t-num">{kidCount(p)}</span> },
  ]

  const [csvOpen, setCsvOpen] = useState(false)
  const kidsNames = (p: AthleteProfile) =>
    youthAthletes.filter((c) => c.associated_adult_ids.includes(p.id)).map((c) => c.name).join(' & ')
  const accessText = (p: AthleteProfile) => (p.login_email ? 'Login ativo' : p.login_authorized || p.role === 'admin' ? 'Autorizado' : 'Sem login')
  const dorsaisText = (r?: Record<string, string>) =>
    Object.entries(r || {}).map(([season, d]) => `${season}: ${d}`).join(' | ')
  const yn = (v?: boolean) => (v ? 'Sim' : 'Não')
  const adultTableFields: CsvField<AthleteProfile>[] = [
    { id: 'name', label: 'Nome', get: (p) => p.name },
    { id: 'escalao', label: 'Escalão', get: (p) => p.escalao },
    { id: 'age', label: 'Idade', get: (p) => String(calculateAge(p.birth_date)) },
    { id: 'dorsal', label: 'Dorsal Troféu', get: (p) => formatTrofeuDorsalTag(p)?.label ?? '' },
    { id: 'access', label: 'Acesso', get: accessText },
    { id: 'role', label: 'Perfil', get: (p) => (p.role === 'admin' ? 'Admin' : 'Atleta') },
    { id: 'kids', label: 'Crianças', get: (p) => String(kidCount(p)) },
  ]
  const adultExtraFields: CsvField<AthleteProfile>[] = [
    { id: 'nickname', label: 'Alcunha', get: (p) => p.nickname },
    { id: 'email', label: 'Email', get: (p) => p.email },
    { id: 'phone', label: 'Telefone', get: (p) => p.phone },
    { id: 'gender', label: 'Género', get: (p) => p.gender ?? '' },
    { id: 'birth', label: 'Data de nascimento', get: (p) => p.birth_date },
    { id: 'nif', label: 'NIF', get: (p) => p.nif },
    { id: 'cc', label: 'Cartão de cidadão', get: (p) => p.cc_number },
    { id: 'member', label: 'Nº de sócio', get: (p) => p.club_member_number ?? '' },
    { id: 'fed', label: 'Nº de federado', get: (p) => p.federation_number ?? '' },
    { id: 'dorsais', label: 'Dorsais por época', get: (p) => dorsaisText(p.dorsais_trofeu) },
    { id: 'address', label: 'Morada', get: (p) => [p.address, p.postal_code, p.city].filter(Boolean).join(', ') },
    { id: 'emergency', label: 'Contacto de emergência', get: (p) => [p.emergency_name, p.emergency_relation, p.emergency_phone].filter(Boolean).join(' · ') },
    { id: 'shirt', label: 'T-shirt', get: (p) => p.shirt_size },
    { id: 'shorts', label: 'Calções', get: (p) => p.shorts_size ?? '' },
    { id: 'height', label: 'Altura (cm)', get: (p) => (p.height_cm ? String(p.height_cm) : '') },
    { id: 'weight', label: 'Peso (kg)', get: (p) => (p.weight_kg ? String(p.weight_kg) : '') },
    { id: 'blood', label: 'Grupo sanguíneo', get: (p) => p.blood_type ?? '' },
    { id: 'medical', label: 'Notas médicas', get: (p) => p.medical_notes ?? '' },
    { id: 'kit', label: 'Kit oficial', get: (p) => yn(p.has_official_kit) },
    { id: 'loginEmail', label: 'Email de login', get: (p) => p.login_email ?? '' },
    { id: 'loginProvider', label: 'Método de login', get: (p) => p.login_provider ?? '' },
    { id: 'kidNames', label: 'Nomes das crianças', get: kidsNames },
  ]

  const athleteDetail = (p: AthleteProfile, kids: YouthAthlete[], dorsalsSummary: string | null) => (
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
                          p.auth_user_id
                            ? 'ok'
                            : p.login_authorized || p.role === 'admin'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {p.auth_user_id
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
                    {(p.auth_user_id) && (
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
  )

  return (
    <div className="space-y-4">
      {csvOpen && (
        <CsvExportDialog<AthleteProfile>
          title="Exportar atletas para CSV"
          rows={picked.size ? tableRows.filter((p) => picked.has(p.id)) : desktop ? tableRows : list}
          filename="atletas-urcharneca"
          tableFields={adultTableFields}
          extraFields={adultExtraFields}
          rowLabel={(p) => p.name}
          onClose={() => setCsvOpen(false)}
          onDone={() => showToast('Lista exportada.')}
        />
      )}
      {desktop && (
        <>
          <div className="desk-toolbar">
            <div className="relative w-[320px] max-w-full">
              <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                data-search
                className="desk-field desk-field-icon w-full"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar nome, escalão, NIF  ( / )"
                aria-label="Pesquisar atletas"
              />
            </div>
            <select className="desk-field" aria-label="Filtrar por acesso" value={access} onChange={(e) => setAccess(e.target.value as typeof access)}>
              <option value="all">Todos os acessos</option>
              <option value="login">Login ativo</option>
              <option value="authorized">Autorizado</option>
              <option value="blocked">Sem login</option>
              <option value="admin">Administradores</option>
              <option value="nodorsal">Sem dorsal Troféu</option>
            </select>
            <span className="t-small text-[var(--text-3)] t-num" role="status">
              {tableRows.length} de {profiles.length}
            </span>
            <div className="flex-1" />
            <Button size="sm" variant="secondary" onClick={() => setCsvOpen(true)}>
              <Download className="w-4 h-4" aria-hidden="true" /> {picked.size ? `Exportar ${picked.size} selecionados` : 'Exportar CSV'}
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <UserPlus className="w-4 h-4" aria-hidden="true" /> Novo atleta
            </Button>
          </div>
          <DataTable
            rows={tableRows}
            columns={athleteColumns}
            rowKey={(p) => p.id}
            rowLabel={(p) => p.name}
            caption="Atletas da equipa"
            selectable
            selected={picked}
            onSelectedChange={setPicked}
            onRowOpen={(p) => setOpenId(p.id)}
            initialSort={{ id: 'name', dir: 'asc' }}
            empty="Nenhum atleta corresponde à pesquisa ou ao filtro."
          />
          {openAthlete && (
            <Sheet
              onClose={() => setOpenId(null)}
              variant="center"
              ariaLabel={`Ficha de ${openAthlete.name}`}
              panelClassName="!max-w-[560px] flex flex-col overflow-hidden"
            >
              <SheetHeader title={openAthlete.name} subtitle={openAthlete.escalao} onClose={() => setOpenId(null)} />
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {athleteDetail(
                  openAthlete,
                  youthAthletes.filter((c) => c.associated_adult_ids.includes(openAthlete.id)),
                  formatTrofeuDorsalsSummary(openAthlete.dorsais_trofeu)
                )}
              </div>
            </Sheet>
          )}
        </>
      )}
      {!desktop && (
      <>
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
        <IconButton label="Exportar lista em CSV" onClick={() => setCsvOpen(true)} className="!w-12 !h-12">
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
                <Avatar name={p.name} photo={p.photo_url} gender={p.gender} />
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
              {open && athleteDetail(p, kids, dorsalsSummary)}
            </div>
          )
        })}
      </div>
      </>
      )}

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
  const desktop = useDesktopAdmin()
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'all' | 'noguardian' | 'self' | 'nodorsal'>('all')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [csvOpen, setCsvOpen] = useState(false)
  const guardiansOf = (c: YouthAthlete) => c.associated_adult_ids.map((id) => profiles.find((p) => p.id === id)).filter((p): p is AthleteProfile => Boolean(p))
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return youthAthletes.filter((c) => {
      if (s && !c.name.toLowerCase().includes(s) && !c.escalao.toLowerCase().includes(s) && !guardiansOf(c).some((g) => g.name.toLowerCase().includes(s))) return false
      if (mode === 'noguardian') return !c.can_self_manage && c.associated_adult_ids.length === 0
      if (mode === 'self') return Boolean(c.can_self_manage)
      if (mode === 'nodorsal') return !formatTrofeuDorsalTag(c)
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youthAthletes, profiles, q, mode])
  const openChild = openId ? youthAthletes.find((c) => c.id === openId) || null : null
  const childColumns: Column<YouthAthlete>[] = [
    { id: 'name', header: 'Nome', sortValue: (c) => c.name, render: (c) => (
        <span className="flex items-center gap-3">
          <Avatar name={c.name} child photo={c.photo_url} gender={c.gender} size={32} />
          {c.name}
        </span>
      ),
    },
    { id: 'escalao', header: 'Escalão', sortValue: (c) => c.escalao, render: (c) => c.escalao },
    { id: 'age', header: 'Idade', sortValue: (c) => calculateAge(c.birth_date), render: (c) => <span className="t-num">{calculateAge(c.birth_date)}</span> },
    {
      id: 'dorsal',
      header: 'Dorsal Troféu',
      sortValue: (c) => formatTrofeuDorsalTag(c)?.label ?? '',
      render: (c) => {
        const t = formatTrofeuDorsalTag(c)
        return t ? (
          <Tag tone={t.current ? 'info' : 'neutral'}>{t.label}</Tag>
        ) : c.needs_admin_review ? (
          <Tag tone="warn">Sem dorsal</Tag>
        ) : (
          <span className="text-[var(--text-3)]">—</span>
        )
      },
    },
    {
      id: 'guardians',
      header: 'Responsáveis',
      sortValue: (c) => guardiansOf(c).map((g) => g.name).join(', '),
      render: (c) => {
        const g = guardiansOf(c)
        return g.length > 0 ? g.map((x) => x.name).join(' · ') : <span className="text-[var(--text-3)]">—</span>
      },
    },
    {
      id: 'mgmt',
      header: 'Gestão',
      sortValue: (c) => (c.can_self_manage ? '1' : guardiansOf(c).length > 0 ? '2' : '3'),
      render: (c) =>
        c.can_self_manage ? <Tag tone="ok">Login próprio</Tag> : guardiansOf(c).length > 0 ? <Tag tone="info">{guardiansOf(c).length}/2 adultos</Tag> : <Tag tone="danger">Sem responsável</Tag>,
    },
  ]


  const dorsaisText = (r?: Record<string, string>) =>
    Object.entries(r || {}).map(([season, d]) => `${season}: ${d}`).join(' | ')
  const childTableFields: CsvField<YouthAthlete>[] = [
    { id: 'name', label: 'Nome', get: (c) => c.name },
    { id: 'escalao', label: 'Escalão', get: (c) => c.escalao },
    { id: 'age', label: 'Idade', get: (c) => String(calculateAge(c.birth_date)) },
    { id: 'dorsal', label: 'Dorsal Troféu', get: (c) => formatTrofeuDorsalTag(c)?.label ?? '' },
    { id: 'guardians', label: 'Responsáveis', get: (c) => guardiansOf(c).map((g) => g.name).join(' & ') },
    {
      id: 'mgmt',
      label: 'Gestão',
      get: (c) => (c.can_self_manage ? 'Login próprio' : guardiansOf(c).length > 0 ? `${guardiansOf(c).length}/2 adultos` : 'Sem responsável'),
    },
  ]
  const childExtraFields: CsvField<YouthAthlete>[] = [
    { id: 'gender', label: 'Género', get: (c) => c.gender ?? '' },
    { id: 'birth', label: 'Data de nascimento', get: (c) => c.birth_date },
    { id: 'nif', label: 'NIF', get: (c) => c.nif },
    { id: 'cc', label: 'Cartão de cidadão', get: (c) => c.cc_number ?? '' },
    { id: 'shirt', label: 'T-shirt', get: (c) => c.shirt_size ?? '' },
    { id: 'email', label: 'Email', get: (c) => c.email ?? '' },
    { id: 'phone', label: 'Telefone', get: (c) => c.phone ?? '' },
    { id: 'loginEmail', label: 'Email de login', get: (c) => c.login_email ?? '' },
    { id: 'guardianEmails', label: 'Emails dos responsáveis', get: (c) => guardiansOf(c).map((g) => g.email).filter(Boolean).join(' | ') },
    { id: 'guardianPhones', label: 'Telefones dos responsáveis', get: (c) => guardiansOf(c).map((g) => g.phone).filter(Boolean).join(' | ') },
    { id: 'dorsais', label: 'Dorsais por época', get: (c) => dorsaisText(c.dorsais_trofeu) },
    { id: 'emergency', label: 'Notas de emergência', get: (c) => c.emergency_notes ?? '' },
    { id: 'medical', label: 'Notas médicas', get: (c) => c.medical_notes ?? '' },
  ]

  const childDetail = (c: YouthAthlete, guardians: AthleteProfile[], dorsalsSummary: string | null) => (
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
                    {c.can_self_manage && (c.auth_user_id) && (
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
  )

  return (
    <div className="space-y-4">
      {desktop && (
        <>
          <div className="desk-toolbar">
            <div className="relative w-[320px] max-w-full">
              <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                data-search
                className="desk-field desk-field-icon w-full"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar nome, escalão, responsável  ( / )"
                aria-label="Pesquisar crianças"
              />
            </div>
            <select className="desk-field" aria-label="Filtrar crianças" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="all">Todas</option>
              <option value="noguardian">Sem responsável</option>
              <option value="self">Login próprio</option>
              <option value="nodorsal">Sem dorsal Troféu</option>
            </select>
            <span className="t-small text-[var(--text-3)] t-num" role="status">
              {rows.length} de {youthAthletes.length}
            </span>
            <div className="flex-1" />
            <Button size="sm" variant="secondary" onClick={() => setCsvOpen(true)}>
              <Download className="w-4 h-4" aria-hidden="true" /> {picked.size ? `Exportar ${picked.size} selecionados` : 'Exportar CSV'}
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Novo menor
            </Button>
          </div>
          <DataTable
            rows={rows}
            columns={childColumns}
            rowKey={(c) => c.id}
            rowLabel={(c) => c.name}
            caption="Menores e jovens da equipa"
            selectable
            selected={picked}
            onSelectedChange={setPicked}
            onRowOpen={(c) => setOpenId(c.id)}
            initialSort={{ id: 'name', dir: 'asc' }}
            empty={youthAthletes.length === 0 ? 'Ainda não há perfis de menores.' : 'Nenhuma criança corresponde à pesquisa ou ao filtro.'}
          />
          {csvOpen && (
            <CsvExportDialog<YouthAthlete>
              title="Exportar crianças para CSV"
              rows={picked.size ? rows.filter((c) => picked.has(c.id)) : rows}
              filename="criancas-urcharneca"
              tableFields={childTableFields}
              extraFields={childExtraFields}
              rowLabel={(c) => c.name}
              onClose={() => setCsvOpen(false)}
              onDone={() => showToast('Lista exportada.')}
            />
          )}
          {openChild && (
            <Sheet
              onClose={() => setOpenId(null)}
              variant="center"
              ariaLabel={`Ficha de ${openChild.name}`}
              panelClassName="!max-w-[560px] flex flex-col overflow-hidden"
            >
              <SheetHeader title={openChild.name} subtitle={openChild.escalao} onClose={() => setOpenId(null)} />
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {childDetail(openChild, guardiansOf(openChild), formatTrofeuDorsalsSummary(openChild.dorsais_trofeu))}
              </div>
            </Sheet>
          )}
        </>
      )}
      {!desktop && (
      <>
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
                <Avatar name={c.name} child photo={c.photo_url} gender={c.gender} />
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
              {open && childDetail(c, guardians, dorsalsSummary)}
            </div>
          )
        })}
      </div>
      </>
      )}

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
/** Inscrições e dorsais em tabela (só desktop): filtros, seleção múltipla e ações em bloco por prova. */
const STATUS_LABEL: Record<RaceRegistration['status'], { label: string; tone: 'ok' | 'warn' | 'info' | 'neutral' }> = {
  interested: { label: 'Aguarda o clube', tone: 'warn' },
  enrolled_by_admin: { label: 'Inscrito', tone: 'ok' },
  self_enrolled: { label: 'Vai', tone: 'info' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

const RegistrationsTable: React.FC = () => {
  const { races, registrations, applyToRegistrations } = useApp()
  const navigate = useNavigate()
  const today = todayISO()
  const [q, setQ] = useState('')
  const [raceId, setRaceId] = useState('')
  const [status, setStatus] = useState<'all' | 'pending' | 'bib_pending' | 'bib_at_club' | 'bib_delivered'>('all')
  const [past, setPast] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const raceById = useMemo(() => new Map(races.map((r) => [r.id, r])), [races])
  const raceOptions = useMemo(
    () => races.filter((r) => (past ? r.date < today : r.date >= today) && r.category !== 'individual').sort((a, b) => a.date.localeCompare(b.date)),
    [races, past, today]
  )
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return registrations.filter((r) => {
      const race = raceById.get(r.race_id)
      if (!race || race.category === 'individual' || r.status === 'cancelled') return false
      if ((race.date < today) !== past) return false
      if (raceId && r.race_id !== raceId) return false
      if (s && !r.athlete_name.toLowerCase().includes(s) && !race.title.toLowerCase().includes(s) && !(r.bib_number || '').toLowerCase().includes(s)) return false
      if (status === 'pending') return r.status === 'interested'
      if (status === 'bib_pending') return r.bib_status === 'pending'
      if (status === 'bib_at_club') return r.bib_status === 'at_club'
      if (status === 'bib_delivered') return r.bib_status === 'delivered'
      return true
    })
  }, [registrations, raceById, q, raceId, status, past, today])

  const columns: Column<RaceRegistration>[] = [
    {
      id: 'athlete',
      header: 'Atleta',
      sortValue: (r) => r.athlete_name,
      render: (r) => (
        <>
          {r.athlete_name}
          {r.is_dependent && <span className="t-small text-[var(--text-3)] font-normal"> · criança</span>}
        </>
      ),
    },
    {
      id: 'race',
      header: 'Prova',
      sortValue: (r) => raceById.get(r.race_id)?.title ?? '',
      className: 'desk-wrap',
      render: (r) => {
        const race = raceById.get(r.race_id)
        return race ? (
          <a
            href={`${import.meta.env.BASE_URL}prova/${race.id}`}
            className="text-[var(--text-1)] underline underline-offset-2"
            onClick={(e) => {
              e.preventDefault()
              navigate(`/prova/${race.id}`)
            }}
          >
            {race.title}
          </a>
        ) : (
          '—'
        )
      },
    },
    { id: 'date', header: 'Data', sortValue: (r) => raceById.get(r.race_id)?.date ?? '', render: (r) => formatShortDate(raceById.get(r.race_id)?.date ?? '') },
    { id: 'distance', header: 'Distância', sortValue: (r) => r.distance, render: (r) => r.distance },
    { id: 'status', header: 'Estado', sortValue: (r) => STATUS_LABEL[r.status].label, render: (r) => <Tag tone={STATUS_LABEL[r.status].tone}>{STATUS_LABEL[r.status].label}</Tag> },
    {
      id: 'bib',
      header: 'Dorsal',
      sortValue: (r) => r.bib_status,
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <Tag tone={r.bib_status === 'delivered' ? 'ok' : r.bib_status === 'at_club' ? 'info' : 'warn'}>{BIB_STATUS_LABELS[r.bib_status].short}</Tag>
          {r.bib_number && <span className="t-num">#{r.bib_number}</span>}
        </span>
      ),
    },
    { id: 'transport', header: 'Transporte', sortValue: (r) => TRANSPORT_LABELS[r.transport_mode].short, render: (r) => TRANSPORT_LABELS[r.transport_mode].short },
  ]

  // As ações do contexto são por prova: agrupar a seleção.
  const run = (action: RegistrationBulkAction) => {
    const byRace = new Map<string, string[]>()
    for (const r of registrations) {
      if (!picked.has(r.id)) continue
      byRace.set(r.race_id, [...(byRace.get(r.race_id) ?? []), r.id])
    }
    byRace.forEach((ids, rid) => applyToRegistrations(rid, ids, action))
    setPicked(new Set())
  }

  return (
    <div className="space-y-4">
      <div className="desk-toolbar">
        <div className="relative w-[280px] max-w-full">
          <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            data-search
            className="desk-field desk-field-icon w-full"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Atleta, prova ou dorsal  ( / )"
            aria-label="Pesquisar inscrições"
          />
        </div>
        <select className="desk-field max-w-[260px]" aria-label="Filtrar por prova" value={raceId} onChange={(e) => setRaceId(e.target.value)}>
          <option value="">Todas as provas</option>
          {raceOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {formatShortDate(r.date)} — {r.title}
            </option>
          ))}
        </select>
        <select className="desk-field" aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">Todos os estados</option>
          <option value="pending">Por confirmar</option>
          <option value="bib_pending">Dorsal por levantar</option>
          <option value="bib_at_club">Dorsal no clube</option>
          <option value="bib_delivered">Dorsal entregue</option>
        </select>
        <label className="inline-flex items-center gap-2 t-small text-[var(--text-1)] min-h-8 cursor-pointer">
          <input
            type="checkbox"
            className="desk-check"
            checked={past}
            onChange={(e) => {
              setPast(e.target.checked)
              setRaceId('')
              setPicked(new Set())
            }}
          />
          Provas passadas
        </label>
        <span className="t-small text-[var(--text-3)] t-num" role="status">
          {rows.length} {rows.length === 1 ? 'inscrição' : 'inscrições'}
        </span>
      </div>

      {picked.size > 0 && (
        <div className="desk-bulkbar" role="region" aria-label="Ações sobre a seleção">
          <span className="t-small t-strong t-num">{picked.size} selecionadas</span>
          <Button size="sm" onClick={() => run('confirm')}>
            Confirmar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => run('bib_at_club')}>
            Dorsal no clube
          </Button>
          <Button size="sm" variant="secondary" onClick={() => run('bib_delivered')}>
            Dorsal entregue
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
            Limpar seleção
          </Button>
        </div>
      )}

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        rowLabel={(r) => `${r.athlete_name} em ${raceById.get(r.race_id)?.title ?? 'prova'}`}
        caption={past ? 'Inscrições em provas passadas' : 'Inscrições e dorsais das próximas provas'}
        selectable
        selected={picked}
        onSelectedChange={setPicked}
        initialSort={{ id: 'date', dir: 'asc' }}
        empty={
          <EmptyState icon={ClipboardCheck} title="Sem inscrições" text="Não há inscrições que correspondam aos filtros." />
        }
      />
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
