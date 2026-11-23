import React, { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Baby,
  Bus,
  CalendarDays,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Hourglass,
  MapPin,
  Megaphone,
  Pencil,
  RefreshCw,
  Route,
  Share,
  Ticket,
  Trash2,
  Trophy,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { RegistrationBulkAction } from '../context/AppContext'
import type { Race, RaceRegistration, RaceVehicle, TransportMode, YouthAthlete } from '../types'
import { BIB_STATUS_LABELS, CATEGORIA_LABELS, TRANSPORT_LABELS } from '../types'
import {
  computeVanAllocation,
  formatLongDate,
  formatShortDate,
  generateAdminInscriptionCSV,
  generateWhatsAppSummary,
  getRaceVehicles,
} from '../utils/formatters'
import type { VehicleAllocation } from '../utils/formatters'
import { todayISO } from '../utils/dates'
import { openCreateNotice, openCreateRace } from '../utils/appEvents'
import { ActivityCover } from './ActivityCover'
import { countdownLabel } from './ActivityItems'
import { RaceVehiclesEditor, createEmptyVehicle, normalizeRaceVehiclesInput } from './RaceVehiclesEditor'
import { Sheet } from './Sheet'
import { ContextualHint } from './OnboardingCards'
import { useDesktopAdmin } from '../layout/useDesktopAdmin'
import { Avatar, Button, Chip, Field, IconButton, KindBadge, SectionTitle, SheetHeader, StickyActionBar, Tag, inputClass } from './ui'

const STATUS_TAG: Record<RaceRegistration['status'], { label: string; tone: 'ok' | 'warn' | 'info' | 'neutral' }> = {
  interested: { label: 'Aguarda o clube', tone: 'warn' },
  enrolled_by_admin: { label: 'Inscrito', tone: 'ok' },
  self_enrolled: { label: 'Vai', tone: 'info' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
}

/** O que cada opção de transporte significa, mostrado por baixo do seletor. */
const TRANSPORT_HELP: Record<TransportMode, string> = {
  van_roundtrip: 'Vais e voltas na carrinha do clube. Os lugares são dados por ordem de inscrição; os restantes ficam em lista de espera.',
  van_return_only: 'Vais por ti e voltas na carrinha do clube (ocupa um lugar).',
  own_transport: 'Tratas tu do transporte: não ocupas lugar na carrinha.',
  meeting_point: 'Encontras a equipa no ponto de encontro da prova, à hora combinada.',
  carpool_offer: 'Vais de carro e levas colegas: indica os lugares livres.',
  carpool_need: 'Precisas de boleia de um colega: aparece na lista de quem pede boleia.',
}

const STATUS_HELP: Partial<Record<RaceRegistration['status'], string>> = {
  interested: 'O pedido foi enviado. O clube trata da inscrição, confirma e avisa nos Comunicados.',
  enrolled_by_admin: 'O clube já inscreveu. Se não puderes ir, cancela para libertar o lugar.',
}

const transportOptions = (race: Race): TransportMode[] => {
  const base: TransportMode[] = ['own_transport', 'meeting_point', 'carpool_offer', 'carpool_need']
  return race.van_available ? ['van_roundtrip', 'van_return_only', ...base] : base
}

/** Linha de facto com ícone (data, local, encontro, ...). */
export const FactRow: React.FC<{ icon: LucideIcon; title: React.ReactNode; detail?: React.ReactNode }> = ({ icon: Icon, title, detail }) => (
  <div className="flex items-start gap-4 py-3">
    <Icon className="w-6 h-6 text-[var(--text-1)] shrink-0 mt-0.5" strokeWidth={1.8} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <div className="t-body text-[var(--text-1)]">{title}</div>
      {detail && <div className="t-small text-[var(--text-3)]">{detail}</div>}
    </div>
  </div>
)

/** Partilha um link (Web Share quando existe; senão copia para a área de transferência). */
export const shareLink = async (title: string, path: string, notify: (msg: string, type?: 'success' | 'info' | 'warning') => void) => {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}${path}`
  try {
    if (navigator.share) {
      await navigator.share({ title, url })
    } else {
      await navigator.clipboard.writeText(url)
      notify('Link copiado.')
    }
  } catch {
    // partilha cancelada pelo utilizador: nada a fazer
  }
}

/**
 * Detalhe de uma prova em página inteira: capa, informação, carrinha, inscritos, ferramentas de admin
 * e barra de ação fixa com o botão de inscrição (o próprio e as crianças a cargo). Requer AppProvider.
 */
export const RaceDetail: React.FC<{ race: Race; onBack: () => void; onOpenTrofeu?: () => void }> = ({
  race,
  onBack,
  onOpenTrofeu,
}) => {
  const {
    currentUser,
    profiles,
    youthAthletes,
    registrations,
    isAdminView,
    isSyncingTrofeu,
    checkRaceDocumentsNow,
    registerForRace,
    cancelRegistration,
    updateRegistrationByAdmin,
    confirmAllPendingForRace,
    markAllBibsAtClubForRace,
    applyToRegistrations,
    updateRace,
    deleteRace,
    showToast,
  } = useApp()
  const desktop = useDesktopAdmin()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [vehiclesSheetOpen, setVehiclesSheetOpen] = useState(false)
  const [vanAvailDraft, setVanAvailDraft] = useState(race.van_available)
  const [vanDepDraft, setVanDepDraft] = useState(race.van_departure_time || '08:00')
  const [vanLocDraft, setVanLocDraft] = useState(race.van_departure_location || 'Sociedade U.R. Charneca')
  const [vehiclesDraft, setVehiclesDraft] = useState<RaceVehicle[]>(() => getRaceVehicles(race))
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const openVehiclesSheet = () => {
    const existingVehicles = getRaceVehicles(race)
    setVanAvailDraft(race.van_available)
    setVanDepDraft(race.van_departure_time || '08:00')
    setVanLocDraft(race.van_departure_location || 'Sociedade U.R. Charneca')
    setVehiclesDraft(existingVehicles.length > 0 ? existingVehicles : [])
    setVehiclesSheetOpen(true)
  }

  const saveVehiclesConfig = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = vanAvailDraft
      ? normalizeRaceVehiclesInput(vehiclesDraft.length > 0 ? vehiclesDraft : [createEmptyVehicle(0)])
      : []
    const totalSeats = cleaned.reduce((sum, v) => sum + v.seats, 0)
    updateRace({
      ...race,
      van_available: cleaned.length > 0,
      van_capacity: totalSeats,
      vehicles: cleaned,
      van_departure_time: cleaned.length > 0 ? vanDepDraft : race.van_departure_time,
      van_departure_location: cleaned.length > 0 ? vanLocDraft.trim() : race.van_departure_location,
    })
    setVehiclesSheetOpen(false)
  }

  const today = todayISO()
  const isPast = race.date < today
  const deadlinePassed = Boolean(race.registration_deadline && race.registration_deadline < today)
  // Admin pode sempre inscrever; atletas apenas até ao prazo e antes da prova
  const registrationOpen = isAdminView || (!isPast && !(race.category !== 'individual' && deadlinePassed))
  const canEditRace = isAdminView || race.created_by === currentUser.id
  const isIndividual = race.category === 'individual'

  const raceRegs = useMemo(
    () => registrations.filter((r) => r.race_id === race.id && r.status !== 'cancelled'),
    [registrations, race.id]
  )
  const myReg = raceRegs.find(
    (r) =>
      (!r.is_dependent && r.athlete_id === currentUser.id) ||
      (Boolean(currentUser.is_minor_account) && r.dependent_id === currentUser.id)
  )
  const myChildren = useMemo(
    () => (currentUser.is_minor_account ? [] : youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id))),
    [youthAthletes, currentUser.id, currentUser.is_minor_account]
  )
  const myChildRegs = raceRegs.filter((r) => r.is_dependent && myChildren.some((c) => c.id === r.dependent_id))
  const myRegs = [...(myReg ? [myReg] : []), ...myChildRegs]
  const van = useMemo(() => computeVanAllocation(race, raceRegs), [race, raceRegs])
  const pendingCount = raceRegs.filter((r) => r.status === 'interested').length
  const pendingBibs = raceRegs.filter((r) => r.bib_status === 'pending').length

  const canManage = isAdminView && !isIndividual
  const selectedRegs = raceRegs.filter((r) => selected.has(r.id))
  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const runOnSelected = (action: RegistrationBulkAction) => {
    applyToRegistrations(race.id, [...selected], action)
    setSelected(new Set())
  }
  const eligibleConfirm = selectedRegs.filter((r) => r.status === 'interested').length
  const eligibleAtClub = selectedRegs.filter((r) => r.bib_status === 'pending').length
  const eligibleDelivered = selectedRegs.filter((r) => r.bib_status !== 'delivered').length

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
      onBack()
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

  const registerChild = (child: YouthAthlete, distance: string, transport: TransportMode, vehicleId?: string) =>
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
      vehicle_id: vehicleId,
    })

  const countdown = countdownLabel(race.date)
  const canRegisterSomeone = registrationOpen || myRegs.length > 0
  const ctaLabel = myRegs.length > 0 ? (registrationOpen ? 'Gerir inscrição' : 'Ver inscrição') : isIndividual ? 'Vou participar' : 'Inscrever'

  return (
    <div className={desktop ? 'desk-detail' : 'pb-28 w-full max-w-[480px] mx-auto'}>
      <ActivityCover
        kind={race.category}
        seed={race.id}
        imageUrl={race.image_url}
        alt=""
        className={desktop ? 'w-full h-[200px] rounded-2xl overflow-hidden' : 'w-full aspect-[4/3]'}
      >
        <div className="absolute top-3 inset-x-4 flex items-center justify-between">
          <IconButton label="Voltar" floating onClick={onBack}>
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </IconButton>
          <IconButton label="Partilhar" floating onClick={() => shareLink(race.title, `prova/${race.id}`, showToast)}>
            <Share className="w-5 h-5" aria-hidden="true" />
          </IconButton>
        </div>
      </ActivityCover>

      <div className={desktop ? 'desk-detail-grid' : 'px-5'}>
       <div className={`desk-detail-col divide-soft${desktop ? ' pt-2' : ''}`}>
        {/* Título */}
        <header className="py-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <KindBadge kind={race.category} />
            {race.open_to_children && (
              <Tag tone="warn">
                <Baby className="w-3.5 h-3.5" aria-hidden="true" /> Aberta a crianças
              </Tag>
            )}
            {isPast && <Tag>Realizada</Tag>}
          </div>
          <h1 className="t-title text-[var(--text-1)]">{race.title}</h1>
          <p className="t-body text-[var(--text-3)]">
            {race.location}
            {countdown && <span className="text-[var(--text-1)] t-strong"> · {countdown}</span>}
          </p>
        </header>

        {/* Factos */}
        <section className="py-3" aria-label="Informação da prova">
          <FactRow icon={CalendarDays} title={<span className="first-letter:uppercase inline-block">{formatLongDate(race.date)}</span>} detail={`Partida às ${race.start_time}`} />
          <FactRow icon={MapPin} title={race.location} />
          {race.meeting_point && (
            <FactRow icon={Clock} title={`Encontro${race.meeting_time ? ` às ${race.meeting_time}` : ''}`} detail={race.meeting_point} />
          )}
          {race.distances.length > 0 && (
            <FactRow
              icon={Route}
              title={race.distances.join(' · ')}
              detail={race.open_to_children && race.children_distances?.length ? `Crianças: ${race.children_distances.join(' · ')}` : undefined}
            />
          )}
          {race.registration_deadline && (
            <FactRow
              icon={Hourglass}
              title={deadlinePassed ? 'Inscrições fechadas' : `Inscrições até ${formatShortDate(race.registration_deadline)}`}
              detail={deadlinePassed ? `O prazo terminou a ${formatShortDate(race.registration_deadline)}` : undefined}
            />
          )}
          {race.bib_pickup_info && <FactRow icon={Ticket} title="Dorsais" detail={race.bib_pickup_info} />}
        </section>

        {/* Sobre */}
        <section className="py-6 space-y-3">
          <h2 className="t-heading text-[var(--text-1)]">Sobre a prova</h2>
          {race.description && <p className="t-body text-[var(--text-2)] whitespace-pre-line">{race.description}</p>}
          <p className="t-small text-[var(--text-3)]">{CATEGORIA_LABELS[race.category].desc}</p>
          {isIndividual && <p className="t-small text-[var(--text-3)]">Proposta por {race.created_by_name}</p>}
          {race.external_url && (
            <a
              href={race.external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 min-h-11 t-body t-strong text-[var(--text-1)] underline underline-offset-2"
            >
              Site oficial da prova <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          )}
        </section>

        {/* Documentação oficial & Croqui (Troféu de Cascais) */}
        {(race.category === 'trofeu_cascais' || Boolean(race.documents?.length)) && (
          <section className="py-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="t-heading text-[var(--text-1)]">Documentação oficial & Croqui</h2>
              {race.documents?.some((d) => d.type === 'croqui') ? (
                <Tag tone="ok">Croqui disponível</Tag>
              ) : (
                <Tag tone="warn">Aguarda croqui</Tag>
              )}
            </div>

            {race.documents && race.documents.length > 0 ? (
              <div className="space-y-2">
                {race.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="card p-3.5 flex items-center justify-between gap-3 pressable"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-[var(--run)] shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block t-body text-[var(--text-1)] truncate">{doc.title}</span>
                        <span className="block t-small text-[var(--text-3)]">
                          Detetado a {new Date(doc.detected_at).toLocaleDateString('pt-PT')}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {doc.is_new && <Tag tone="ok">Novo</Tag>}
                      <ExternalLink className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="t-small text-[var(--text-3)]">
                Ainda não foi publicada documentação adicional para esta etapa.
              </p>
            )}

            <div className="rounded-xl bg-[var(--surface-raised)] p-3.5 space-y-2">
              <div className="t-small text-[var(--text-2)]">
                {isPast
                  ? 'Prova concluída — arquivo documental sincronizado.'
                  : 'Verificação automática 2x/semana ativa até à data da prova (procura croquis e regulamentos).'}
              </div>
              <div className="flex flex-wrap gap-2">
                {!isPast && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isSyncingTrofeu}
                    onClick={() => void checkRaceDocumentsNow(race.id)}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTrofeu ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Procurar novos documentos
                  </Button>
                )}
                {onOpenTrofeu && (
                  <Button size="sm" variant="ghost" onClick={onOpenTrofeu}>
                    <Trophy className="w-3.5 h-3.5" aria-hidden="true" /> Classificações & Regulamento
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* A minha inscrição (resumo) */}
        {myRegs.length > 0 && (
          <section className="py-6 space-y-3">
            <h2 className="t-heading text-[var(--text-1)]">{isIndividual ? 'A minha presença' : 'A minha inscrição'}</h2>
            <div className="space-y-3">
              {myRegs.map((r) => {
                const vehName = r.vehicle_id
                  ? van.vehicles.find((v) => v.vehicle.id === r.vehicle_id)?.vehicle.name
                  : undefined
                return (
                  <div key={r.id} className="flex items-center gap-4">
                    <Avatar name={r.athlete_name} child={r.is_dependent} />
                    <div className="min-w-0 flex-1">
                      <div className="t-body text-[var(--text-1)] truncate">{r.athlete_name}</div>
                      <div className="t-small text-[var(--text-3)] truncate">
                        {r.distance} · {TRANSPORT_LABELS[r.transport_mode].short}
                        {vehName ? ` (${vehName})` : ''}
                      </div>
                    </div>
                    <Tag tone={STATUS_TAG[r.status].tone}>{STATUS_TAG[r.status].label}</Tag>
                  </div>
                )
              })}
            </div>
            {STATUS_HELP[myRegs[0].status] && <p className="t-small text-[var(--text-3)]">{STATUS_HELP[myRegs[0].status]}</p>}
          </section>
        )}

       </div>
       <div className={`desk-detail-col divide-soft${desktop ? ' pt-2' : ' border-t border-[var(--border-card)]'}`}>
        {/* Carrinhas e veículos do clube */}
        {(race.van_available || (isAdminView && !isIndividual)) && (
          <section className="py-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="t-heading text-[var(--text-1)]">Carrinhas e veículos</h2>
              {race.van_available && (
                <div className="flex items-center gap-2">
                  <span className="t-body t-strong t-num text-[var(--text-1)]">
                    {van.confirmedPassengers.length}/{van.capacity}
                  </span>
                  <Tag tone={van.availableSeats > 0 ? 'ok' : 'warn'}>
                    {van.availableSeats > 0
                      ? `${van.availableSeats} ${van.availableSeats === 1 ? 'vago' : 'vagos'}`
                      : 'Lotado'}
                  </Tag>
                </div>
              )}
            </div>

            {!race.van_available ? (
              <div className="card p-4 space-y-2.5">
                <p className="t-small text-[var(--text-3)]">
                  Sem carrinha definida para esta prova. Podes ativar e indicar os veículos, lugares e condutores diretamente aqui.
                </p>
                <Button size="sm" variant="secondary" onClick={openVehiclesSheet}>
                  <Bus className="w-4 h-4" aria-hidden="true" /> Definir carrinha / veículos
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <FactRow
                  icon={Bus}
                  title={`Saída ${race.van_departure_time ? `às ${race.van_departure_time}` : 'a definir'}`}
                  detail={race.van_departure_location}
                />

                <div className="space-y-2.5">
                  {van.vehicles.map((va) => (
                    <div key={va.vehicle.id} className="card p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="t-body t-strong text-[var(--text-1)] truncate">{va.vehicle.name}</div>
                          <div className="t-small text-[var(--text-3)]">
                            Condutor: <span className="text-[var(--text-2)]">{va.vehicle.driver_name || 'A definir'}</span>
                          </div>
                        </div>
                        <Tag tone={va.availableSeats > 0 ? 'ok' : 'warn'}>
                          {va.availableSeats > 0
                            ? `${va.availableSeats} ${va.availableSeats === 1 ? 'vago' : 'vagos'}`
                            : 'Lotado'}{' '}
                          · {va.occupiedSeats}/{va.vehicle.seats}
                        </Tag>
                      </div>

                      <div
                        className="h-2 rounded-full bg-[var(--surface-raised)] overflow-hidden"
                        role="progressbar"
                        aria-label={`Ocupação de ${va.vehicle.name}`}
                        aria-valuemin={0}
                        aria-valuemax={va.vehicle.seats}
                        aria-valuenow={va.occupiedSeats}
                      >
                        <div
                          className="h-full rounded-full bg-[var(--run)]"
                          style={{ width: `${Math.min(100, (va.occupiedSeats / Math.max(1, va.vehicle.seats)) * 100)}%` }}
                        />
                      </div>

                      <p className="t-small text-[var(--text-2)]">
                        {va.passengers.length > 0
                          ? va.passengers
                              .map((p) => `${p.athlete_name}${p.transport_mode === 'van_return_only' ? ' (só volta)' : ''}`)
                              .join(', ')
                          : 'Ainda sem atletas inscritos neste veículo.'}
                      </p>
                    </div>
                  ))}
                </div>

                {van.waitlistPassengers.length > 0 && (
                  <p className="t-small text-[var(--tint-amber-fg)]">
                    Lista de espera: {van.waitlistPassengers.map((p) => p.athlete_name).join(', ')}
                  </p>
                )}

                {isAdminView && (
                  <Button size="sm" variant="secondary" onClick={openVehiclesSheet}>
                    <Bus className="w-4 h-4" aria-hidden="true" /> Gerir veículos e condutores
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {(van.carpoolOffers.length > 0 || van.carpoolNeeds.length > 0) && (
          <section className="py-6 space-y-2">
            <h2 className="t-heading text-[var(--text-1)]">Boleias entre colegas</h2>
            {van.carpoolOffers.length > 0 && (
              <p className="t-body text-[var(--text-2)]">
                Oferecem boleia: {van.carpoolOffers.map((r) => `${r.athlete_name}${r.carpool_seats ? ` (${r.carpool_seats})` : ''}`).join(', ')}
              </p>
            )}
            {van.carpoolNeeds.length > 0 && (
              <p className="t-body text-[var(--text-2)]">Precisam de boleia: {van.carpoolNeeds.map((r) => r.athlete_name).join(', ')}</p>
            )}
          </section>
        )}

        {/* Inscritos */}
        <section className="py-6 space-y-4">
          <SectionTitle title="Quem vai" count={raceRegs.length} />
          {raceRegs.length === 0 && <p className="t-body text-[var(--text-3)]">Ainda ninguém se inscreveu. Sê o primeiro.</p>}
          {canManage && raceRegs.length > 0 && (
            <ContextualHint id="admin-select">
              Escolhe inscrições com a caixa à esquerda para confirmar ou marcar dorsais só de algumas. "Pendentes" e "Todos" escolhem de uma vez.
            </ContextualHint>
          )}
          {canManage && raceRegs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Selecionar inscrições">
              <Chip onClick={() => setSelected(new Set(raceRegs.filter((r) => r.status === 'interested').map((r) => r.id)))}>
                Pendentes ({pendingCount})
              </Chip>
              <Chip onClick={() => setSelected(new Set(raceRegs.map((r) => r.id)))}>Todos ({raceRegs.length})</Chip>
              {selected.size > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Limpar
                </Button>
              )}
            </div>
          )}
          {byDistance.map(([dist, list]) => (
            <div key={dist} className="space-y-1">
              <h3 className="t-small t-strong text-[var(--text-3)]">
                {dist} · {list.length}
              </h3>
              <div className="divide-soft">
                {list.map((r) => (
                  <RosterRow
                    key={r.id}
                    reg={r}
                    admin={canManage}
                    canRemove={isAdminView}
                    selectable={canManage}
                    checked={selected.has(r.id)}
                    onToggle={() => toggleSelected(r.id)}
                    onPatch={(patch) => updateRegistrationByAdmin(r.id, patch)}
                    onRemove={() => cancelRegistration(r.id)}
                  />
                ))}
              </div>
            </div>
          ))}
          {canManage && selected.size > 0 && (
            <div className="card-raised p-4 space-y-3 sheet-in" role="region" aria-label="Ações sobre as inscrições escolhidas">
              <div className="t-body t-strong text-[var(--text-1)]">
                {selected.size} {selected.size === 1 ? 'inscrição escolhida' : 'inscrições escolhidas'}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button disabled={eligibleConfirm === 0} onClick={() => runOnSelected('confirm')}>
                  Confirmar inscrição ({eligibleConfirm})
                </Button>
                <Button variant="secondary" disabled={eligibleAtClub === 0} onClick={() => runOnSelected('bib_at_club')}>
                  Dorsal no clube ({eligibleAtClub})
                </Button>
                <Button variant="secondary" disabled={eligibleDelivered === 0} onClick={() => runOnSelected('bib_delivered')}>
                  Dorsal entregue ({eligibleDelivered})
                </Button>
              </div>
              <p className="t-small text-[var(--text-3)]">Os números entre parênteses são as escolhidas a que a ação se aplica.</p>
            </div>
          )}
        </section>

        {/* Gestão */}
        {isAdminView && (
          <section className="py-6 space-y-4">
            <h2 className="t-heading text-[var(--text-1)]">Gestão</h2>
            <AdminEnroll race={race} raceRegs={raceRegs} vehicles={van.vehicles} />
            <div className="grid grid-cols-2 gap-2">
              {!isIndividual && (
                <Button variant="secondary" size="sm" disabled={pendingCount === 0} onClick={() => confirmAllPendingForRace(race.id)}>
                  Confirmar todas as pendentes ({pendingCount})
                </Button>
              )}
              {!isIndividual && (
                <Button variant="secondary" size="sm" disabled={pendingBibs === 0} onClick={() => markAllBibsAtClubForRace(race.id, currentUser.name)}>
                  Dorsais no clube, todos ({pendingBibs})
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={handleCopyWhatsApp}>
                <Copy className="w-4 h-4" aria-hidden="true" /> Resumo WhatsApp
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDownloadCSV}>
                <Download className="w-4 h-4" aria-hidden="true" /> Exportar CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openCreateNotice(race.id)} className="col-span-2">
                <Megaphone className="w-4 h-4" aria-hidden="true" /> Publicar comunicado
              </Button>
            </div>
          </section>
        )}

        {canEditRace && (
          <section className="py-6 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => openCreateRace(race)}>
              <Pencil className="w-4 h-4" aria-hidden="true" /> Editar prova
            </Button>
            <Button variant="danger" size="sm" className="flex-1" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Remover
            </Button>
          </section>
        )}
       </div>
      </div>

      <StickyActionBar
        summary={
          <>
            <div className="t-body t-strong text-[var(--text-1)] truncate">
              {formatShortDate(race.date)} · {race.start_time}
            </div>
            <div className="t-small text-[var(--text-3)] truncate">
              {isPast
                ? 'Prova realizada'
                : !registrationOpen
                ? 'Inscrições fechadas'
                : race.van_available
                ? van.availableSeats > 0
                  ? `Carrinha: ${van.availableSeats} ${van.availableSeats === 1 ? 'lugar livre' : 'lugares livres'}`
                  : 'Carrinha cheia'
                : `${raceRegs.length} ${raceRegs.length === 1 ? 'inscrito' : 'inscritos'}`}
            </div>
          </>
        }
      >
        <Button disabled={!canRegisterSomeone} variant={myRegs.length > 0 ? 'secondary' : 'primary'} onClick={() => setSheetOpen(true)}>
          {ctaLabel}
        </Button>
      </StickyActionBar>

      {sheetOpen && (
        <Sheet onClose={() => setSheetOpen(false)} ariaLabel={isIndividual ? 'A minha presença' : 'Inscrição'}>
          <SheetHeader title={isIndividual ? 'A minha presença' : 'Inscrição'} subtitle={race.title} onClose={() => setSheetOpen(false)} />
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {!registrationOpen && !myReg && (
              <p className="t-body text-[var(--text-3)]">{isPast ? 'Esta prova já se realizou.' : 'As inscrições estão fechadas.'}</p>
            )}
            {currentUser.is_minor_account && !race.open_to_children && !myReg && (
              <p className="t-body text-[var(--text-3)]">Esta prova não está aberta a escalões jovens.</p>
            )}
            {(registrationOpen || myReg) && (!currentUser.is_minor_account || race.open_to_children || Boolean(myReg)) && (
              <RegistrationRow
                race={race}
                name={currentUser.name}
                child={Boolean(currentUser.is_minor_account)}
                isSelf
                trofeuDorsal={
                  race.category === 'trofeu_cascais'
                    ? currentUser.dorsais_trofeu?.['2026/2027'] || currentUser.dorsal_trofeu
                    : undefined
                }
                existing={myReg}
                vehicleAllocations={van.vehicles}
                distances={currentUser.is_minor_account ? childDistances : race.distances}
                defaultTransport={defaultTransport}
                locked={!registrationOpen}
                onSubmit={(distance, transport, seats, vehicleId) =>
                  registerForRace({
                    race_id: race.id,
                    athlete_id: currentUser.id,
                    athlete_name: currentUser.name,
                    is_dependent: Boolean(currentUser.is_minor_account),
                    dependent_id: currentUser.is_minor_account ? currentUser.id : undefined,
                    escalao: currentUser.escalao,
                    distance,
                    transport_mode: transport,
                    vehicle_id: vehicleId,
                    carpool_seats: seats,
                  })
                }
                onCancel={myReg ? () => cancelRegistration(myReg.id) : undefined}
              />
            )}

            {!currentUser.is_minor_account &&
              myChildren.length > 0 &&
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
                      trofeuDorsal={
                        race.category === 'trofeu_cascais'
                          ? child.dorsais_trofeu?.['2026/2027'] || child.dorsal_trofeu
                          : undefined
                      }
                      existing={reg}
                      vehicleAllocations={van.vehicles}
                      distances={childDistances}
                      defaultTransport={myReg?.transport_mode || defaultTransport}
                      locked={!registrationOpen}
                      onSubmit={(distance, transport, _seats, vehicleId) => registerChild(child, distance, transport, vehicleId)}
                      onCancel={reg ? () => cancelRegistration(reg.id) : undefined}
                    />
                  )
                })
              ) : (
                <p className="t-small text-[var(--text-3)]">Esta prova não está aberta a crianças.</p>
              ))}
          </div>
        </Sheet>
      )}

      {vehiclesSheetOpen && (
        <Sheet onClose={() => setVehiclesSheetOpen(false)} ariaLabel="Gerir carrinhas e condutores">
          <SheetHeader
            title="Carrinhas e veículos"
            subtitle={race.title}
            onClose={() => setVehiclesSheetOpen(false)}
          />
          <form onSubmit={saveVehiclesConfig} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <RaceVehiclesEditor
              vanAvailable={vanAvailDraft}
              onVanAvailableChange={setVanAvailDraft}
              departureTime={vanDepDraft}
              onDepartureTimeChange={setVanDepDraft}
              departureLocation={vanLocDraft}
              onDepartureLocationChange={setVanLocDraft}
              vehicles={vehiclesDraft}
              onVehiclesChange={setVehiclesDraft}
              profiles={profiles}
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">
                Guardar veículos
              </Button>
              <Button type="button" variant="ghost" onClick={() => setVehiclesSheetOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Sheet>
      )}
    </div>
  )
}

const VehicleSelectField: React.FC<{
  vehicles: VehicleAllocation[]
  value: string
  onChange: (val: string) => void
}> = ({ vehicles, value, onChange }) => (
  <Field label="Veículo">
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Qualquer veículo com vaga</option>
      {vehicles.map((va) => (
        <option key={va.vehicle.id} value={va.vehicle.id}>
          {va.vehicle.name}
          {va.vehicle.driver_name ? ` (Condutor: ${va.vehicle.driver_name})` : ''}
          {va.availableSeats > 0
            ? ` — ${va.availableSeats} ${va.availableSeats === 1 ? 'lugar vago' : 'lugares vagos'}`
            : ' — Lotado'}
        </option>
      ))}
    </select>
  </Field>
)

// ---------------------------------------------------------------------------
// Linha de inscrição (adulto ou criança)
// ---------------------------------------------------------------------------
const RegistrationRow: React.FC<{
  race: Race
  name: string
  child?: boolean
  isSelf?: boolean
  trofeuDorsal?: string
  existing?: RaceRegistration
  vehicleAllocations?: VehicleAllocation[]
  distances: string[]
  defaultTransport: TransportMode
  locked?: boolean
  onSubmit: (distance: string, transport: TransportMode, carpoolSeats?: number, vehicleId?: string) => void
  onCancel?: () => void
}> = ({
  race,
  name,
  child,
  isSelf,
  trofeuDorsal,
  existing,
  vehicleAllocations = [],
  distances,
  defaultTransport,
  locked,
  onSubmit,
  onCancel,
}) => {
  const [editingState, setEditing] = useState(false)
  const editing = editingState || !existing
  const [distance, setDistance] = useState(existing?.distance || distances[0] || '')
  const [transport, setTransport] = useState<TransportMode>(existing?.transport_mode || defaultTransport)
  const [vehicleId, setVehicleId] = useState(existing?.vehicle_id || '')
  const [seats, setSeats] = useState(existing?.carpool_seats || 3)

  const isIndividual = race.category === 'individual'
  const usesVanSeat = Boolean(TRANSPORT_LABELS[transport]?.usesVanSeat)
  const existingVehicleName = existing?.vehicle_id
    ? vehicleAllocations.find((va) => va.vehicle.id === existing.vehicle_id)?.vehicle.name
    : undefined

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} child={child} />
        <div className="min-w-0 flex-1">
          <div className="t-body t-strong text-[var(--text-1)] truncate">{name}</div>
          <div className="t-small text-[var(--text-3)] truncate">
            {existing && !editing
              ? `${existing.distance} · ${TRANSPORT_LABELS[existing.transport_mode].short}${existingVehicleName ? ` (${existingVehicleName})` : ''}`
              : child && !isSelf
              ? 'Criança a meu cargo'
              : 'Eu'}
          </div>
          {trofeuDorsal && (
            <div className="t-small text-[var(--run)]">Dorsal Troféu 26/27 #{trofeuDorsal}</div>
          )}
        </div>
        {existing && (
          <span className="pop-in">
            <Tag tone={STATUS_TAG[existing.status].tone}>{STATUS_TAG[existing.status].label}</Tag>
          </span>
        )}
      </div>

      {editing && !locked ? (
        <div className="space-y-3">
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
          <p className="t-small text-[var(--text-3)] -mt-1">{TRANSPORT_HELP[transport]}</p>
          {race.van_available && usesVanSeat && vehicleAllocations.length > 0 && (
            <VehicleSelectField vehicles={vehicleAllocations} value={vehicleId} onChange={setVehicleId} />
          )}
          {transport === 'carpool_offer' && !child && (
            <Field label="Lugares livres no carro">
              <input type="number" min={1} max={8} className={inputClass} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
            </Field>
          )}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                onSubmit(
                  distance || distances[0],
                  transport,
                  transport === 'carpool_offer' ? seats : undefined,
                  usesVanSeat ? vehicleId || undefined : undefined
                )
                setEditing(false)
              }}
            >
              {existing ? 'Guardar' : isIndividual ? 'Vou participar' : child && !isSelf ? `Inscrever ${name.split(' ')[0]}` : 'Pedir inscrição'}
            </Button>
            {existing && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </div>
          {!existing && !isIndividual && (
            <p className="t-small text-[var(--text-3)]">O pedido fica pendente até o clube confirmar a inscrição.</p>
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
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  const sure =
                    existing.status === 'enrolled_by_admin'
                      ? `O clube já confirmou a inscrição de ${name}. Cancelar mesmo? O clube é avisado.`
                      : `Cancelar a inscrição de ${name}?`
                  if (window.confirm(sure)) onCancel()
                }}
              >
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
  selectable?: boolean
  checked?: boolean
  onToggle?: () => void
  onPatch: (patch: Partial<RaceRegistration>) => void
  onRemove: () => void
}> = ({ reg, admin, canRemove, selectable, checked, onToggle, onPatch, onRemove }) => {
  const [open, setOpen] = useState(false)
  const [bib, setBib] = useState(reg.bib_number || '')
  const editable = admin || canRemove
  return (
    <div className="py-1">
      <div className="flex items-center">
        {selectable && (
          <label className="w-11 h-14 flex items-center justify-center shrink-0 cursor-pointer -ml-2">
            <input
              type="checkbox"
              checked={Boolean(checked)}
              onChange={onToggle}
              aria-label={`Selecionar ${reg.athlete_name}`}
              className="w-5 h-5 accent-[var(--run)] cursor-pointer"
            />
          </label>
        )}
        <button
          type="button"
          className="flex-1 min-w-0 min-h-14 flex items-center gap-4 text-left cursor-pointer disabled:cursor-default"
          disabled={!editable}
          aria-expanded={editable ? open : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <Avatar name={reg.athlete_name} child={reg.is_dependent} />
          <div className="min-w-0 flex-1">
            <div className="t-body text-[var(--text-1)] truncate">{reg.athlete_name}</div>
            <div className="t-small text-[var(--text-3)] truncate">
              {reg.is_dependent && reg.parent_name ? `Resp. ${reg.parent_name} · ` : ''}
              {TRANSPORT_LABELS[reg.transport_mode].short}
              {reg.bib_status !== 'pending' || reg.bib_number
                ? ` · dorsal${reg.bib_number ? ' ' + reg.bib_number : ''}${admin && reg.bib_status !== 'pending' ? ' · ' + BIB_STATUS_LABELS[reg.bib_status].short.toLowerCase() : ''}`
                : ''}
            </div>
          </div>
          <Tag tone={STATUS_TAG[reg.status].tone}>{STATUS_TAG[reg.status].label}</Tag>
        </button>
      </div>
      {open && editable && (
        <div className="pb-4 pt-1 space-y-3">
          {admin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Estado">
                  <select
                    className={inputClass}
                    value={reg.status}
                    onChange={(e) => onPatch({ status: e.target.value as RaceRegistration['status'] })}
                  >
                    <option value="interested">Aguarda o clube</option>
                    <option value="enrolled_by_admin">Inscrito</option>
                  </select>
                </Field>
                <Field label="Dorsal">
                  <select
                    className={inputClass}
                    value={reg.bib_status}
                    onChange={(e) => onPatch({ bib_status: e.target.value as RaceRegistration['bib_status'] })}
                  >
                    <option value="pending">—</option>
                    <option value="at_club">{BIB_STATUS_LABELS.at_club.short}</option>
                    <option value="delivered">{BIB_STATUS_LABELS.delivered.short}</option>
                  </select>
                </Field>
              </div>
              <Field label="Número do dorsal">
                <input
                  className={inputClass}
                  value={bib}
                  onChange={(e) => setBib(e.target.value)}
                  onBlur={() => bib !== (reg.bib_number || '') && onPatch({ bib_number: bib.trim() || undefined })}
                />
              </Field>
            </>
          )}
          {canRemove && (
            <Button
              size="sm"
              variant="danger"
              block
              onClick={() => window.confirm(`Remover a inscrição de ${reg.athlete_name}?`) && onRemove()}
            >
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
const AdminEnroll: React.FC<{ race: Race; raceRegs: RaceRegistration[]; vehicles: VehicleAllocation[] }> = ({
  race,
  raceRegs,
  vehicles,
}) => {
  const { profiles, youthAthletes, registerForRace } = useApp()
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState('')
  const [distance, setDistance] = useState(race.distances[0] || '')
  const [transport, setTransport] = useState<TransportMode>(race.van_available ? 'van_roundtrip' : 'own_transport')
  const [vehicleId, setVehicleId] = useState('')

  const adultsAvailable = profiles.filter((p) => !raceRegs.some((r) => !r.is_dependent && r.athlete_id === p.id))
  const childrenAvailable = race.open_to_children
    ? youthAthletes.filter((c) => c.associated_adult_ids.length > 0 && !raceRegs.some((r) => r.dependent_id === c.id))
    : []
  const isChild = who.startsWith('c:')
  const distances = isChild && race.children_distances?.length ? race.children_distances : race.distances
  const usesVanSeat = race.van_available && Boolean(TRANSPORT_LABELS[transport]?.usesVanSeat)

  const submit = () => {
    if (!who) return
    const selectedVehicleId = usesVanSeat ? vehicleId || undefined : undefined
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
        vehicle_id: selectedVehicleId,
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
        vehicle_id: selectedVehicleId,
      })
    }
    setWho('')
    setVehicleId('')
    setOpen(false)
  }

  if (!open) {
    return (
      <Button block onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4" aria-hidden="true" /> Inscrever atleta
      </Button>
    )
  }

  return (
    <div className="card p-4 space-y-3">
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
      <div className="grid grid-cols-2 gap-3">
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
      {usesVanSeat && vehicles.length > 0 && (
        <VehicleSelectField vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
      )}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={!who} onClick={submit}>
          Inscrever
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Fechar
        </Button>
      </div>
    </div>
  )
}
