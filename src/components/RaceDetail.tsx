import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Bus, Copy, Download, ExternalLink, FileDown, FileText, Megaphone, Pencil, RefreshCw, Trash2, Trophy, UserPlus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { RegistrationBulkAction } from '../context/AppContext'
import type { Race, RaceRegistration, RaceVehicle, TransportMode, YouthAthlete } from '../types'
import { BIB_STATUS_LABELS, CATEGORIA_LABELS, REG_STATUS_LABELS, TRANSPORT_LABELS } from '../types'
import {
  computeVanAllocation,
  formatLongDate,
  formatShortDate,
  generateAdminInscriptionCSV,
  generateWhatsAppSummary,
  getRaceVehicles,
} from '../utils/formatters'
import type { VehicleAllocation } from '../utils/formatters'
import { seasonOf, todayISO } from '../utils/dates'
import { markRaceSeen } from '../utils/openRaces'
import { openCreateNotice, openCreateRace } from '../utils/appEvents'
import { raceTitleParts, tidyText } from '../utils/display'
import { buildBibListPdf, buildBibRows } from '../utils/bibList'
import { saveFile } from '../utils/saveFile'
import { DetailBar } from './AppHeader'
import { ActivityPhoto, countdownLabel } from './ActivityItems'
import { RaceVehiclesEditor, createEmptyVehicle, normalizeRaceVehiclesInput } from './RaceVehiclesEditor'
import { Sheet } from './Sheet'
import { ContextualHint } from './OnboardingCards'
import { useDesktopShell } from '../layout/useDesktopShell'
import { PersonAvatar } from './PersonAvatar'
import {
  Button,
  Chip,
  DateBlock,
  FactStrip,
  Field,
  HeroTag,
  KIND_SINGULAR,
  KindMark,
  SectionTitle,
  SheetHeader,
  StickyActionBar,
  Tag,
  inputClass,
} from './ui'

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

/** Linha de facto numa lista em grelha: rótulo à esquerda, valor e nota à direita (data, local, encontro, ...). */
export const FactRow: React.FC<{ label: string; title: React.ReactNode; detail?: React.ReactNode }> = ({ label, title, detail }) => (
  <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 py-3 min-h-12 items-baseline">
    <dt className="t-small t-strong text-[var(--text-2)]">{label}</dt>
    <dd className="m-0 min-w-0">
      <span className="block t-body t-strong text-[var(--text-1)]">{title}</span>
      {detail && <span className="block t-small text-[var(--text-2)]">{detail}</span>}
    </dd>
  </div>
)

/**
 * Topo de um detalhe (prova ou evento): bloco azul com o bloco de data dourado, título e linha de quando,
 * e a fotografia (se houver) por baixo. `.detail-hero` serve à barra fixa para saber quando mostrar o título.
 */
export const DetailHero: React.FC<{
  date: string
  title: string
  when: string
  desktop: boolean
  extra?: React.ReactNode
  imageUrl?: string
}> = ({ date, title, when, desktop, extra, imageUrl }) => (
  <section className={`detail-hero block-blue on-blue ${desktop ? 'px-10 pt-10 pb-9' : 'px-5 pt-3 pb-5'}`}>
    <div className={`flex items-stretch ${desktop ? 'gap-7' : 'gap-4'}`}>
      <DateBlock date={date} size={desktop ? 'xl' : 'hero'} />
      <div className={`min-w-0 flex flex-col justify-center ${desktop ? 'gap-3 py-2' : 'gap-1.5'}`}>
        <h1 className={`t-title text-[var(--hdr-fg)] ${desktop ? '!text-[50px] !leading-none' : ''}`}>{title}</h1>
        <p className={`${desktop ? 'text-[17px]' : 'text-[15px]'} leading-[1.4] text-[var(--hdr-fg)] first-letter:uppercase`}>{when}</p>
        {extra}
      </div>
    </div>
    {imageUrl && (
      <div className={desktop ? 'mt-7' : 'mt-4'}>
        <ActivityPhoto src={imageUrl} className={`w-full ${desktop ? 'h-[220px]' : 'aspect-[16/9]'}`} />
      </div>
    )}
  </section>
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
    trofeuSeasons,
  } = useApp()
  // Abrir a prova tira-lhe o sinal de "nova" na navegação
  useEffect(() => {
    markRaceSeen(currentUser.id, race.id)
  }, [currentUser.id, race.id])
  const desktop = useDesktopShell()
  // "Inscrever-me" na prova em destaque (Explorar) abre a página já com a folha de inscrição
  const location = useLocation()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(() => Boolean((location.state as { register?: boolean } | null)?.register))
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
  // Depois do dia da prova ninguém inscreve, altera ou cancela (nem o admin). Antes: o admin sempre; atletas até ao prazo
  const registrationOpen = !isPast && (isAdminView || !(race.category !== 'individual' && deadlinePassed))
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

  // Gestão de inscrições (confirmar, dorsais, selecionar, lista de dorsais): só até ao dia da prova
  const canManage = isAdminView && !isIndividual && !isPast
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

  // Lista para o responsável levantar os dorsais: só inscrições confirmadas
  const bibRows = canManage ? buildBibRows(race, raceRegs, profiles, youthAthletes) : []
  const handleBibListPdf = async () => {
    const file = new File([buildBibListPdf(race, bibRows)], `dorsais-${race.date}.pdf`, { type: 'application/pdf' })
    const result = await saveFile(file)
    if (result === 'cancelled') return
    const missing = bibRows.filter((r) => !r.birthDate).length
    if (missing > 0) {
      showToast(`Lista criada. Falta a data de nascimento de ${missing} ${missing === 1 ? 'atleta' : 'atletas'}.`, 'warning')
    } else {
      showToast(`Lista de dorsais criada com ${bibRows.length} ${bibRows.length === 1 ? 'atleta' : 'atletas'}.`)
    }
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

  // Troféu: resultados da equipa nesta etapa (da época já sincronizada)
  const stageCode = race.category === 'trofeu_cascais' && race.trophy_stage_number ? `P${race.trophy_stage_number}` : ''
  const trofeuSeason = stageCode ? trofeuSeasons.find((s) => s.season === seasonOf(race.date)) : undefined
  const teamResults = useMemo(() => {
    if (!trofeuSeason || !stageCode) return []
    return trofeuSeason.athlete_standings
      .filter((a) => a.stage_results?.[stageCode] || a.points_per_stage[stageCode] !== undefined)
      .map((a) => ({
        name: a.name,
        escalao: a.escalao,
        pos: a.stage_results?.[stageCode]?.pos,
        time: a.stage_results?.[stageCode]?.time,
        points: a.stage_results?.[stageCode]?.points ?? a.points_per_stage[stageCode],
      }))
      .sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999) || b.points - a.points || a.name.localeCompare(b.name, 'pt'))
  }, [trofeuSeason, stageCode])
  const teamStagePlace = useMemo(() => {
    if (!trofeuSeason || !stageCode) return undefined
    const ranked = trofeuSeason.club_standings
      .filter((c) => c.points_per_stage[stageCode] !== undefined)
      .sort((a, b) => b.points_per_stage[stageCode] - a.points_per_stage[stageCode])
    const i = ranked.findIndex((c) => c.is_urc)
    return i >= 0 ? { pos: i + 1, points: ranked[i].points_per_stage[stageCode], of: ranked.length } : undefined
  }, [trofeuSeason, stageCode])
  const openStageResults = () =>
    navigate(`/trofeu/etapa/${race.trophy_stage_number}?epoca=${encodeURIComponent(seasonOf(race.date))}`)

  const countdown = countdownLabel(race.date)
  const canRegisterSomeone = registrationOpen || myRegs.length > 0
  const ctaLabel = myRegs.length > 0 ? (registrationOpen ? 'Gerir inscrição' : 'Ver inscrição') : isIndividual ? 'Vou participar' : 'Inscrever'

  const shareRace = () => shareLink(race.title, `prova/${race.id}`, showToast)
  const { stage, name: raceName } = raceTitleParts(race)
  const bar = <DetailBar title={raceName} onBack={onBack} onShare={shareRace} />
  const regState = isPast
    ? 'Realizada'
    : !registrationOpen
    ? 'Fechadas'
    : race.registration_deadline && !isIndividual
    ? `Até ${formatShortDate(race.registration_deadline).split(', ')[1]}`
    : 'Abertas'

  return (
    <>
    {bar}
    {/* Telemóvel: 1 coluna (.detail). Computador (>= 1024 px): duas colunas (.desk-detail, layout/desktop.css) */}
    <div className={desktop ? 'desk-detail' : 'detail'}>
      <DetailHero
        date={race.date}
        title={raceName}
        when={`${formatLongDate(race.date)}, ${race.start_time}${countdown ? `. ${countdown}` : ''}`}
        desktop={desktop}
        imageUrl={race.image_url}
        extra={
          (stage || race.open_to_children || isPast) && (
            <span className="flex flex-wrap gap-1.5 pt-1">
              {stage && <HeroTag>Etapa {stage} do Troféu</HeroTag>}
              {race.open_to_children && <HeroTag>Aberta a crianças</HeroTag>}
              {isPast && <HeroTag>Realizada</HeroTag>}
            </span>
          )
        }
      />
      <FactStrip
        className={desktop ? 'px-10' : ''}
        items={[
          ...(race.distances.length > 0 ? [{ label: race.distances.length > 1 ? 'Distâncias' : 'Distância', value: race.distances.join(' · ') }] : []),
          { label: 'Local', value: tidyText(race.location) },
          { label: 'Inscrições', value: regState, accent: regState === 'Abertas' || regState.startsWith('Até') },
        ]}
      />

      <div className={desktop ? 'desk-detail-grid pt-4' : 'detail-body detail-grid'}>
       <div className="desk-detail-col min-w-0">
        {/* Factos */}
        <section className="pt-6 pb-2">
          <SectionTitle title="Informação" />
          <dl className="rule-list m-0">
            <FactRow label="Tipo" title={<span className="inline-flex items-center gap-2"><KindMark kind={race.category} />{KIND_SINGULAR[race.category]}</span>} detail={CATEGORIA_LABELS[race.category].desc} />
            <FactRow label="Partida" title={<span className="first-letter:uppercase inline-block">{formatLongDate(race.date)}</span>} detail={`Às ${race.start_time}`} />
            <FactRow label="Local" title={tidyText(race.location)} />
            {race.meeting_point && (
              <FactRow label="Encontro" title={race.meeting_time ? `Às ${race.meeting_time}` : 'Hora a definir'} detail={tidyText(race.meeting_point)} />
            )}
            {race.distances.length > 0 && (
              <FactRow
                label="Distâncias"
                title={race.distances.join(' · ')}
                detail={race.open_to_children && race.children_distances?.length ? `Crianças: ${race.children_distances.join(' · ')}` : undefined}
              />
            )}
            {race.registration_deadline && (
              <FactRow
                label="Prazo"
                title={deadlinePassed ? 'Inscrições fechadas' : `Inscrições até ${formatShortDate(race.registration_deadline)}`}
                detail={deadlinePassed ? `O prazo terminou a ${formatShortDate(race.registration_deadline)}` : undefined}
              />
            )}
            {race.bib_pickup_info && <FactRow label="Dorsais" title={tidyText(race.bib_pickup_info)} />}
          </dl>
        </section>

        {/* Sobre */}
        {(race.description || isIndividual || race.external_url) && (
          <section className="py-6 space-y-3">
            <SectionTitle title="Sobre a prova" />
            <div className="rule-top pt-3 space-y-3">
              {race.description && <p className="t-body text-[var(--text-1)] whitespace-pre-line">{tidyText(race.description)}</p>}
              {isIndividual && <p className="t-small text-[var(--text-2)]">Proposta por {race.created_by_name}</p>}
              {race.external_url && (
                <a
                  href={race.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-11 t-body t-strong text-[var(--link)] underline underline-offset-4"
                >
                  Site oficial da prova <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </section>
        )}

        {/* Documentação oficial & Croqui (Troféu de Cascais) */}
        {(race.category === 'trofeu_cascais' || Boolean(race.documents?.length)) && (
          <section className="py-6 space-y-3">
            <div className="flex items-end justify-between gap-2 pb-2">
              <h2 className="t-heading text-[var(--text-1)]">Documentos e croqui</h2>
              {race.documents?.some((d) => d.type === 'croqui') ? (
                <Tag tone="ok">Croqui disponível</Tag>
              ) : (
                <Tag tone="warn">Aguarda croqui</Tag>
              )}
            </div>

            {race.documents && race.documents.length > 0 ? (
              <div className="rule-list">
                {race.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="row-link min-h-14 py-2.5 flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-[var(--link)] shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block t-body t-strong text-[var(--text-1)] truncate">{tidyText(doc.title)}</span>
                        <span className="block t-small text-[var(--text-2)]">
                          Detetado a {new Date(doc.detected_at).toLocaleDateString('pt-PT')}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {doc.is_new && <Tag tone="danger">Novo</Tag>}
                      <ExternalLink className="w-4 h-4 text-[var(--text-1)]" aria-hidden="true" />
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="rule-top pt-3 t-small text-[var(--text-2)]">
                Ainda não foi publicada documentação adicional para esta etapa.
              </p>
            )}

            <div className="bg-[var(--surface-raised)] p-3.5 space-y-2">
              <div className="t-small text-[var(--text-1)]">
                {isPast
                  ? 'Prova concluída. Arquivo documental sincronizado.'
                  : 'Verificação automática 2 vezes por semana até à data da prova (procura croquis e regulamentos).'}
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

        {/* Troféu: resultados da equipa nesta etapa */}
        {isPast && stageCode && (teamResults.length > 0 || teamStagePlace) && (
          <section className="py-6 space-y-3">
            <SectionTitle title="Resultados da equipa" count={teamResults.length} />
            {teamStagePlace && (
              <p className="t-body text-[var(--text-1)]">
                A U.R. Charneca ficou em <span className="t-strong">{teamStagePlace.pos}.º lugar</span> entre {teamStagePlace.of} clubes, com {teamStagePlace.points} pontos.
              </p>
            )}
            {teamResults.length > 0 && (
              <ol className="rule-list m-0 p-0 list-none">
                {teamResults.slice(0, 8).map((a) => (
                  <li key={`${a.escalao}|${a.name}`} className="grid grid-cols-[48px_minmax(0,1fr)_auto] gap-3 items-center min-h-12 py-2">
                    <span className="num text-[26px] text-[var(--link)]">{a.pos ?? '–'}</span>
                    <span className="min-w-0">
                      <span className="block t-body t-strong text-[var(--text-1)] truncate">{a.name}</span>
                      <span className="block t-small text-[var(--text-2)] truncate">
                        {a.escalao}
                        {a.time ? ` · ${a.time}` : ''}
                      </span>
                    </span>
                    <span className="t-small t-strong text-[var(--text-1)] t-num">{a.points} pts</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="t-small text-[var(--text-2)]">
              {teamResults.length > 8 ? `Os 8 melhores lugares de ${teamResults.length}. ` : ''}O lugar é dentro do escalão.
            </p>
            <Button variant="secondary" block onClick={openStageResults}>
              <Trophy className="w-4 h-4" aria-hidden="true" /> Ver classificação completa
            </Button>
          </section>
        )}

        {/* A minha inscrição (resumo) */}
        {myRegs.length > 0 && (
          <section className="py-6">
            <SectionTitle title={isIndividual ? 'A minha presença' : 'A minha inscrição'} />
            <div className="rule-list">
              {myRegs.map((r) => {
                const vehName = r.vehicle_id
                  ? van.vehicles.find((v) => v.vehicle.id === r.vehicle_id)?.vehicle.name
                  : undefined
                return (
                  <div key={r.id} className="flex items-center gap-4 min-h-16 py-2.5">
                    <PersonAvatar id={r.dependent_id || r.athlete_id} name={r.athlete_name} child={r.is_dependent} />
                    <div className="min-w-0 flex-1">
                      <div className="t-body t-strong text-[var(--text-1)] truncate">{r.athlete_name}</div>
                      <div className="t-small text-[var(--text-2)] truncate">
                        {r.distance} · {TRANSPORT_LABELS[r.transport_mode].short}
                        {vehName ? ` (${vehName})` : ''}
                      </div>
                    </div>
                    <Tag tone={REG_STATUS_LABELS[r.status].tone}>{REG_STATUS_LABELS[r.status].label}</Tag>
                  </div>
                )
              })}
            </div>
            {!isPast && STATUS_HELP[myRegs[0].status] && <p className="t-small text-[var(--text-2)] pt-3">{STATUS_HELP[myRegs[0].status]}</p>}
          </section>
        )}

       </div>
       <div className={`desk-detail-col min-w-0${desktop ? '' : ' detail-side'}`}>
        {/* Carrinhas e veículos do clube */}
        {(race.van_available || (isAdminView && !isIndividual && !isPast)) && (
          <section className="py-6 space-y-3">
            <div className="flex items-end justify-between gap-3 pb-2">
              <h2 className="t-heading text-[var(--text-1)]">Carrinhas</h2>
              {race.van_available && (
                <span className="t-small t-strong text-[var(--link)] text-right">
                  {van.availableSeats > 0
                    ? `${van.availableSeats} ${van.availableSeats === 1 ? 'vaga' : 'vagas'} de transporte`
                    : 'Carrinhas cheias'}
                  <span className="sr-only">, {van.confirmedPassengers.length} de {van.capacity} lugares ocupados</span>
                </span>
              )}
            </div>

            {!race.van_available ? (
              <div className="rule-top pt-3 space-y-2.5">
                <p className="t-small text-[var(--text-2)]">
                  Sem carrinha definida para esta prova. Podes ativar e indicar os veículos, lugares e condutores diretamente aqui.
                </p>
                <Button size="sm" variant="secondary" onClick={openVehiclesSheet}>
                  <Bus className="w-4 h-4" aria-hidden="true" /> Definir carrinhas e veículos
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rule-list">
                  <dl className="m-0">
                    <FactRow
                      label="Saída"
                      title={race.van_departure_time ? `Às ${race.van_departure_time}` : 'Hora a definir'}
                      detail={tidyText(race.van_departure_location)}
                    />
                  </dl>
                  {van.vehicles.map((va) => (
                    <div key={va.vehicle.id} className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="t-body t-strong text-[var(--text-1)] truncate">{va.vehicle.name}</div>
                          <div className="t-small text-[var(--text-2)]">
                            Condutor: <span className="text-[var(--text-1)]">{va.vehicle.driver_name || 'a definir'}</span>
                          </div>
                        </div>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="num-wide text-[22px] text-[var(--text-1)]">
                            {va.occupiedSeats}/{va.vehicle.seats}
                          </span>
                          <Tag tone={va.availableSeats > 0 ? 'ok' : 'warn'}>
                            {va.availableSeats > 0 ? `${va.availableSeats} ${va.availableSeats === 1 ? 'vago' : 'vagos'}` : 'Lotado'}
                          </Tag>
                        </span>
                      </div>

                      <div
                        className="h-2 bg-[var(--surface-raised)] overflow-hidden"
                        role="progressbar"
                        aria-label={`Ocupação de ${va.vehicle.name}`}
                        aria-valuemin={0}
                        aria-valuemax={va.vehicle.seats}
                        aria-valuenow={va.occupiedSeats}
                      >
                        <div
                          className="h-full bg-[var(--run)]"
                          style={{ width: `${Math.min(100, (va.occupiedSeats / Math.max(1, va.vehicle.seats)) * 100)}%` }}
                        />
                      </div>

                      <p className="t-small text-[var(--text-1)]">
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
                  <p className="t-small t-strong block-gold px-3 py-2">
                    Lista de espera: {van.waitlistPassengers.map((p) => p.athlete_name).join(', ')}
                  </p>
                )}

                {isAdminView && !isPast && (
                  <Button size="sm" variant="secondary" onClick={openVehiclesSheet}>
                    <Bus className="w-4 h-4" aria-hidden="true" /> Gerir veículos e condutores
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {(van.carpoolOffers.length > 0 || van.carpoolNeeds.length > 0) && (
          <section className="py-6">
            <SectionTitle title="Boleias entre colegas" />
            <dl className="rule-list m-0">
              {van.carpoolOffers.length > 0 && (
                <FactRow
                  label="Oferecem"
                  title={van.carpoolOffers.map((r) => `${r.athlete_name}${r.carpool_seats ? ` (${r.carpool_seats})` : ''}`).join(', ')}
                />
              )}
              {van.carpoolNeeds.length > 0 && <FactRow label="Precisam" title={van.carpoolNeeds.map((r) => r.athlete_name).join(', ')} />}
            </dl>
          </section>
        )}

        {/* Inscritos */}
        <section className="py-6 space-y-4">
          <SectionTitle title="Quem vai" count={raceRegs.length} />
          {raceRegs.length === 0 && <p className="rule-top pt-3 t-body text-[var(--text-2)]">Ainda ninguém se inscreveu. Sê o primeiro.</p>}
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
            <div key={dist}>
              <h3 className="flex items-baseline justify-between gap-3 pb-1.5 t-body t-strong text-[var(--text-1)]">
                <span>{dist}</span>
                <span className="num-wide text-[20px] text-[var(--link)]">{list.length}</span>
              </h3>
              <div className="rule-list">
                {list.map((r) => (
                  <RosterRow
                    key={r.id}
                    reg={r}
                    admin={canManage}
                    canRemove={isAdminView && !isPast}
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
              <p className="t-small text-[var(--text-2)]">Os números entre parênteses são as escolhidas a que a ação se aplica.</p>
            </div>
          )}
        </section>

        {/* Gestão */}
        {isAdminView && (
          <section className="py-6 space-y-4">
            <h2 className="t-heading text-[var(--text-1)]">Gestão</h2>
            {isPast && (
              <p className="t-small text-[var(--text-2)]">A prova já se realizou: as inscrições ficam como estavam e já não se alteram.</p>
            )}
            {!isPast && <AdminEnroll race={race} raceRegs={raceRegs} vehicles={van.vehicles} />}
            {canManage && (
              <div className="space-y-1.5">
                <Button variant="secondary" block disabled={bibRows.length === 0} onClick={() => void handleBibListPdf()}>
                  <FileDown className="w-4 h-4" aria-hidden="true" /> Lista para levantar dorsais, PDF ({bibRows.length})
                </Button>
                <p className="t-small text-[var(--text-2)]">
                  Nome, data de nascimento e número de dorsal dos inscritos confirmados.
                  {pendingCount > 0 && ` ${pendingCount} ${pendingCount === 1 ? 'pedido por confirmar fica' : 'pedidos por confirmar ficam'} de fora.`}
                </p>
              </div>
            )}
            {/* Os rótulos compridos partem em duas linhas: numa só não cabiam em meia largura no telemóvel */}
            <div className="grid grid-cols-2 gap-2 [&>button]:!whitespace-normal [&>button]:!px-2 [&>button]:py-2 [&>button]:leading-tight [&>button]:text-center">
              {canManage && (
                <Button variant="secondary" size="sm" disabled={pendingCount === 0} onClick={() => confirmAllPendingForRace(race.id)}>
                  Confirmar todas as pendentes ({pendingCount})
                </Button>
              )}
              {canManage && (
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
            <div className="t-small text-[var(--text-2)] truncate">
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
        {/* Prova realizada: sem botão para quem não estava inscrito; quem estava só vê a inscrição */}
        {(!isPast || myRegs.length > 0) && (
          <Button size="lg" className="min-w-[44%] lg:min-w-0 lg:w-[332px]" disabled={!canRegisterSomeone} variant={myRegs.length > 0 ? 'secondary' : 'primary'} onClick={() => setSheetOpen(true)}>
            {ctaLabel}
          </Button>
        )}
      </StickyActionBar>

      {sheetOpen && (
        <Sheet persistent onClose={() => setSheetOpen(false)} ariaLabel={isIndividual ? 'A minha presença' : 'Inscrição'}>
          <SheetHeader title={isIndividual ? 'A minha presença' : 'Inscrição'} subtitle={raceName} onClose={() => setSheetOpen(false)} />
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {!registrationOpen && !myReg && (
              <p className="t-body text-[var(--text-2)]">{isPast ? 'Esta prova já se realizou.' : 'As inscrições estão fechadas.'}</p>
            )}
            {currentUser.is_minor_account && !race.open_to_children && !myReg && (
              <p className="t-body text-[var(--text-2)]">Esta prova não está aberta a escalões jovens.</p>
            )}
            {(registrationOpen || myReg) && (!currentUser.is_minor_account || race.open_to_children || Boolean(myReg)) && (
              <RegistrationRow
                race={race}
                name={currentUser.name}
                personId={currentUser.id}
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
                      personId={child.id}
                      child
                      gender={child.gender}
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
                <p className="t-small text-[var(--text-2)]">Esta prova não está aberta a crianças.</p>
              ))}
          </div>
        </Sheet>
      )}

      {vehiclesSheetOpen && (
        <Sheet onClose={() => setVehiclesSheetOpen(false)} ariaLabel="Gerir carrinhas e condutores">
          <SheetHeader
            title="Carrinhas e veículos"
            subtitle={raceName}
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
    </>
  )
}

const VehicleSelectField: React.FC<{
  vehicles: VehicleAllocation[]
  value: string
  onChange: (val: string) => void
}> = ({ vehicles, value, onChange }) => {
  // O condutor fica na dica: dentro da opção o texto era cortado no telemóvel
  const driver = vehicles.find((va) => va.vehicle.id === value)?.vehicle.driver_name
  return (
    <Field label="Veículo" hint={driver ? `Condutor: ${driver}` : undefined}>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Qualquer com vaga</option>
        {vehicles.map((va) => (
          <option key={va.vehicle.id} value={va.vehicle.id}>
            {va.vehicle.name}
            {va.availableSeats > 0 ? ` · ${va.availableSeats} ${va.availableSeats === 1 ? 'vago' : 'vagos'}` : ' · Lotado'}
          </option>
        ))}
      </select>
    </Field>
  )
}

// ---------------------------------------------------------------------------
// Linha de inscrição (adulto ou criança)
// ---------------------------------------------------------------------------
const RegistrationRow: React.FC<{
  race: Race
  name: string
  personId?: string
  child?: boolean
  gender?: 'M' | 'F'
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
  personId,
  child,
  gender,
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

  const { isAdminView } = useApp()
  const radioName = useId()
  const cardRef = useRef<HTMLDivElement>(null)
  // Depois de uma ação o botão usado desaparece: o foco passa para o cartão da pessoa (e não para o <body>)
  const [actions, setActions] = useState(0)
  useEffect(() => {
    if (actions > 0) cardRef.current?.focus()
  }, [actions])
  const done = () => setActions((n) => n + 1)

  const isIndividual = race.category === 'individual'
  const firstName = name.split(' ')[0]
  // Os atletas pedem a inscrição (fica pendente); o administrador inscreve logo
  const submitLabel = existing
    ? 'Guardar'
    : isIndividual
    ? 'Vou participar'
    : isAdminView
    ? child && !isSelf
      ? `Inscrever ${firstName}`
      : 'Inscrever-me'
    : child && !isSelf
    ? `Pedir inscrição ${gender === 'F' ? 'da' : gender === 'M' ? 'do' : 'de'} ${firstName}`
    : 'Pedir inscrição'
  const usesVanSeat = Boolean(TRANSPORT_LABELS[transport]?.usesVanSeat)
  const existingVehicleName = existing?.vehicle_id
    ? vehicleAllocations.find((va) => va.vehicle.id === existing.vehicle_id)?.vehicle.name
    : undefined

  return (
    <div
      ref={cardRef}
      tabIndex={-1}
      role="group"
      aria-label={`Inscrição de ${name}: ${existing ? REG_STATUS_LABELS[existing.status].label : 'por fazer'}`}
      className="card-raised p-4 space-y-4"
    >
      <div className="flex items-center gap-3">
        <PersonAvatar id={personId} name={name} child={child} />
        <div className="min-w-0 flex-1">
          <div className="t-item text-[var(--text-1)] truncate">{name}</div>
          <div className="t-small text-[var(--text-2)] truncate">
            {existing && !editing
              ? `${existing.distance} · ${TRANSPORT_LABELS[existing.transport_mode].short}${existingVehicleName ? ` (${existingVehicleName})` : ''}`
              : child && !isSelf
              ? 'Criança a meu cargo'
              : 'Eu'}
          </div>
        </div>
        {trofeuDorsal && (
          <span className="flex flex-col items-end shrink-0">
            <span className="t-label text-[var(--text-2)]" aria-hidden="true">Dorsal 26/27</span>
            <span className="num text-[34px] text-[var(--link)]" aria-hidden="true">{trofeuDorsal}</span>
            <span className="sr-only">Dorsal do Troféu 2026/27: {trofeuDorsal}</span>
          </span>
        )}
      </div>
      {existing && (
        <div>
          <Tag tone={REG_STATUS_LABELS[existing.status].tone}>{REG_STATUS_LABELS[existing.status].label}</Tag>
        </div>
      )}

      {editing && !locked ? (
        <div className="space-y-4">
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
          <fieldset className="m-0 p-0 border-0 min-w-0">
            <legend className="p-0 w-full">
              <span className="flex items-baseline justify-between gap-3 pb-2">
                <span className="t-heading text-[var(--text-1)]">Como vais?</span>
                {race.van_available && vehicleAllocations.length > 0 && (
                  <span className="t-small t-strong text-[var(--link)] text-right">
                    {(() => {
                      const free = vehicleAllocations.reduce((s, va) => s + Math.max(0, va.availableSeats), 0)
                      return free > 0 ? `${free} ${free === 1 ? 'vaga' : 'vagas'} de transporte` : 'Carrinhas cheias'
                    })()}
                  </span>
                )}
              </span>
            </legend>
            <div className="rule-list">
              {transportOptions(race).map((t) => (
                <label key={t} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 items-center min-h-12 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name={radioName}
                    value={t}
                    checked={transport === t}
                    onChange={() => setTransport(t)}
                    className="w-[22px] h-[22px] m-0"
                  />
                  <span className="text-[16px] t-strong text-[var(--text-1)] leading-tight">{TRANSPORT_LABELS[t].label}</span>
                </label>
              ))}
            </div>
            <p className="t-small text-[var(--text-1)] pt-2.5">{TRANSPORT_HELP[transport]}</p>
          </fieldset>
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
                done()
              }}
            >
              {submitLabel}
            </Button>
            {existing && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false)
                  done()
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
          {!existing && !isIndividual && !isAdminView && (
            <p className="t-small text-[var(--text-3)]">O pedido fica pendente até o clube confirmar a inscrição.</p>
          )}
        </div>
      ) : (
        existing &&
        !locked && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setEditing(true)
                done()
              }}
            >
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
                  if (window.confirm(sure)) {
                    onCancel()
                    done()
                  }
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
    <div>
      <div className="flex items-center">
        {selectable && (
          <label className="w-11 h-14 flex items-center justify-center shrink-0 cursor-pointer -ml-2.5">
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
          className="flex-1 min-w-0 min-h-14 py-2 flex items-center gap-3 text-left cursor-pointer disabled:cursor-default row-link"
          disabled={!editable}
          aria-expanded={editable ? open : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <PersonAvatar id={reg.dependent_id || reg.athlete_id} name={reg.athlete_name} child={reg.is_dependent} size={36} />
          <div className="min-w-0 flex-1">
            <div className="t-body t-strong text-[var(--text-1)] truncate">{reg.athlete_name}</div>
            <div className="t-small text-[var(--text-3)] truncate">
              {reg.is_dependent && reg.parent_name ? `Resp. ${reg.parent_name} · ` : ''}
              {TRANSPORT_LABELS[reg.transport_mode].short}
              {reg.bib_status !== 'pending' || reg.bib_number
                ? ` · dorsal${reg.bib_number ? ' ' + reg.bib_number : ''}${admin && reg.bib_status !== 'pending' ? ' · ' + BIB_STATUS_LABELS[reg.bib_status].short.toLowerCase() : ''}`
                : ''}
            </div>
          </div>
          <Tag tone={REG_STATUS_LABELS[reg.status].tone}>{REG_STATUS_LABELS[reg.status].label}</Tag>
        </button>
      </div>
      {open && editable && (
        <div className="pb-4 pt-1 space-y-3">
          {admin && (
            <>
              <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
                <Field label="Estado">
                  <select
                    className={inputClass}
                    value={reg.status}
                    onChange={(e) => onPatch({ status: e.target.value as RaceRegistration['status'] })}
                  >
                    <option value="interested">{REG_STATUS_LABELS.interested.label}</option>
                    <option value="enrolled_by_admin">{REG_STATUS_LABELS.enrolled_by_admin.label}</option>
                  </select>
                </Field>
                <Field label="Dorsal">
                  <select
                    className={inputClass}
                    value={reg.bib_status}
                    onChange={(e) => onPatch({ bib_status: e.target.value as RaceRegistration['bib_status'] })}
                  >
                    <option value="pending">Sem dorsal</option>
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
    <div className="card-raised p-4 space-y-3">
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
      <div className="grid gap-3 lg:grid-cols-2">
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
