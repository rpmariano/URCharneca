import React, { useMemo, useState } from 'react'
import {
  X,
  Calendar,
  MapPin,
  Bus,
  CheckCircle2,
  Share2,
  Download,
  ExternalLink,
  ShieldCheck,
  Baby,
  Car,
  Sparkles,
  Plus,
  UserCheck,
  Check,
  Pencil,
  UserPlus,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Sheet } from './Sheet'
import type { Race, TransportMode } from '../types'
import {
  CATEGORIA_LABELS,
  TRANSPORT_LABELS,
} from '../types'
import {
  formatShortDate,
  computeVanAllocation,
  generateWhatsAppSummary,
  generateAdminInscriptionCSV,
} from '../utils/formatters'

interface Props {
  race: Race
  onClose: () => void
}

export const RaceDetailModal: React.FC<Props> = ({ race, onClose }) => {
  const {
    currentUser,
    profiles,
    youthAthletes,
    registrations,
    isAdminView,
    registerForRace,
    cancelRegistration,
    confirmAllPendingForRace,
    markAllBibsAtClubForRace,
    deleteRace,
    associateChildToAdult,
    showToast,
  } = useApp()

  const raceRegs = useMemo(
    () => registrations.filter((r) => r.race_id === race.id && r.status !== 'cancelled'),
    [registrations, race.id]
  )

  const myReg = useMemo(
    () => raceRegs.find((r) => r.athlete_id === currentUser.id && !r.is_dependent),
    [raceRegs, currentUser.id]
  )

  // Inscrições dos dependentes deste utilizador nesta corrida
  const myChildrenRegs = useMemo(
    () => raceRegs.filter((r) => r.athlete_id === currentUser.id && r.is_dependent),
    [raceRegs, currentUser.id]
  )

  // Opções de formulário
  const [distance, setDistance] = useState<string>(
    myReg?.distance || race.distances[0] || '10 km'
  )
  const [transportMode, setTransportMode] = useState<TransportMode>(
    myReg?.transport_mode || (race.van_available ? 'van_roundtrip' : 'meeting_point')
  )
  const [carpoolSeats, setCarpoolSeats] = useState<number>(3)
  const [showAdminTools, setShowAdminTools] = useState(false)
  const [isEditingAdult, setIsEditingAdult] = useState(false)

  // Gestão de inscrição manual pelo Admin
  const [showAdminAddAthlete, setShowAdminAddAthlete] = useState(false)
  const [adminAthleteId, setAdminAthleteId] = useState('')
  const [adminDistance, setAdminDistance] = useState(race.distances[0] || '10 km')
  const [adminTransport, setAdminTransport] = useState<TransportMode>(
    race.van_available ? 'van_roundtrip' : 'meeting_point'
  )

  // Estado para associar nova criança no momento
  const [showAddChildForm, setShowAddChildForm] = useState(false)
  const [selectedYouthIdToAssociate, setSelectedYouthIdToAssociate] = useState('')

  const availableClubChildren = useMemo(() => {
    return youthAthletes.filter(
      (c) =>
        !c.associated_adult_ids.includes(currentUser.id) &&
        c.associated_adult_ids.length < 2
    )
  }, [youthAthletes, currentUser.id])

  const availableAdultsForAdmin = useMemo(() => {
    const enrolledIds = new Set(raceRegs.map((r) => r.athlete_id))
    return profiles.filter((p) => !enrolledIds.has(p.id))
  }, [profiles, raceRegs])

  const van = useMemo(
    () => computeVanAllocation(race, raceRegs),
    [race, raceRegs]
  )

  const pendingAdminCount = useMemo(
    () => raceRegs.filter((r) => r.status === 'interested').length,
    [raceRegs]
  )

  // Filtro do plantel da corrida
  const [rosterFilter, setRosterFilter] = useState<'all' | 'van' | 'meeting' | 'youth'>('all')

  const vanCount = useMemo(
    () => raceRegs.filter((r) => TRANSPORT_LABELS[r.transport_mode]?.usesVanSeat).length,
    [raceRegs]
  )
  const meetingCount = useMemo(
    () => raceRegs.filter((r) => !TRANSPORT_LABELS[r.transport_mode]?.usesVanSeat).length,
    [raceRegs]
  )
  const youthCount = useMemo(
    () => raceRegs.filter((r) => r.is_dependent).length,
    [raceRegs]
  )

  const filteredRoster = useMemo(() => {
    if (rosterFilter === 'van') return raceRegs.filter((r) => TRANSPORT_LABELS[r.transport_mode]?.usesVanSeat)
    if (rosterFilter === 'meeting') return raceRegs.filter((r) => !TRANSPORT_LABELS[r.transport_mode]?.usesVanSeat)
    if (rosterFilter === 'youth') return raceRegs.filter((r) => r.is_dependent)
    return raceRegs
  }, [raceRegs, rosterFilter])

  const parseAthleteDisplay = (name: string, isDependent: boolean) => {
    let displayName = name
    let relationNote: string | null = null

    if (isDependent && name.includes('(')) {
      const match = name.match(/^([^(]+)\s*\(([^)]+)\)/)
      if (match) {
        displayName = match[1].trim()
        relationNote = match[2].trim()
      }
    }

    const initials = displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('')

    return { displayName, relationNote, initials }
  }

  const cleanDistanceLabel = (dist: string) => {
    return dist
      .replace(/\s*\(Seniores e Veteranos\)/gi, '')
      .replace(/\s*\(Sub-10 a Sub-18\)/gi, '')
  }

  // Associar criança da lista predefinida do clube e inscrevê-la
  const handleAddNewChild = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedYouthIdToAssociate) return

    const res = associateChildToAdult(selectedYouthIdToAssociate, currentUser.id)
    if (!res.success) return

    const child = youthAthletes.find((c) => c.id === selectedYouthIdToAssociate)
    if (!child) return

    // Inscrever logo a nova criança nesta corrida se for Troféu ou Equipa
    const youthDist =
      race.distances.find((d) => d.toLowerCase().includes('jov') || d.toLowerCase().includes('sub')) ||
      race.distances[0]

    registerForRace({
      race_id: race.id,
      athlete_id: currentUser.id,
      athlete_name: `${child.name} (${child.escalao})`,
      is_dependent: true,
      dependent_id: child.id,
      parent_name: currentUser.name,
      escalao: child.escalao,
      distance: youthDist,
      transport_mode: transportMode,
    })

    setSelectedYouthIdToAssociate('')
    setShowAddChildForm(false)
  }

  // Inscrever ou atualizar inscrição do adulto
  const handleRegisterAdult = (e: React.FormEvent) => {
    e.preventDefault()
    registerForRace({
      race_id: race.id,
      athlete_id: currentUser.id,
      athlete_name: currentUser.name,
      is_dependent: false,
      escalao: currentUser.escalao,
      distance,
      transport_mode: transportMode,
      carpool_seats: transportMode === 'carpool_offer' ? carpoolSeats : 0,
    })
    setIsEditingAdult(false)
  }

  // Inscrever uma criança já associada com escolha explícita de transporte
  const handleRegisterChildWithTransport = (depId: string, mode: TransportMode) => {
    const dep = currentUser.dependents.find((d) => d.id === depId)
    if (!dep) return
    const youthDist =
      race.distances.find((d) => d.toLowerCase().includes('jov') || d.toLowerCase().includes('sub')) ||
      race.distances[0]

    registerForRace({
      race_id: race.id,
      athlete_id: currentUser.id,
      athlete_name: `${dep.name} (${dep.escalao})`,
      is_dependent: true,
      dependent_id: dep.id,
      parent_name: currentUser.name,
      escalao: dep.escalao,
      distance: youthDist,
      transport_mode: mode,
    })
  }

  // Reserva rápida de lugar na carrinha ao tocar num banco livre
  const handleQuickReserveSeat = () => {
    if (!race.van_available) return

    if (myReg && myReg.transport_mode !== 'van_roundtrip') {
      registerForRace({
        race_id: race.id,
        athlete_id: currentUser.id,
        athlete_name: currentUser.name,
        is_dependent: false,
        escalao: currentUser.escalao,
        distance: myReg.distance,
        transport_mode: 'van_roundtrip',
      })
      showToast('O teu transporte foi atualizado para a Carrinha da Charneca!')
      return
    }

    const childNeedsVan = myChildrenRegs.find((c) => c.transport_mode !== 'van_roundtrip')
    if (childNeedsVan && childNeedsVan.dependent_id) {
      handleRegisterChildWithTransport(childNeedsVan.dependent_id, 'van_roundtrip')
      showToast(`Lugar na carrinha reservado para ${childNeedsVan.athlete_name}!`)
      return
    }

    setTransportMode('van_roundtrip')
    setIsEditingAdult(true)
    showToast('Selecionaste a Carrinha da Charneca! Confirma a inscrição abaixo.')
  }

  // Admin: Inscrever manualmente qualquer atleta do clube
  const handleAdminEnrollAthlete = (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminAthleteId) return
    const athlete = profiles.find((p) => p.id === adminAthleteId)
    if (!athlete) return

    registerForRace({
      race_id: race.id,
      athlete_id: athlete.id,
      athlete_name: athlete.name,
      is_dependent: false,
      escalao: athlete.escalao,
      distance: adminDistance,
      transport_mode: adminTransport,
    })
    setAdminAthleteId('')
    setShowAdminAddAthlete(false)
    showToast(`Atleta ${athlete.name} inscrito pelo Administrador com sucesso!`)
  }

  const handleCopyWhatsApp = async () => {
    const text = generateWhatsAppSummary(race, raceRegs)
    try {
      await navigator.clipboard.writeText(text)
      showToast('Resumo copiado para colar no WhatsApp!')
    } catch {
      showToast('Resumo pronto.')
    }
  }

  const handleDownloadCSV = () => {
    const csv = generateAdminInscriptionCSV(race, raceRegs, profiles)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inscricoes-${race.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Ficheiro CSV exportado com NIF e Escalão!')
  }

  const catMeta = CATEGORIA_LABELS[race.category]

  return (
    <Sheet onClose={onClose} ariaLabel={race.title}>
        {/* Header Elegante (fixo; o conteúdo abaixo faz scroll) */}
        <div className="px-5 pt-2 pb-3 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  race.category === 'trofeu_cascais'
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : race.category === 'equipa'
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}
              >
                {race.category === 'trofeu_cascais' && <Sparkles className="w-3 h-3 text-amber-600" />}
                {catMeta.label}
              </span>

              {race.registration_deadline && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Até {formatShortDate(race.registration_deadline)}
                </span>
              )}
            </div>

            <h2 className="font-display font-extrabold text-lg text-slate-900 leading-tight">
              {race.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Cartões Rápidos de Data e Local */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase font-bold text-slate-400">Quando</div>
                <div className="font-bold text-slate-900 truncate">{formatShortDate(race.date)}</div>
                <div className="text-[11px] text-slate-500">{race.start_time}</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase font-bold text-slate-400">Onde</div>
                <div className="font-bold text-slate-900 truncate">{race.location}</div>
                {race.external_url ? (
                  <a
                    href={race.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 truncate"
                  >
                    Site oficial <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <div className="text-[11px] text-slate-500">Ponto URC</div>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              1. INSCRIÇÕES JÁ CONFIRMADAS (ADULTO E/OU CRIANÇAS)
             ========================================================================= */}
          {(myReg || myChildrenRegs.length > 0) && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Inscrições Confirmadas na Família ({myReg ? 1 + myChildrenRegs.length : myChildrenRegs.length})
              </div>

              {/* Bilhete do Adulto */}
              {myReg && (
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white rounded-3xl p-4 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-white/20">
                    <span className="font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-200" />
                      {myReg.athlete_name} (Adulto)
                    </span>
                    <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      {myReg.distance}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-blue-200">{myReg.escalao}</div>
                      <div className="text-xs text-blue-100 flex items-center gap-1 mt-0.5">
                        <Bus className="w-3.5 h-3.5" />
                        {TRANSPORT_LABELS[myReg.transport_mode]?.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-blue-200 uppercase font-semibold">Dorsal</div>
                      <div className="font-mono font-black text-xl text-amber-300">
                        {myReg.bib_number ? `#${myReg.bib_number}` : 'A atribuir'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAdult(!isEditingAdult)
                        if (!isEditingAdult && myReg) {
                          setDistance(myReg.distance)
                          setTransportMode(myReg.transport_mode)
                        }
                      }}
                      className="text-amber-300 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer py-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {isEditingAdult ? 'Fechar Edição' : 'Alterar Prova / Carrinha'}
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelRegistration(myReg.id)}
                      className="text-rose-200 hover:text-white font-medium cursor-pointer py-1"
                    >
                      Anular inscrição
                    </button>
                  </div>
                </div>
              )}

              {/* Bilhetes das Crianças Inscritas */}
              {myChildrenRegs.map((cr) => (
                <div
                  key={cr.id}
                  className="bg-amber-50 border border-amber-200 rounded-3xl p-4 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                        👶
                      </div>
                      <div>
                        <span className="font-bold text-xs text-amber-950 block">
                          {cr.athlete_name}
                        </span>
                        <span className="text-[11px] text-amber-800">
                          {cr.distance} • {cr.escalao}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Inscrito(a)
                    </span>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-[11px] flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">Transporte:</span>
                      {race.van_available ? (
                        <button
                          type="button"
                          onClick={() => {
                            const newMode: TransportMode =
                              cr.transport_mode === 'van_roundtrip' ? 'meeting_point' : 'van_roundtrip'
                            handleRegisterChildWithTransport(cr.dependent_id || '', newMode)
                            showToast(
                              newMode === 'van_roundtrip'
                                ? `Lugar na carrinha reservado para ${cr.athlete_name}!`
                                : `Transporte de ${cr.athlete_name} alterado para Ponto de Encontro!`
                            )
                          }}
                          className={`px-2 py-0.5 rounded-md font-bold text-xs flex items-center gap-1 cursor-pointer transition ${
                            cr.transport_mode === 'van_roundtrip'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                          }`}
                          title="Toca para mudar de transporte"
                        >
                          <Bus className="w-3 h-3" />
                          {cr.transport_mode === 'van_roundtrip' ? 'Na Carrinha (Toca p/ mudar)' : 'Ponto de Encontro (Toca p/ Carrinha)'}
                        </button>
                      ) : (
                        <strong className="text-slate-900">{TRANSPORT_LABELS[cr.transport_mode]?.short}</strong>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelRegistration(cr.id)}
                      className="text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Anular inscrição
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =========================================================================
              2. SECÇÃO: INSCREVER CRIANÇAS / FILHOS ASSOCIADOS
             ========================================================================= */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-200 text-amber-950 flex items-center justify-center font-bold">
                  <Baby className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xs text-amber-950 uppercase tracking-wider">
                    Inscrição de Crianças Associadas
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Troféu de Cascais (Escalões Jovens: Benjamins, Infantis, Juvenis)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddChildForm(!showAddChildForm)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded-full transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddChildForm ? 'Fechar' : 'Associar Criança'}
              </button>
            </div>

            {/* Selecionar e Associar Criança da Lista Predefinida do Clube (Máx 2 Adultos) */}
            {showAddChildForm && (
              <form
                onSubmit={handleAddNewChild}
                className="bg-white border border-amber-300 rounded-2xl p-3.5 space-y-2.5 text-xs animate-in fade-in duration-150"
              >
                <div className="font-bold text-slate-900">
                  Associar Jovem Atleta da Lista Oficial da URC (Máx. 2 Adultos)
                </div>

                {availableClubChildren.length === 0 ? (
                  <p className="text-slate-500 text-[11px]">
                    Não há jovens atletas disponíveis com vagas livres no clube. Podes adicionar novos atletas no teu Perfil ou Plantel.
                  </p>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Escolhe a criança a associar ao teu perfil:
                    </label>
                    <select
                      value={selectedYouthIdToAssociate}
                      onChange={(e) => setSelectedYouthIdToAssociate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-semibold cursor-pointer"
                    >
                      <option value="">-- Selecionar Criança --</option>
                      {availableClubChildren.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name} ({child.escalao}) — {child.associated_adult_ids.length}/2 responsáveis
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddChildForm(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  {availableClubChildren.length > 0 && (
                    <button
                      type="submit"
                      disabled={!selectedYouthIdToAssociate}
                      className="flex-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold cursor-pointer shadow-xs"
                    >
                      Associar e Inscrever
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Lista de Crianças Já Associadas a este Adulto */}
            {currentUser.dependents.length === 0 ? (
              <p className="text-xs text-amber-900/80 bg-white/70 p-3 rounded-2xl border border-amber-200/50">
                Ainda não tens nenhuma criança associada ao teu perfil. Clica no botão acima para associar os teus filhos e inscrevê-los no Troféu de Cascais!
              </p>
            ) : (
              <div className="space-y-2">
                {currentUser.dependents.map((dep) => {
                  const depReg = myChildrenRegs.find((r) => r.dependent_id === dep.id)

                  return (
                    <div
                      key={dep.id}
                      className="bg-white border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{dep.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                            {dep.escalao}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          NIF: {dep.nif} • Data Nasc.: {dep.birth_date}
                        </div>
                      </div>

                      {depReg ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ {TRANSPORT_LABELS[depReg.transport_mode]?.short || 'Inscrito'}
                          </span>
                          {race.van_available && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextMode: TransportMode =
                                  depReg.transport_mode === 'van_roundtrip' ? 'meeting_point' : 'van_roundtrip'
                                handleRegisterChildWithTransport(dep.id, nextMode)
                                showToast(
                                  nextMode === 'van_roundtrip'
                                    ? `Lugar na carrinha reservado para ${dep.name}!`
                                    : `Transporte de ${dep.name} alterado para Ponto de Encontro!`
                                )
                              }}
                              className="text-[11px] font-bold text-blue-700 hover:underline px-1 py-0.5 cursor-pointer"
                            >
                              {depReg.transport_mode === 'van_roundtrip' ? 'Mudar p/ Pais' : 'Mudar p/ Carrinha'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {race.van_available && (
                            <button
                              type="button"
                              onClick={() => {
                                handleRegisterChildWithTransport(dep.id, 'van_roundtrip')
                                showToast(`Inscrição de ${dep.name} confirmada na Carrinha URC!`)
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition"
                              title="Inscrever com lugar na carrinha da equipa"
                            >
                              <Bus className="w-3.5 h-3.5" />
                              Carrinha
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              handleRegisterChildWithTransport(dep.id, 'meeting_point')
                              showToast(`Inscrição de ${dep.name} confirmada com os pais!`)
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition"
                            title="Inscrever para ir com os pais ao ponto de encontro"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Com Pais
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* =========================================================================
              3. FORMULÁRIO DE INSCRIÇÃO OU EDIÇÃO DO PRÓPRIO ADULTO
             ========================================================================= */}
          {(!myReg || isEditingAdult) && (
            <form onSubmit={handleRegisterAdult} className="bg-slate-50/70 border-2 border-blue-400/40 rounded-3xl p-4 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="font-display font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  {isEditingAdult ? 'Alterar a Minha Inscrição & Transporte' : `Inscrição do Adulto (${currentUser.name})`}
                </div>
                {isEditingAdult && (
                  <button
                    type="button"
                    onClick={() => setIsEditingAdult(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    ✕ Cancelar
                  </button>
                )}
              </div>

              {/* HIPÓTESE 1: ESCOLHA DA DISTÂNCIA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Qual é a tua distância / escalão?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {race.distances.map((d) => {
                    const isSelected = distance === d
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDistance(d)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className={`font-display font-black text-sm ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {d}
                          </div>
                          <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {currentUser.escalao}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* HIPÓTESE 2: COMO VAIS PARA A PROVA? (TRANSPORTE) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Como vais para a prova? (Transporte & Logística)
                </label>
                <div className="space-y-2">
                  {/* OPÇÃO 1: CARRINHA DA CHARNECA */}
                  {race.van_available && (
                    <div
                      onClick={() => setTransportMode('van_roundtrip')}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                        transportMode === 'van_roundtrip'
                          ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        transportMode === 'van_roundtrip' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Bus className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">
                            Carrinha da Charneca (Ida e Volta)
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            van.availableSeats > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {van.availableSeats > 0 ? `${van.availableSeats} vagas livres` : 'Lista de espera'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Saída às <strong>{race.van_departure_time || '07:15'}</strong> da {race.van_departure_location || 'Sociedade'}.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* OPÇÃO 2: PONTO DE ENCONTRO */}
                  <div
                    onClick={() => setTransportMode('meeting_point')}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      transportMode === 'meeting_point'
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      transportMode === 'meeting_point' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs text-slate-900 block">
                        Ponto de Encontro / Comboio
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {race.meeting_point || 'Concentração direta no local da prova com a equipa.'}
                      </p>
                    </div>
                  </div>

                  {/* OPÇÃO 3: BOLEIAS PARTICULARES */}
                  <div
                    onClick={() => setTransportMode('carpool_offer')}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      transportMode === 'carpool_offer'
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      transportMode === 'carpool_offer' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs text-slate-900 block">
                        Levo Carro Próprio e dou Boleia
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ajuda a transportar colegas se a carrinha estiver cheia.
                      </p>
                      {transportMode === 'carpool_offer' && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="text-slate-600">Quantos lugares livres tens?</span>
                          <input
                            type="number"
                            min={1}
                            max={8}
                            value={carpoolSeats}
                            onChange={(e) => setCarpoolSeats(Number(e.target.value))}
                            className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-slate-900"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE SUBMISSÃO */}
              <div className="flex items-center gap-2">
                {isEditingAdult && (
                  <button
                    type="button"
                    onClick={() => setIsEditingAdult(false)}
                    className="py-3 px-4 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-display font-bold text-sm shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isEditingAdult
                    ? 'Guardar Alterações da Inscrição'
                    : race.category === 'individual'
                    ? 'Confirmar Presença do Adulto'
                    : `Inscrever Adulto (${currentUser.name})`}
                </button>
              </div>
            </form>
          )}

          {/* VISUALIZAÇÃO DOS 9 LUGARES DA CARRINHA */}
          {race.van_available && (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 font-display font-bold text-xs text-slate-900">
                    <Bus className="w-4 h-4 text-blue-600" />
                    Carrinha da Sociedade U.R. Charneca
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Toca num banco livre para reservar o teu lugar ou do teu filho.
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full shrink-0">
                  {van.confirmedPassengers.length}/{van.capacity} Lugares Ocupados
                </span>
              </div>

              {/* Grid visual dos 9 lugares da carrinha */}
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: van.capacity }).map((_, i) => {
                  const pass = van.confirmedPassengers[i]
                  const isMe = pass && pass.athlete_id === currentUser.id && !pass.is_dependent
                  const isMyChild = pass && pass.athlete_id === currentUser.id && pass.is_dependent

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (!pass) {
                          handleQuickReserveSeat()
                        }
                      }}
                      className={`p-2.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center min-h-[58px] ${
                        isMe
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-400'
                          : isMyChild
                          ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold shadow-xs'
                          : pass
                          ? 'bg-white border-blue-200 shadow-2xs'
                          : 'bg-white/80 border-dashed border-slate-300 text-blue-600 hover:bg-blue-50/80 hover:border-blue-400 active:scale-95'
                      }`}
                    >
                      <div className={`text-[11px] font-bold ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                        Banco #{i + 1}
                      </div>
                      <div className={`font-bold text-xs truncate mt-0.5 max-w-[90px] ${
                        isMe ? 'text-white' : pass ? 'text-slate-900' : 'text-blue-600'
                      }`}>
                        {isMe
                          ? '⭐ Tu'
                          : isMyChild
                          ? `👶 ${pass.athlete_name.split(' ')[0]}`
                          : pass
                          ? pass.athlete_name.split(' ')[0]
                          : '+ Reservar'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* QUEM VAI DA EQUIPA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  Armada Azul Inscrita ({raceRegs.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  {vanCount} na carrinha • {meetingCount} ponto de encontro {youthCount > 0 ? `• ${youthCount} jovens` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                Copiar p/ WhatsApp
              </button>
            </div>

            {/* Filtros rápidos do plantel */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setRosterFilter('all')}
                className={`px-3.5 py-2 min-h-[40px] sm:min-h-[44px] inline-flex items-center rounded-full font-bold transition cursor-pointer ${
                  rosterFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({raceRegs.length})
              </button>
              {race.van_available && (
                <button
                  type="button"
                  onClick={() => setRosterFilter('van')}
                  className={`px-3.5 py-2 min-h-[40px] sm:min-h-[44px] inline-flex items-center gap-1 rounded-full font-bold transition cursor-pointer ${
                    rosterFilter === 'van'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Bus className="w-3.5 h-3.5" />
                  Carrinha ({vanCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setRosterFilter('meeting')}
                className={`px-3.5 py-2 min-h-[40px] sm:min-h-[44px] inline-flex items-center gap-1 rounded-full font-bold transition cursor-pointer ${
                  rosterFilter === 'meeting'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Ponto Encontro ({meetingCount})
              </button>
              {youthCount > 0 && (
                <button
                  type="button"
                  onClick={() => setRosterFilter('youth')}
                  className={`px-3.5 py-2 min-h-[40px] sm:min-h-[44px] inline-flex items-center gap-1 rounded-full font-bold transition cursor-pointer ${
                    rosterFilter === 'youth'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Baby className="w-3.5 h-3.5" />
                  Jovens ({youthCount})
                </button>
              )}
            </div>

            {/* Lista Refinada de Atletas Inscritos */}
            <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
              {filteredRoster.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Nenhum atleta corresponde a este filtro.
                </div>
              ) : (
                filteredRoster.map((reg) => {
                  const { displayName, relationNote, initials } = parseAthleteDisplay(
                    reg.athlete_name,
                    reg.is_dependent
                  )
                  const isVan = TRANSPORT_LABELS[reg.transport_mode]?.usesVanSeat
                  const distLabel = cleanDistanceLabel(reg.distance)

                  return (
                    <div
                      key={reg.id}
                      className="px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar com Iniciais ou Criança */}
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                            reg.is_dependent
                              ? 'bg-amber-100/70 text-amber-900 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                          }`}
                        >
                          {reg.is_dependent ? (
                            <span title="Escalão Jovem">👶</span>
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>

                        {/* Dados do Atleta */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                            <span className="font-bold text-xs text-slate-900">
                              {displayName}
                            </span>

                            {relationNote && (
                              <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded font-medium truncate max-w-[140px]">
                                {relationNote}
                              </span>
                            )}

                            {reg.bib_number && (
                              <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                #{reg.bib_number}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                            <span className="font-medium text-slate-700">
                              {distLabel}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                isVan ? 'text-blue-700' : 'text-slate-600'
                              }`}
                            >
                              {isVan ? (
                                <Bus className="w-3 h-3 text-blue-600" />
                              ) : (
                                <MapPin className="w-3 h-3 text-slate-400" />
                              )}
                              {TRANSPORT_LABELS[reg.transport_mode]?.short}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Estado do Dorsal (badge compacto e elegante em 1 linha) */}
                      <div className="shrink-0 flex items-center">
                        {reg.bib_status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Entregue
                          </span>
                        ) : reg.bib_status === 'at_club' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            No clube
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            Por levantar
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* FERRAMENTAS DE ADMINISTRAÇÃO DISCRETAS */}
          {isAdminView && (
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAdminTools(!showAdminTools)}
                className="w-full flex items-center justify-between py-2 text-xs font-bold text-amber-900 hover:text-amber-950 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Painel de Gestão do Administrador ({pendingAdminCount} pendentes)
                </span>
                <span className="text-xs bg-amber-200/80 px-2 py-0.5 rounded-full font-bold">
                  {showAdminTools ? 'Recolher ▲' : 'Expandir Ações ▼'}
                </span>
              </button>

              {showAdminTools && (
                <div className="mt-2 p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      Coordenação da Armada Azul nesta Prova
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Ferramentas exclusivas para validar inscrições oficiais, descarregar ficheiros de submissão e gerir dorsais.
                    </p>
                  </div>

                  {/* 1. VALIDAÇÃO DAS INSCRIÇÕES PENDENTES */}
                  <div className="bg-white/90 border border-amber-200 p-3 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">1. Validação de Inscrições</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pendingAdminCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {pendingAdminCount > 0 ? `${pendingAdminCount} a aguardar aprovação` : 'Todas Aprovadas ✓'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Aprova os atletas em lista de espera para fechar a folha da equipa.
                    </p>
                    {pendingAdminCount > 0 && (
                      <button
                        type="button"
                        onClick={() => confirmAllPendingForRace(race.id)}
                        className="w-full mt-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs active:scale-98 transition flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aprovar Todas as Inscrições ({pendingAdminCount})
                      </button>
                    )}
                  </div>

                  {/* 2. EXPORTAR FOLHA CSV OFICIAL */}
                  <div className="bg-white/90 border border-amber-200 p-3 rounded-xl space-y-1.5">
                    <div className="font-bold text-slate-900">2. Exportação para a Organização</div>
                    <p className="text-[11px] text-slate-500">
                      Gera uma folha de cálculo com Nome, NIF, Cartão de Cidadão, Data de Nascimento e Escalão para submeter na plataforma oficial da corrida.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadCSV}
                      className="w-full py-2 px-3 rounded-xl bg-white border-2 border-amber-400 text-amber-950 hover:bg-amber-50 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-700" />
                      Descarregar Ficheiro CSV (NIF / CC)
                    </button>
                  </div>

                  {/* 3. LOGÍSTICA DE DORSAIS */}
                  <div className="bg-white/90 border border-amber-200 p-3 rounded-xl space-y-1.5">
                    <div className="font-bold text-slate-900">3. Levantamento de Dorsais</div>
                    <p className="text-[11px] text-slate-500">
                      Clica aqui assim que a direção levantar os dorsais na organização. Todos os atletas receberão notificação na app.
                    </p>
                    <button
                      type="button"
                      onClick={() => markAllBibsAtClubForRace(race.id, currentUser.name)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Marcar Dorsais no Clube (Levantados)
                    </button>
                  </div>

                  {/* 4. INSCREVER ATLETA MANUALMENTE (WHATSAPP / A PEDIDO) */}
                  <div className="bg-white/90 border border-amber-200 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">4. Inscrever Atleta Manualmente</div>
                        <p className="text-[11px] text-slate-500">
                          Se um atleta pediu inscrição por WhatsApp, adiciona-o aqui diretamente.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAdminAddAthlete(!showAdminAddAthlete)}
                        className="px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs shrink-0 cursor-pointer"
                      >
                        {showAdminAddAthlete ? 'Fechar' : '+ Inscrever'}
                      </button>
                    </div>

                    {showAdminAddAthlete && (
                      <form onSubmit={handleAdminEnrollAthlete} className="pt-2 border-t border-slate-100 space-y-2 text-xs animate-in fade-in duration-150">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Atleta da URC:
                          </label>
                          <select
                            value={adminAthleteId}
                            onChange={(e) => setAdminAthleteId(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-semibold"
                          >
                            <option value="">-- Escolher Atleta --</option>
                            {availableAdultsForAdmin.map((ath) => (
                              <option key={ath.id} value={ath.id}>
                                {ath.name} ({ath.escalao})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Distância:
                            </label>
                            <select
                              value={adminDistance}
                              onChange={(e) => setAdminDistance(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-semibold"
                            >
                              {race.distances.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Transporte:
                            </label>
                            <select
                              value={adminTransport}
                              onChange={(e) => setAdminTransport(e.target.value as TransportMode)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-semibold"
                            >
                              {race.van_available && <option value="van_roundtrip">🚐 Carrinha</option>}
                              <option value="meeting_point">📍 Ponto Encontro</option>
                              <option value="carpool_offer">🚗 Carro Próprio</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={!adminAthleteId}
                          className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Confirmar Inscrição no Plantel
                        </button>
                      </form>
                    )}
                  </div>

                  {/* 5. ELIMINAR PROVA */}
                  <div className="pt-2 border-t border-amber-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Tens a certeza que queres eliminar a prova "${race.title}" do calendário?`)) {
                          deleteRace(race.id)
                          onClose()
                        }
                      }}
                      className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
                    >
                      Eliminar esta prova do calendário
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Saída explícita no fim do conteúdo */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer transition"
          >
            ← Voltar
          </button>
        </div>
    </Sheet>
  )
}
