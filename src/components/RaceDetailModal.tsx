import React, { useMemo, useState } from 'react'
import {
  Bus,
  CalendarDays,
  Clock,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Megaphone,
  Pencil,
  Trash2,
  UserPlus,
  Baby,
  Ticket,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Race, RaceRegistration, TransportMode, YouthAthlete } from '../types'
import { BIB_STATUS_LABELS, CATEGORIA_LABELS, TRANSPORT_LABELS } from '../types'
import {
  computeVanAllocation,
  formatLongDate,
  formatShortDate,
  generateAdminInscriptionCSV,
  generateWhatsAppSummary,
} from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateNotice, openCreateRace } from '../utils/appEvents'
import { Sheet } from './Sheet'
import { Avatar, Button, Field, KindBadge, SectionTitle, SheetHeader, Tag, inputClass } from './ui'

interface Props {
  race: Race
  onClose: () => void
}

const STATUS_TAG: Record<RaceRegistration['status'], { label: string; tone: 'ok' | 'warn' | 'info' | 'neutral' }> = {
  interested: { label: 'Aguarda clube', tone: 'warn' },
  enrolled_by_admin: { label: 'Inscrito', tone: 'ok' },
  self_enrolled: { label: 'Vai', tone: 'info' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

const transportOptions = (race: Race): TransportMode[] => {
  const base: TransportMode[] = ['own_transport', 'meeting_point', 'carpool_offer', 'carpool_need']
  return race.van_available ? ['van_roundtrip', 'van_return_only', ...base] : base
}

/** Bottom-sheet com o detalhe de uma prova: informação, inscrição própria e das crianças, carrinha, inscritos e ferramentas de admin. Requer AppProvider. */
export const RaceDetailModal: React.FC<Props> = ({ race, onClose }) => {
  const {
    currentUser,
    profiles,
    youthAthletes,
    registrations,
    isAdminView,
    registerForRace,
    cancelRegistration,
    updateRegistrationByAdmin,
    confirmAllPendingForRace,
    markAllBibsAtClubForRace,
    deleteRace,
    showToast,
  } = useApp()

  const today = todayISO()
  const isPast = race.date < today
  const deadlinePassed = Boolean(race.registration_deadline && race.registration_deadline < today)
  // Admin pode sempre inscrever; atletas apenas até ao prazo e antes da prova
  const registrationOpen = isAdminView || (!isPast && !(race.category !== 'individual' && deadlinePassed))
  const canEditRace = isAdminView || race.created_by === currentUser.id

  const raceRegs = useMemo(
    () => registrations.filter((r) => r.race_id === race.id && r.status !== 'cancelled'),
    [registrations, race.id]
  )
  const myReg = raceRegs.find((r) => !r.is_dependent && r.athlete_id === currentUser.id)
  const myChildren = useMemo(
    () => youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id)),
    [youthAthletes, currentUser.id]
  )
  const van = useMemo(() => computeVanAllocation(race, raceRegs), [race, raceRegs])
  const pendingCount = raceRegs.filter((r) => r.status === 'interested').length
  const pendingBibs = raceRegs.filter((r) => r.bib_status === 'pending').length

  const childDistances = race.children_distances?.length ? race.children_distances : race.distances
  const defaultTransport: TransportMode = race.van_available ? 'van_roundtrip' : 'own_transport'

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(generateWhatsAppSummary(race, raceRegs))
      showToast('Resumo copiado para o WhatsApp.')
    } catch {
      showToast('Não foi possível copiar.', 'warning')
    }
  }

  const handleDownloadCSV = () => {
    const csv = generateAdminInscriptionCSV(race, raceRegs, profiles)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inscricoes-${race.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = () => {
    if (window.confirm(`Remover "${race.title}" e todas as inscrições?`)) {
      deleteRace(race.id)
      onClose()
    }
  }

  // Inscritos agrupados por distância
  const byDistance = useMemo(() => {
    const map = new Map<string, RaceRegistration[]>()
    for (const r of raceRegs) {
      const list = map.get(r.distance) || []
      list.push(r)
      map.set(r.distance, list)
    }
    return [...map.entries()]
  }, [raceRegs])

  return (
    <Sheet onClose={onClose} ariaLabel={race.title}>
      <SheetHeader title={race.title} onClose={onClose}>
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <KindBadge kind={race.category} />
          {race.open_to_children && (
            <Tag tone="warn">
              <Baby className="w-3 h-3" /> Crianças
            </Tag>
          )}
          {race.van_available && (
            <Tag tone="info">
              <Bus className="w-3 h-3" /> Carrinha
            </Tag>
          )}
          {isPast && <Tag>Realizada</Tag>}
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Informação */}
        <section className="space-y-2 text-sm text-[var(--text-2)]">
          <p className="flex items-center gap-2 capitalize">
            <CalendarDays className="w-4 h-4 text-[var(--run)] shrink-0" />
            {formatLongDate(race.date)}
            <span className="normal-case text-[var(--text-3)]">· {race.start_time}</span>
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[var(--run)] shrink-0 mt-0.5" />
            {race.location}
          </p>
          {race.meeting_point && (
            <p className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-[var(--run)] shrink-0 mt-0.5" />
              <span>
                Encontro{race.meeting_time ? ` às ${race.meeting_time}` : ''}: {race.meeting_point}
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {race.distances.map((d) => (
              <Tag key={d}>{d}</Tag>
            ))}
            {race.open_to_children &&
              race.children_distances?.map((d) => (
                <Tag key={d} tone="warn">
                  {d}
                </Tag>
              ))}
          </div>
          {race.registration_deadline && (
            <p className={`text-xs font-semibold ${deadlinePassed ? 'text-[var(--tint-rose-fg)]' : 'text-[var(--tint-amber-fg)]'}`}>
              {deadlinePassed ? 'Prazo de inscrição terminou a ' : 'Inscrições até '}
              {formatShortDate(race.registration_deadline)}
            </p>
          )}
          {race.description && <p className="text-xs leading-relaxed text-[var(--text-3)]">{race.description}</p>}
          <p className="text-[11px] text-[var(--text-muted)]">{CATEGORIA_LABELS[race.category].desc}</p>
          {race.bib_pickup_info && (
            <p className="text-xs flex items-start gap-2">
              <Ticket className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--text-3)]" />
              {race.bib_pickup_info}
            </p>
          )}
          {race.external_url && (
            <a
              href={race.external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--run)]"
            >
              Site oficial <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {race.category === 'individual' && (
            <p className="text-[11px] text-[var(--text-muted)]">Sugerida por {race.created_by_name}</p>
          )}
        </section>

        {/* A minha inscrição */}
        <section className="space-y-2.5">
          <SectionTitle title={race.category === 'individual' ? 'A minha presença' : 'A minha inscrição'} />
          {!registrationOpen && !myReg && (
            <p className="text-xs text-[var(--text-3)]">{isPast ? 'Esta prova já se realizou.' : 'As inscrições estão fechadas.'}</p>
          )}
          {(registrationOpen || myReg) && (
            <RegistrationRow
              race={race}
              name={currentUser.name}
              existing={myReg}
              distances={race.distances}
              defaultTransport={defaultTransport}
              locked={!registrationOpen}
              onSubmit={(distance, transport, seats) =>
                registerForRace({
                  race_id: race.id,
                  athlete_id: currentUser.id,
                  athlete_name: currentUser.name,
                  is_dependent: false,
                  escalao: currentUser.escalao,
                  distance,
                  transport_mode: transport,
                  carpool_seats: seats,
                })
              }
              onCancel={myReg ? () => cancelRegistration(myReg.id) : undefined}
            />
          )}

          {myChildren.length > 0 &&
            (race.open_to_children ? (
              myChildren.map((child) => {
                const reg = raceRegs.find((r) => r.is_dependent && r.dependent_id === child.id)
                if (!registrationOpen && !reg) return null
                return (
                  <RegistrationRow
                    key={child.id}
                    race={race}
                    name={child.name}
                    child
                    existing={reg}
                    distances={childDistances}
                    defaultTransport={myReg?.transport_mode || defaultTransport}
                    locked={!registrationOpen}
                    onSubmit={(distance, transport) => registerChild(child, distance, transport)}
                    onCancel={reg ? () => cancelRegistration(reg.id) : undefined}
                  />
                )
              })
            ) : (
              <p className="text-[11px] text-[var(--text-3)]">Esta prova não está aberta a crianças.</p>
            ))}
        </section>

        {/* Carrinha */}
        {race.van_available && (
          <section className="space-y-2.5">
            <SectionTitle title="Carrinha do clube" />
            <div className="iron-card p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-2)]">
                  Saída {race.van_departure_time || 'a definir'}
                  {race.van_departure_location ? ` · ${race.van_departure_location}` : ''}
                </span>
                <strong className="text-[var(--text-1)]">
                  {van.confirmedPassengers.length}/{van.capacity}
                </strong>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-raised)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--run)]"
                  style={{ width: `${Math.min(100, (van.confirmedPassengers.length / Math.max(1, van.capacity)) * 100)}%` }}
                />
              </div>
              {van.confirmedPassengers.length > 0 && (
                <p className="text-xs text-[var(--text-2)]">
                  {van.confirmedPassengers
                    .map((p) => `${p.athlete_name}${p.transport_mode === 'van_return_only' ? ' (só volta)' : ''}`)
                    .join(', ')}
                </p>
              )}
              {van.waitlistPassengers.length > 0 && (
                <p className="text-xs text-[var(--tint-amber-fg)]">
                  Lista de espera: {van.waitlistPassengers.map((p) => p.athlete_name).join(', ')}
                </p>
              )}
              <p className="text-[11px] text-[var(--text-3)]">
                {van.availableSeats > 0 ? `${van.availableSeats} lugar(es) livre(s).` : 'Carrinha cheia — novos pedidos ficam em lista de espera.'}
              </p>
            </div>
          </section>
        )}

        {(van.carpoolOffers.length > 0 || van.carpoolNeeds.length > 0) && (
          <section className="space-y-1.5 text-xs text-[var(--text-2)]">
            <SectionTitle title="Boleias entre colegas" />
            {van.carpoolOffers.length > 0 && (
              <p>
                Oferecem boleia:{' '}
                {van.carpoolOffers.map((r) => `${r.athlete_name}${r.carpool_seats ? ` (${r.carpool_seats})` : ''}`).join(', ')}
              </p>
            )}
            {van.carpoolNeeds.length > 0 && <p>Precisam de boleia: {van.carpoolNeeds.map((r) => r.athlete_name).join(', ')}</p>}
          </section>
        )}

        {/* Inscritos */}
        <section className="space-y-2.5">
          <SectionTitle title="Inscritos" count={raceRegs.length} />
          {raceRegs.length === 0 && <p className="text-xs text-[var(--text-3)]">Ainda ninguém se inscreveu.</p>}
          {byDistance.map(([dist, list]) => (
            <div key={dist} className="space-y-1.5">
              <div className="text-[11px] font-bold text-[var(--text-3)]">
                {dist} · {list.length}
              </div>
              {list.map((r) => (
                <RosterRow
                  key={r.id}
                  reg={r}
                  admin={isAdminView && race.category !== 'individual'}
                  canRemove={isAdminView}
                  onPatch={(patch) => updateRegistrationByAdmin(r.id, patch)}
                  onRemove={() => cancelRegistration(r.id)}
                />
              ))}
            </div>
          ))}
        </section>

        {/* Administração */}
        {isAdminView && (
          <section className="space-y-3">
            <SectionTitle title="Administração" />
            <AdminEnroll race={race} raceRegs={raceRegs} />
            <div className="grid grid-cols-2 gap-2">
              {race.category !== 'individual' && (
                <Button variant="secondary" size="sm" disabled={pendingCount === 0} onClick={() => confirmAllPendingForRace(race.id)}>
                  Confirmar pendentes ({pendingCount})
                </Button>
              )}
              {race.category !== 'individual' && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pendingBibs === 0}
                  onClick={() => markAllBibsAtClubForRace(race.id, currentUser.name)}
                >
                  Dorsais no clube ({pendingBibs})
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={handleCopyWhatsApp}>
                <Copy className="w-3.5 h-3.5" /> Resumo WhatsApp
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownloadCSV}>
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openCreateNotice(race.id)}>
                <Megaphone className="w-3.5 h-3.5" /> Comunicado
              </Button>
            </div>
          </section>
        )}

        {canEditRace && (
          <div className="flex gap-2 pt-2 border-t border-[var(--border-card)]">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => {
                onClose()
                openCreateRace(race)
              }}
            >
              <Pencil className="w-3.5 h-3.5" /> Editar prova
            </Button>
            <Button variant="danger" size="sm" className="flex-1" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )

  function registerChild(child: YouthAthlete, distance: string, transport: TransportMode) {
    registerForRace({
      race_id: race.id,
      athlete_id: currentUser.id,
      athlete_name: child.name,
      is_dependent: true,
      dependent_id: child.id,
      parent_name: currentUser.name,
      escalao: child.escalao,
      distance,
      transport_mode: transport,
    })
  }
}

// ---------------------------------------------------------------------------
// Linha de inscrição (adulto ou criança)
// ---------------------------------------------------------------------------
const RegistrationRow: React.FC<{
  race: Race
  name: string
  child?: boolean
  existing?: RaceRegistration
  distances: string[]
  defaultTransport: TransportMode
  locked?: boolean
  onSubmit: (distance: string, transport: TransportMode, carpoolSeats?: number) => void
  onCancel?: () => void
}> = ({ race, name, child, existing, distances, defaultTransport, locked, onSubmit, onCancel }) => {
  const [editingState, setEditing] = useState(false)
  const editing = editingState || !existing
  const [distance, setDistance] = useState(existing?.distance || distances[0] || '')
  const [transport, setTransport] = useState<TransportMode>(existing?.transport_mode || defaultTransport)
  const [seats, setSeats] = useState(existing?.carpool_seats || 3)

  const isIndividual = race.category === 'individual'

  return (
    <div className="iron-card p-3.5 space-y-3">
      <div className="flex items-center gap-2.5">
        <Avatar name={name} child={child} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[var(--text-1)] truncate">
            {name} {child && <span className="text-[10px] font-semibold text-[var(--tint-amber-fg)]">· criança</span>}
          </div>
          {existing && !editing && (
            <div className="text-[11px] text-[var(--text-3)] truncate">
              {existing.distance} · {TRANSPORT_LABELS[existing.transport_mode].short}
            </div>
          )}
        </div>
        {existing && <Tag tone={STATUS_TAG[existing.status].tone}>{STATUS_TAG[existing.status].label}</Tag>}
      </div>

      {editing && !locked ? (
        <div className="space-y-2.5">
          {distances.length > 1 && (
            <Field label="Distância">
              <select className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value)}>
                {distances.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Transporte">
            <select className={inputClass} value={transport} onChange={(e) => setTransport(e.target.value as TransportMode)}>
              {transportOptions(race).map((t) => (
                <option key={t} value={t}>
                  {TRANSPORT_LABELS[t].label}
                </option>
              ))}
            </select>
          </Field>
          {transport === 'carpool_offer' && !child && (
            <Field label="Lugares livres no carro">
              <input type="number" min={1} max={8} className={inputClass} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
            </Field>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                onSubmit(distance || distances[0], transport, transport === 'carpool_offer' ? seats : undefined)
                setEditing(false)
              }}
            >
              {existing ? 'Guardar' : isIndividual ? 'Vou participar' : child ? `Inscrever ${name.split(' ')[0]}` : 'Pedir inscrição'}
            </Button>
            {existing && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </div>
          {!existing && !isIndividual && (
            <p className="text-[11px] text-[var(--text-3)]">O pedido fica pendente até o clube confirmar a inscrição.</p>
          )}
        </div>
      ) : (
        existing &&
        !locked && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditing(true)}>
              Alterar
            </Button>
            {onCancel && (
              <Button size="sm" variant="danger" onClick={onCancel}>
                Cancelar inscrição
              </Button>
            )}
          </div>
        )
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Linha da lista de inscritos (com controlos de admin)
// ---------------------------------------------------------------------------
const RosterRow: React.FC<{
  reg: RaceRegistration
  admin: boolean
  canRemove: boolean
  onPatch: (patch: Partial<RaceRegistration>) => void
  onRemove: () => void
}> = ({ reg, admin, canRemove, onPatch, onRemove }) => {
  const [open, setOpen] = useState(false)
  const [bib, setBib] = useState(reg.bib_number || '')
  return (
    <div className="rounded-xl bg-[var(--surface-raised)] border border-[var(--border-card)] px-3 py-2">
      <button
        type="button"
        className="w-full flex items-center gap-2.5 text-left cursor-pointer disabled:cursor-default"
        disabled={!admin && !canRemove}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={reg.athlete_name} child={reg.is_dependent} size={28} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-[var(--text-1)] truncate">{reg.athlete_name}</div>
          <div className="text-[10px] text-[var(--text-3)] truncate">
            {reg.is_dependent && reg.parent_name ? `Resp. ${reg.parent_name} · ` : ''}
            {TRANSPORT_LABELS[reg.transport_mode].short}
            {reg.bib_number ? ` · #${reg.bib_number}` : ''}
          </div>
        </div>
        <Tag tone={STATUS_TAG[reg.status].tone}>{STATUS_TAG[reg.status].label}</Tag>
      </button>
      {open && (admin || canRemove) && (
        <div className="pt-2.5 mt-2 border-t border-[var(--border-card)] space-y-2">
          {admin && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Estado">
                  <select
                    className={inputClass}
                    value={reg.status}
                    onChange={(e) => onPatch({ status: e.target.value as RaceRegistration['status'] })}
                  >
                    <option value="interested">Aguarda clube</option>
                    <option value="enrolled_by_admin">Inscrito</option>
                  </select>
                </Field>
                <Field label="Dorsal">
                  <select
                    className={inputClass}
                    value={reg.bib_status}
                    onChange={(e) => onPatch({ bib_status: e.target.value as RaceRegistration['bib_status'] })}
                  >
                    {Object.entries(BIB_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.short}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="Nº dorsal"
                  value={bib}
                  onChange={(e) => setBib(e.target.value)}
                  onBlur={() => bib !== (reg.bib_number || '') && onPatch({ bib_number: bib.trim() || undefined })}
                />
              </div>
            </>
          )}
          {canRemove && (
            <Button size="sm" variant="danger" block onClick={onRemove}>
              Remover inscrição
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Admin: inscrever qualquer atleta ou criança
// ---------------------------------------------------------------------------
const AdminEnroll: React.FC<{ race: Race; raceRegs: RaceRegistration[] }> = ({ race, raceRegs }) => {
  const { profiles, youthAthletes, registerForRace } = useApp()
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState('')
  const [distance, setDistance] = useState(race.distances[0] || '')
  const [transport, setTransport] = useState<TransportMode>(race.van_available ? 'van_roundtrip' : 'own_transport')

  const adultsAvailable = profiles.filter((p) => !raceRegs.some((r) => !r.is_dependent && r.athlete_id === p.id))
  const childrenAvailable = race.open_to_children
    ? youthAthletes.filter((c) => c.associated_adult_ids.length > 0 && !raceRegs.some((r) => r.dependent_id === c.id))
    : []
  const isChild = who.startsWith('c:')
  const distances = isChild && race.children_distances?.length ? race.children_distances : race.distances

  const submit = () => {
    if (!who) return
    if (isChild) {
      const child = youthAthletes.find((c) => c.id === who.slice(2))
      const guardian = profiles.find((p) => p.id === child?.associated_adult_ids[0])
      if (!child || !guardian) return
      registerForRace({
        race_id: race.id,
        athlete_id: guardian.id,
        athlete_name: child.name,
        is_dependent: true,
        dependent_id: child.id,
        parent_name: guardian.name,
        escalao: child.escalao,
        distance: distances.includes(distance) ? distance : distances[0],
        transport_mode: transport,
      })
    } else {
      const p = profiles.find((x) => x.id === who.slice(2))
      if (!p) return
      registerForRace({
        race_id: race.id,
        athlete_id: p.id,
        athlete_name: p.name,
        is_dependent: false,
        escalao: p.escalao,
        distance: distances.includes(distance) ? distance : distances[0],
        transport_mode: transport,
      })
    }
    setWho('')
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" block onClick={() => setOpen(true)}>
        <UserPlus className="w-3.5 h-3.5" /> Inscrever atleta
      </Button>
    )
  }

  return (
    <div className="iron-card p-3.5 space-y-2.5">
      <Field label="Atleta">
        <select className={inputClass} value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">Escolher…</option>
          <optgroup label="Adultos">
            {adultsAvailable.map((p) => (
              <option key={p.id} value={`a:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
          {childrenAvailable.length > 0 && (
            <optgroup label="Crianças">
              {childrenAvailable.map((c) => (
                <option key={c.id} value={`c:${c.id}`}>
                  {c.name} ({c.escalao})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Distância">
          <select className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value)}>
            {distances.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Transporte">
          <select className={inputClass} value={transport} onChange={(e) => setTransport(e.target.value as TransportMode)}>
            {transportOptions(race).map((t) => (
              <option key={t} value={t}>
                {TRANSPORT_LABELS[t].short}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled={!who} onClick={submit}>
          Inscrever
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Fechar
        </Button>
      </div>
    </div>
  )
}
