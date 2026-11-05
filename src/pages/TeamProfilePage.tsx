import React, { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Download,
  Search,
  Baby,
  Save,
  Phone,
  Shield,
  HeartPulse,
  Shirt,
  AlertCircle,
  Check,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLocation } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { ESCALOES_ATLETISMO } from '../types'
import type { AthleteProfile, UserRole } from '../types'
import { calculateAge, estimateEscalao } from '../utils/formatters'

export const TeamProfilePage: React.FC = () => {
  const {
    profiles,
    youthAthletes,
    races,
    registrations,
    currentUser,
    isAdminView,
    updateProfile,
    addAthleteProfile,
    addYouthAthlete,
    removeYouthAthlete,
    associateChildToAdult,
    disassociateChildFromAdult,
    confirmAllPendingForRace,
    markAllBibsAtClubForRace,
    showToast,
  } = useApp()

  // Separado em duas páginas distintas conforme a rota:
  //   /perfil -> Exclusivamente o Perfil Pessoal do Atleta (acessível pelo Header)
  //   /equipa -> Menu de Administração & Plantel (acessível pela BottomNav)
  const location = useLocation()
  const tab: 'profile' | 'team' = location.pathname.startsWith('/equipa') ? 'team' : 'profile'
  const [teamSubTab, setTeamSubTab] = useState<'adults' | 'youth'>('adults')

  // =========================================================================
  // DADOS DA MINHA FICHA (ADULTO)
  // =========================================================================
  const [name, setName] = useState(currentUser.name)
  const [nickname, setNickname] = useState(currentUser.nickname)
  const [gender, setGender] = useState<'M' | 'F'>(currentUser.gender || 'M')
  const [phone, setPhone] = useState(currentUser.phone)
  const [email, setEmail] = useState(currentUser.email)
  const [birthDate, setBirthDate] = useState(currentUser.birth_date)
  const [escalao, setEscalao] = useState(currentUser.escalao)
  const [nif, setNif] = useState(currentUser.nif)
  const [ccNumber, setCcNumber] = useState(currentUser.cc_number)
  const [clubMemberNumber, setClubMemberNumber] = useState(currentUser.club_member_number || '')
  const [federationNumber, setFederationNumber] = useState(currentUser.federation_number || '')

  // Contactos & Morada
  const [address, setAddress] = useState(currentUser.address || '')
  const [city, setCity] = useState(currentUser.city || '')
  const [postalCode, setPostalCode] = useState(currentUser.postal_code || '')

  // Contactos de Emergência
  const [emergencyName, setEmergencyName] = useState(currentUser.emergency_name || '')
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser.emergency_phone || '')
  const [emergencyRelation, setEmergencyRelation] = useState(currentUser.emergency_relation || 'Cônjuge')

  // Equipamento & Físico
  const [shirtSize, setShirtSize] = useState<AthleteProfile['shirt_size']>(currentUser.shirt_size)
  const [shortsSize, setShortsSize] = useState<AthleteProfile['shorts_size']>(currentUser.shorts_size || 'M')
  const [heightCm, setHeightCm] = useState<string>(currentUser.height_cm ? String(currentUser.height_cm) : '')
  const [weightKg, setWeightKg] = useState<string>(currentUser.weight_kg ? String(currentUser.weight_kg) : '')
  const [bloodType, setBloodType] = useState<AthleteProfile['blood_type']>(currentUser.blood_type || 'Desconhecido')
  const [medicalNotes, setMedicalNotes] = useState(currentUser.medical_notes || '')
  const [hasKit, setHasKit] = useState(currentUser.has_official_kit)

  useEffect(() => {
    setName(currentUser.name)
    setNickname(currentUser.nickname)
    setGender(currentUser.gender || 'M')
    setPhone(currentUser.phone)
    setEmail(currentUser.email)
    setBirthDate(currentUser.birth_date)
    setEscalao(currentUser.escalao)
    setNif(currentUser.nif)
    setCcNumber(currentUser.cc_number)
    setClubMemberNumber(currentUser.club_member_number || '')
    setFederationNumber(currentUser.federation_number || '')
    setAddress(currentUser.address || '')
    setCity(currentUser.city || '')
    setPostalCode(currentUser.postal_code || '')
    setEmergencyName(currentUser.emergency_name || '')
    setEmergencyPhone(currentUser.emergency_phone || '')
    setEmergencyRelation(currentUser.emergency_relation || 'Cônjuge')
    setShirtSize(currentUser.shirt_size)
    setShortsSize(currentUser.shorts_size || 'M')
    setHeightCm(currentUser.height_cm ? String(currentUser.height_cm) : '')
    setWeightKg(currentUser.weight_kg ? String(currentUser.weight_kg) : '')
    setBloodType(currentUser.blood_type || 'Desconhecido')
    setMedicalNotes(currentUser.medical_notes || '')
    setHasKit(currentUser.has_official_kit)
  }, [currentUser])

  // Calcular idade e sugerir escalão se mudar a data de nascimento
  const currentAge = useMemo(() => calculateAge(birthDate), [birthDate])

  const handleBirthDateChange = (val: string) => {
    setBirthDate(val)
    if (val) {
      const estimated = estimateEscalao(val, gender)
      setEscalao(estimated)
    }
  }

  const handleGenderChange = (val: 'M' | 'F') => {
    setGender(val)
    if (birthDate) {
      setEscalao(estimateEscalao(birthDate, val))
    }
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile({
      ...currentUser,
      name: name.trim(),
      nickname: nickname.trim(),
      gender,
      phone: phone.trim(),
      email: email.trim(),
      birth_date: birthDate,
      escalao,
      nif: nif.trim(),
      cc_number: ccNumber.trim(),
      club_member_number: clubMemberNumber.trim() || undefined,
      federation_number: federationNumber.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      postal_code: postalCode.trim() || undefined,
      emergency_name: emergencyName.trim() || undefined,
      emergency_phone: emergencyPhone.trim() || undefined,
      emergency_relation: emergencyRelation.trim() || undefined,
      shirt_size: shirtSize,
      shorts_size: shortsSize,
      height_cm: heightCm ? Number(heightCm) : undefined,
      weight_kg: weightKg ? Number(weightKg) : undefined,
      blood_type: bloodType,
      medical_notes: medicalNotes.trim() || undefined,
      has_official_kit: hasKit,
    })
  }

  // =========================================================================
  // GESTÃO DE CRIANÇAS / ASSOCIAÇÃO AO PERFIL (MÁXIMO 2 ADULTOS)
  // =========================================================================
  const [associateModalOpen, setAssociateModalOpen] = useState(false)
  const [newChildModalOpen, setNewChildModalOpen] = useState(false)

  // Crianças associadas ao adulto com sessão ativa
  const myAssociatedChildren = useMemo(() => {
    return youthAthletes.filter((c) => c.associated_adult_ids.includes(currentUser.id))
  }, [youthAthletes, currentUser.id])

  // Campos para registo de nova criança no clube (Admin)
  const [childFormName, setChildFormName] = useState('')
  const [childFormBirth, setChildFormBirth] = useState('2014-06-15')
  const [childFormEscalao, setChildFormEscalao] = useState('Infantis (Sub-14)')
  const [childFormNif, setChildFormNif] = useState('')
  const [childFormCc, setChildFormCc] = useState('')
  const [childFormShirt, setChildFormShirt] = useState('10-12 anos')
  const [childFormMedical, setChildFormMedical] = useState('')

  const handleChildBirthChange = (val: string) => {
    setChildFormBirth(val)
    if (val) {
      setChildFormEscalao(estimateEscalao(val, 'M'))
    }
  }

  const handleCreateNewYouthAthlete = (e: React.FormEvent) => {
    e.preventDefault()
    if (!childFormName.trim() || !childFormNif.trim()) return

    const newChild = addYouthAthlete({
      name: childFormName.trim(),
      birth_date: childFormBirth,
      escalao: childFormEscalao,
      nif: childFormNif.trim(),
      cc_number: childFormCc.trim() || undefined,
      shirt_size: childFormShirt,
      medical_notes: childFormMedical.trim() || undefined,
    })

    // Se o próprio utilizador quiser associá-la imediatamente
    associateChildToAdult(newChild.id, currentUser.id)

    setChildFormName('')
    setChildFormNif('')
    setChildFormCc('')
    setChildFormMedical('')
    setNewChildModalOpen(false)
  }

  // Pesquisa Plantel
  const [search, setSearch] = useState('')
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberPhone, setNewMemberPhone] = useState('+351 ')
  const [newMemberEscalao, setNewMemberEscalao] = useState<string>('Seniores M')
  const [newMemberNif, setNewMemberNif] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('athlete')

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim()) return
    addAthleteProfile({
      name: newMemberName.trim(),
      nickname: newMemberName.trim().split(' ')[0],
      email: `${newMemberName.toLowerCase().replace(/\s+/g, '.')}@urcharneca.pt`,
      phone: newMemberPhone.trim(),
      role: newMemberRole,
      birth_date: '1985-01-01',
      escalao: newMemberEscalao,
      nif: newMemberNif.trim() || '—',
      cc_number: '—',
      shirt_size: 'M',
      has_official_kit: false,
      dependents: [],
    })
    setNewMemberName('')
    setNewMemberNif('')
    setAddMemberOpen(false)
  }

  const handleToggleRole = (prof: AthleteProfile) => {
    const nextRole: UserRole = prof.role === 'admin' ? 'athlete' : 'admin'
    updateProfile({ ...prof, role: nextRole })
  }

  const handleExportCSV = () => {
    const headers = [
      'Tipo',
      'Nome Completo',
      'Escalão',
      'Data Nasc.',
      'Idade',
      'NIF',
      'CC / BI',
      'Nº Sócio / Licença',
      'Telefone',
      'Email',
      'Contacto Emergência',
      'Tel. Emergência',
      'Parentesco Emergência',
      'T-Shirt',
      'Calções',
      'Altura (cm)',
      'Peso (kg)',
      'Grupo Sanguíneo',
      'Notas Médicas / Alergias',
      'Equipamento Oficial',
      'Responsáveis Associados',
    ]

    const rows: string[] = []

    // 1. Atletas Adultos
    for (const p of profiles) {
      const age = calculateAge(p.birth_date)
      rows.push(
        [
          'Atleta Adulto',
          p.name,
          p.escalao,
          p.birth_date,
          String(age),
          p.nif,
          p.cc_number,
          p.club_member_number || p.federation_number || '',
          p.phone,
          p.email,
          p.emergency_name || '',
          p.emergency_phone || '',
          p.emergency_relation || '',
          p.shirt_size,
          p.shorts_size || '',
          p.height_cm ? String(p.height_cm) : '',
          p.weight_kg ? String(p.weight_kg) : '',
          p.blood_type || '',
          p.medical_notes || '',
          p.has_official_kit ? 'Sim' : 'Não',
          '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(';')
      )
    }

    // 2. Jovens Atletas da U.R. Charneca
    for (const y of youthAthletes) {
      const age = calculateAge(y.birth_date)
      const guardianNames = y.associated_adult_ids
        .map((aId) => profiles.find((p) => p.id === aId)?.name || 'Adulto')
        .join(' & ')

      const firstGuardian = profiles.find((p) => p.id === y.associated_adult_ids[0])

      rows.push(
        [
          'Jovem / Criança',
          y.name,
          y.escalao,
          y.birth_date,
          String(age),
          y.nif,
          y.cc_number || '',
          '',
          firstGuardian ? firstGuardian.phone : '',
          '',
          firstGuardian ? firstGuardian.emergency_name || firstGuardian.name : '',
          firstGuardian ? firstGuardian.emergency_phone || firstGuardian.phone : '',
          'Encarregado Educação',
          y.shirt_size || '',
          '',
          '',
          '',
          '',
          y.medical_notes || '',
          'Sim',
          guardianNames || 'Sem responsável associado',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(';')
      )
    }

    const csv = [headers.join(';'), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantel-completo-urcharneca.csv'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Ficheiro CSV completo (Adultos + Jovens) exportado com sucesso!')
  }

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return profiles
    const q = search.toLowerCase()
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.escalao.toLowerCase().includes(q) ||
        p.nif.includes(q) ||
        (p.emergency_name && p.emergency_name.toLowerCase().includes(q))
    )
  }, [profiles, search])

  const filteredYouth = useMemo(() => {
    if (!search.trim()) return youthAthletes
    const q = search.toLowerCase()
    return youthAthletes.filter(
      (y) =>
        y.name.toLowerCase().includes(q) ||
        y.escalao.toLowerCase().includes(q) ||
        y.nif.includes(q)
    )
  }, [youthAthletes, search])

  return (
    <div className="space-y-4 pb-12 pt-2">
      {/* =========================================================================
          PÁGINA (/perfil): A MINHA FICHA DE ATLETA (EXCLUSIVA DO HEADER)
         ========================================================================= */}
      {tab === 'profile' && (
        <div className="space-y-4">
          <div>
            <h1 className="font-display font-extrabold text-xl text-[var(--text-1)] tracking-tight">
              O Meu Perfil
            </h1>
            <p className="text-xs text-[var(--text-3)] mt-0.5">
              Dados pessoais para inscrições automáticas e crianças associadas
            </p>
          </div>

          {/* Cartão de identidade do atleta */}
          <div className="iron-card p-4 flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center font-display font-black text-lg shrink-0 shadow-md">
              {currentUser.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0].toUpperCase())
                .join('')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-extrabold text-base text-[var(--text-1)] truncate">
                {currentUser.name}
              </div>
              <div className="text-xs text-sky-400 font-semibold">{currentUser.escalao}</div>
              <div className="text-[11px] text-[var(--text-3)] mt-0.5">
                {currentUser.role === 'admin' ? 'Coordenador / Admin' : 'Atleta'} •{' '}
                {myAssociatedChildren.length} criança(s) associada(s)
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* 1. DADOS DE IDENTIFICAÇÃO E FEDERAÇÃO */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Identificação & Provas
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Dados oficiais para inscrições automáticas em provas e no Troféu de Cascais.
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {currentAge} anos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="profile-name" className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="profile-nickname" className="block font-semibold text-slate-700 mb-1">Nome no Dorsal / Alcunha</label>
                  <input
                    id="profile-nickname"
                    type="text"
                    autoComplete="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ex: Rui"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="profile-gender" className="block font-semibold text-slate-700 mb-1">Género</label>
                  <select
                    id="profile-gender"
                    value={gender}
                    onChange={(e) => handleGenderChange(e.target.value as 'M' | 'F')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-medium cursor-pointer"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="profile-birthdate" className="block font-semibold text-slate-700 mb-1">Data Nascimento *</label>
                  <input
                    id="profile-birthdate"
                    type="date"
                    required
                    autoComplete="bday"
                    value={birthDate}
                    onChange={(e) => handleBirthDateChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="profile-escalao" className="block font-semibold text-slate-700 mb-1">Escalão</label>
                  <select
                    id="profile-escalao"
                    value={escalao}
                    onChange={(e) => setEscalao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-900 font-semibold cursor-pointer truncate"
                  >
                    {ESCALOES_ATLETISMO.map((esc) => (
                      <option key={esc} value={esc}>
                        {esc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="profile-nif" className="block font-semibold text-slate-700 mb-1">NIF * (Inscrições)</label>
                  <input
                    id="profile-nif"
                    type="text"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{9}"
                    maxLength={9}
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    placeholder="9 dígitos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label htmlFor="profile-cc" className="block font-semibold text-slate-700 mb-1">Cartão de Cidadão / BI</label>
                  <input
                    id="profile-cc"
                    type="text"
                    value={ccNumber}
                    onChange={(e) => setCcNumber(e.target.value)}
                    placeholder="Para levantar dorsal"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label htmlFor="profile-club-member" className="block font-semibold text-slate-700 mb-1">Nº de Sócio URC</label>
                  <input
                    id="profile-club-member"
                    type="text"
                    value={clubMemberNumber}
                    onChange={(e) => setClubMemberNumber(e.target.value)}
                    placeholder="Ex: URC-142"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="profile-federation-num" className="block font-semibold text-slate-700 mb-1">Nº Licença Federativa FPA</label>
                  <input
                    id="profile-federation-num"
                    type="text"
                    value={federationNumber}
                    onChange={(e) => setFederationNumber(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. DADOS DE CONTACTO & LOCALIDADE */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-3 shadow-2xs">
              <h2 className="font-display font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-600" />
                Contactos Pessoais
              </h2>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="profile-phone" className="block font-semibold text-slate-700 mb-1">Telemóvel / WhatsApp *</label>
                  <input
                    id="profile-phone"
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="profile-email" className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="profile-address" className="block font-semibold text-slate-700 mb-1">Morada / Freguesia</label>
                  <input
                    id="profile-address"
                    type="text"
                    autoComplete="street-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Charneca, Alcabideche"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="profile-city" className="block font-semibold text-slate-700 mb-1">Concelho</label>
                  <input
                    id="profile-city"
                    type="text"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cascais"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 3. CONTACTO DE EMERGÊNCIA (ESSENCIAL PARA PROVAS E TREINOS) */}
            <div className="bg-rose-50/60 border border-rose-200 rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-sm text-rose-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Contacto de Emergência
                </h2>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-full">
                  Segurança em Prova
                </span>
              </div>
              <p className="text-[11px] text-rose-800/80">
                A quem os coordenadores ou o serviço de primeiros socorros devem ligar em caso de imprevisto numa prova ou treino.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="profile-emergency-name" className="block font-semibold text-slate-700 mb-1">Nome do Contacto</label>
                  <input
                    id="profile-emergency-name"
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Ex: Patrícia Mariano"
                    className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="profile-emergency-relation" className="block font-semibold text-slate-700 mb-1">Parentesco</label>
                  <select
                    id="profile-emergency-relation"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    className="w-full bg-white border border-rose-200 rounded-xl px-2 py-2 text-slate-900 cursor-pointer"
                  >
                    <option value="Cônjuge">Cônjuge</option>
                    <option value="Pai/Mãe">Pai/Mãe</option>
                    <option value="Filho(a)">Filho(a)</option>
                    <option value="Irmão/Irmã">Irmão/Irmã</option>
                    <option value="Amigo(a)">Amigo(a)</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="profile-emergency-phone" className="block font-semibold text-slate-700 mb-1">Telefone de Emergência</label>
                <input
                  id="profile-emergency-phone"
                  type="tel"
                  inputMode="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+351 919 ..."
                  className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-slate-900 font-medium"
                />
              </div>
            </div>

            {/* 4. EQUIPAMENTO, TAMANHOS & SAÚDE DESPORTIVA */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-3 shadow-2xs">
              <h2 className="font-display font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Shirt className="w-4 h-4 text-blue-600" />
                Equipamento & Físico do Atleta
              </h2>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="profile-shirt-size" className="block font-semibold text-slate-700 mb-1">T-Shirt / Camisola Armada Azul</label>
                  <select
                    id="profile-shirt-size"
                    value={shirtSize}
                    onChange={(e) => setShirtSize(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-bold cursor-pointer"
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="profile-shorts-size" className="block font-semibold text-slate-700 mb-1">Calções / Fato de Treino</label>
                  <select
                    id="profile-shorts-size"
                    value={shortsSize}
                    onChange={(e) => setShortsSize(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-bold cursor-pointer"
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="profile-height" className="block font-semibold text-slate-700 mb-1">Altura (cm)</label>
                  <input
                    id="profile-height"
                    type="number"
                    inputMode="numeric"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="178"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="profile-weight" className="block font-semibold text-slate-700 mb-1">Peso (kg)</label>
                  <input
                    id="profile-weight"
                    type="number"
                    inputMode="numeric"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="74"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="profile-blood-type" className="block font-semibold text-slate-700 mb-1">Grupo Sangue</label>
                  <select
                    id="profile-blood-type"
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1.5 py-2 text-slate-900 font-semibold cursor-pointer"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="Desconhecido">N/D</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="profile-medical-notes" className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                  Alergias / Condições Médicas Relevantes
                </label>
                <input
                  id="profile-medical-notes"
                  type="text"
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Ex: Asma de esforço, alergia a picada de abelha, nenhuma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <label htmlFor="profile-kit-checkbox" className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  id="profile-kit-checkbox"
                  type="checkbox"
                  checked={hasKit}
                  onChange={(e) => setHasKit(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span className="text-slate-800 font-semibold">
                  Já possuo o equipamento oficial da Armada Azul (U.R. Charneca)
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 transition text-sm"
            >
              <Save className="w-4 h-4" />
              Guardar Alterações da Ficha
            </button>
          </form>

          {/* =========================================================================
              SECÇÃO: CRIANÇAS / JOVENS ATLETAS ASSOCIADOS (MÁXIMO 2 ADULTOS)
             ========================================================================= */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-3xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Baby className="w-4 h-4 text-amber-600" />
                  Crianças Associadas ao Meu Perfil ({myAssociatedChildren.length})
                </h3>
                <p className="text-[11px] text-amber-900/80 mt-0.5">
                  Cada jovem atleta pode estar associado a no <strong>máximo 2 adultos</strong> (ex: pai e mãe).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAssociateModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Associar Criança
              </button>
            </div>

            {/* Lista das crianças associadas a este adulto */}
            {myAssociatedChildren.length === 0 ? (
              <div className="p-3 bg-white/80 rounded-2xl border border-dashed border-amber-300 text-center text-xs text-amber-900/80">
                Ainda não tens nenhuma criança associada. Clica em <strong>"Associar Criança"</strong> para selecionar os teus filhos da lista predefinida da U.R. Charneca!
              </div>
            ) : (
              <div className="space-y-2">
                {myAssociatedChildren.map((child) => {
                  const otherAdultIds = child.associated_adult_ids.filter((id) => id !== currentUser.id)
                  const otherAdult = otherAdultIds.length > 0 ? profiles.find((p) => p.id === otherAdultIds[0]) : null

                  return (
                    <div
                      key={child.id}
                      className="bg-white border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center font-bold text-amber-900 text-sm shrink-0">
                          👶
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {child.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                              {child.escalao}
                            </span>
                            <span>NIF: <span className="font-mono font-bold text-slate-700">{child.nif}</span></span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {otherAdult ? (
                              <span className="text-blue-700 font-medium">
                                2/2 responsáveis: Tu e {otherAdult.name}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">
                                1/2 responsáveis: Tu (vaga livre para 2º responsável)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => disassociateChildFromAdult(child.id, currentUser.id)}
                        className="px-2.5 py-1 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold cursor-pointer shrink-0 transition"
                      >
                        Desassociar
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          PÁGINA (/equipa): MENU DE ADMINISTRAÇÃO & PLANTEL DA EQUIPA
         ========================================================================= */}
      {tab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-xl text-[var(--text-1)] tracking-tight">
                  Administração & Plantel
                </h1>
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-400/30">
                  ADMIN
                </span>
              </div>
              <p className="text-xs text-[var(--text-3)] mt-0.5">
                Gestão de inscrições em provas, dorsais, atletas adultos e jovens URC
              </p>
            </div>
          </div>

          {/* Painel Rápido de Inscrições e Dorsais por Prova */}
          {(() => {
            const racesWithPendingOrBibs = races
              .map((r) => {
                const regs = registrations.filter(
                  (reg) => reg.race_id === r.id && reg.status !== 'cancelled'
                )
                const pendingCount = regs.filter((reg) => reg.status === 'interested').length
                const pendingBibsCount = regs.filter((reg) => reg.bib_status === 'pending').length
                return { race: r, total: regs.length, pendingCount, pendingBibsCount }
              })
              .filter((item) => item.pendingCount > 0 || (item.race.category !== 'individual' && item.total > 0))

            if (racesWithPendingOrBibs.length === 0) return null

            return (
              <div className="iron-card p-4 space-y-2.5 border border-amber-400/30">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-extrabold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Controlo de Inscrições & Dorsais
                  </h2>
                  <span className="text-[11px] text-[var(--text-3)]">
                    {racesWithPendingOrBibs.length} prova(s)
                  </span>
                </div>

                <div className="space-y-2">
                  {racesWithPendingOrBibs.map(({ race, total, pendingCount, pendingBibsCount }) => (
                    <div
                      key={race.id}
                      className="p-3 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-card)] flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[var(--text-1)] truncate">{race.title}</div>
                        <div className="text-[11px] text-[var(--text-3)]">
                          {total} inscritos •{' '}
                          {pendingCount > 0 ? (
                            <span className="text-amber-400 font-semibold">
                              {pendingCount} por confirmar
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">Inscrições confirmadas</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {pendingCount > 0 && (
                          <button
                            type="button"
                            onClick={() => confirmAllPendingForRace(race.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-[11px] cursor-pointer hover:bg-amber-400 transition"
                          >
                            Confirmar ({pendingCount})
                          </button>
                        )}
                        {pendingBibsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => markAllBibsAtClubForRace(race.id, currentUser.name)}
                            className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-400/30 font-bold text-[11px] cursor-pointer hover:bg-sky-500/25 transition"
                          >
                            Dorsais no Clube
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Sub-separador: Atletas Adultos vs Jovens Atletas */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setTeamSubTab('adults')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                teamSubTab === 'adults'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Atletas Adultos ({profiles.length})
            </button>

            <button
              type="button"
              onClick={() => setTeamSubTab('youth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                teamSubTab === 'youth'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Baby className="w-3.5 h-3.5" />
              Lista Jovens URC ({youthAthletes.length})
            </button>
          </div>

          {/* Barra de Ferramentas / Ações de Admin */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, escalão, NIF..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Exportar dados fiscais e escalões para excel"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Exportar CSV
            </button>

            {isAdminView && teamSubTab === 'adults' && (
              <button
                type="button"
                onClick={() => setAddMemberOpen(!addMemberOpen)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Atleta
              </button>
            )}

            {isAdminView && teamSubTab === 'youth' && (
              <button
                type="button"
                onClick={() => setNewChildModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition cursor-pointer shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Criança
              </button>
            )}
          </div>

          {/* FORMULÁRIO RÁPIDO PARA ADICIONAR ATLETA ADULTO */}
          {addMemberOpen && (
            <form onSubmit={handleAddMember} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="font-bold text-slate-900">Adicionar Atleta ao Plantel da U.R. Charneca</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Nome completo *"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900"
                />
                <input
                  type="text"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="Telemóvel"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={newMemberEscalao}
                  onChange={(e) => setNewMemberEscalao(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-900 font-semibold"
                >
                  {ESCALOES_ATLETISMO.slice(6).map((esc) => (
                    <option key={esc} value={esc}>
                      {esc}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newMemberNif}
                  onChange={(e) => setNewMemberNif(e.target.value)}
                  placeholder="NIF (opcional)"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-mono"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
                  className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-900"
                >
                  <option value="athlete">Atleta</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddMemberOpen(false)}
                  className="px-3 py-1 rounded-xl text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 rounded-xl bg-blue-600 text-white font-bold cursor-pointer"
                >
                  Registar Atleta
                </button>
              </div>
            </form>
          )}

          {/* SUB-TAB 1: LISTA DE ATLETAS ADULTOS */}
          {teamSubTab === 'adults' && (
            <div className="space-y-2">
              {filteredProfiles.map((p) => {
                const isCurrent = p.id === currentUser.id
                const associatedCount = youthAthletes.filter((c) => c.associated_adult_ids.includes(p.id)).length

                return (
                  <div
                    key={p.id}
                    className={`bg-white border rounded-2xl p-3.5 space-y-2 text-xs transition shadow-2xs ${
                      isCurrent ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{p.name}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[11px]">
                              Tu
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              p.role === 'admin'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.role === 'admin' ? 'Coordenador / Admin' : 'Atleta'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="font-semibold text-blue-700">{p.escalao}</span>
                          <span>•</span>
                          <span>NIF: <span className="font-mono font-semibold text-slate-700">{p.nif}</span></span>
                          {p.cc_number && p.cc_number !== '—' && (
                            <>
                              <span>•</span>
                              <span>CC: <span className="font-mono text-slate-600">{p.cc_number}</span></span>
                            </>
                          )}
                          {associatedCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                👶 {associatedCount} criança(s)
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {isAdminView && (
                        <button
                          type="button"
                          onClick={() => handleToggleRole(p)}
                          className="text-[11px] px-3 py-1.5 min-h-[36px] rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer font-semibold shrink-0"
                        >
                          {p.role === 'admin' ? 'Despromover a Atleta' : 'Tornar Admin'}
                        </button>
                      )}
                    </div>

                    {/* Detalhes de contacto e emergência */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                      <div>
                        <span className="text-slate-400">Tel:</span>{' '}
                        <a href={`tel:${p.phone}`} className="font-medium text-slate-800 hover:underline">
                          {p.phone}
                        </a>
                      </div>
                      <div>
                        <span className="text-slate-400">Equipamento:</span>{' '}
                        <span className="font-medium text-slate-800">
                          T-Shirt {p.shirt_size} {p.shorts_size ? `• Calções ${p.shorts_size}` : ''}
                        </span>
                      </div>
                      {p.emergency_name && (
                        <div className="col-span-2 text-rose-800 bg-rose-50/70 p-1.5 rounded-xl border border-rose-100 flex items-center justify-between">
                          <span>
                            <strong>Emergência:</strong> {p.emergency_name} ({p.emergency_relation || 'Contacto'})
                          </span>
                          {p.emergency_phone && (
                            <a href={`tel:${p.emergency_phone}`} className="font-mono font-bold hover:underline">
                              {p.emergency_phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* SUB-TAB 2: LISTA OFICIAL PREDEFINIDA DE JOVENS ATLETAS DA U.R. CHARNECA */}
          {teamSubTab === 'youth' && (
            <div className="space-y-2">
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
                <div>
                  <strong>Lista Predefinida de Jovens Atletas da Armada Azul</strong>
                  <p className="text-[11px] text-amber-900/80 mt-0.5">
                    Regra da equipa: cada criança pode ser associada por <strong>no máximo 2 adultos</strong> responsáveis.
                  </p>
                </div>
              </div>

              {filteredYouth.map((child) => {
                const guardians = child.associated_adult_ids
                  .map((id) => profiles.find((p) => p.id === id))
                  .filter(Boolean) as AthleteProfile[]

                const isAssociatedWithMe = child.associated_adult_ids.includes(currentUser.id)
                const isFull = child.associated_adult_ids.length >= 2

                return (
                  <div
                    key={child.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm shrink-0">
                          👶
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{child.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                              {child.escalao}
                            </span>
                            <span>•</span>
                            <span>Nasc.: {child.birth_date} ({calculateAge(child.birth_date)} anos)</span>
                            <span>•</span>
                            <span>NIF: <span className="font-mono font-bold text-slate-700">{child.nif}</span></span>
                          </div>
                        </div>
                      </div>

                      {isAdminView && (
                        <button
                          type="button"
                          onClick={() => removeYouthAthlete(child.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Remover jovem atleta da lista oficial"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Adultos Responsáveis Associados */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-slate-500 font-medium">Adultos Responsáveis: </span>
                        {guardians.length === 0 ? (
                          <span className="text-slate-400 italic">Nenhum adulto associado ainda (0/2)</span>
                        ) : (
                          <span className="font-bold text-slate-800">
                            {guardians.map((g) => g.name).join(' & ')}{' '}
                            <span className="text-slate-500 font-normal">({guardians.length}/2)</span>
                          </span>
                        )}
                      </div>

                      {/* Ação rápida de associação para o utilizador atual */}
                      <div>
                        {isAssociatedWithMe ? (
                          <button
                            type="button"
                            onClick={() => disassociateChildFromAdult(child.id, currentUser.id)}
                            className="px-3 py-1.5 min-h-[36px] rounded-xl bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 cursor-pointer border border-rose-200 text-[11px]"
                          >
                            Desassociar de mim
                          </button>
                        ) : isFull ? (
                          <span className="px-2.5 py-1 rounded-md bg-slate-200 text-slate-600 font-medium text-[11px]">
                            Máx. 2 atingido
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => associateChildToAdult(child.id, currentUser.id)}
                            className="px-3 py-1.5 min-h-[36px] rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 cursor-pointer shadow-xs text-[11px]"
                          >
                            + Associar ao meu perfil
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notas médicas ou tamanho de roupa */}
                    {(child.shirt_size || child.medical_notes) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        {child.shirt_size && <span>👕 Tamanho: <strong>{child.shirt_size}</strong></span>}
                        {child.medical_notes && (
                          <span className="text-amber-800">
                            ⚠️ {child.medical_notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: ASSOCIAR CRIANÇA DA LISTA OFICIAL PREDEFINIDA (MÁXIMO 2 ADULTOS)
         ========================================================================= */}
      {associateModalOpen && (
        <Sheet
          variant="center"
          onClose={() => setAssociateModalOpen(false)}
          ariaLabel="Associar criança"
          panelClassName="p-5 space-y-4 flex flex-col"
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  👶
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-sm text-slate-900">
                    Associar Criança ao Meu Perfil
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lista oficial da U.R. Charneca (máx. 2 adultos por jovem atleta)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAssociateModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-0.5">
              {youthAthletes.length === 0 ? (
                <div className="text-center p-6 text-xs text-slate-400">
                  Ainda não existem crianças registadas na lista oficial do clube.
                </div>
              ) : (
                youthAthletes.map((child) => {
                  const isMine = child.associated_adult_ids.includes(currentUser.id)
                  const count = child.associated_adult_ids.length
                  const otherAdultNames = child.associated_adult_ids
                    .filter((id) => id !== currentUser.id)
                    .map((id) => profiles.find((p) => p.id === id)?.name || 'Adulto')
                    .join(' e ')

                  return (
                    <div
                      key={child.id}
                      className={`p-3 rounded-2xl border transition text-xs flex items-center justify-between gap-3 ${
                        isMine
                          ? 'bg-amber-50/80 border-amber-300'
                          : count >= 2
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5 truncate">
                          <span>{child.name}</span>
                          <span className="text-[11px] font-semibold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded">
                            {child.escalao}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Nasc.: {child.birth_date} • NIF: <span className="font-mono">{child.nif}</span>
                        </div>

                        <div className="text-[11px] mt-0.5">
                          {isMine ? (
                            <span className="font-bold text-amber-900 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Já associada ao teu perfil {count === 2 ? `(também a ${otherAdultNames})` : '(1/2)'}
                            </span>
                          ) : count >= 2 ? (
                            <span className="text-slate-500 font-medium">
                              Limite de 2 responsáveis atingido ({otherAdultNames})
                            </span>
                          ) : count === 1 ? (
                            <span className="text-blue-700 font-medium">
                              1/2 responsáveis ({otherAdultNames}) • 1 vaga livre
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">
                              Disponível (0/2 responsáveis)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botão de Associação / Desassociação */}
                      <div className="shrink-0">
                        {isMine ? (
                          <button
                            type="button"
                            onClick={() => disassociateChildFromAdult(child.id, currentUser.id)}
                            className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 font-bold hover:bg-rose-50 cursor-pointer text-xs"
                          >
                            Desassociar
                          </button>
                        ) : count >= 2 ? (
                          <span className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-500 font-semibold text-xs">
                            Cheio (2/2)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              associateChildToAdult(child.id, currentUser.id)
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 cursor-pointer shadow-xs text-xs"
                          >
                            + Associar a mim
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Administradores podem adicionar nova criança à lista oficial */}
            {isAdminView && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">És Administrador:</span>
                <button
                  type="button"
                  onClick={() => {
                    setAssociateModalOpen(false)
                    setNewChildModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registar Nova Criança na Lista Oficial
                </button>
              </div>
            )}
        </Sheet>
      )}

      {/* =========================================================================
          MODAL: REGISTAR NOVA CRIANÇA NA LISTA PREDEFINIDA DO CLUBE (ADMIN)
         ========================================================================= */}
      {newChildModalOpen && (
        <Sheet
          variant="center"
          onClose={() => setNewChildModalOpen(false)}
          ariaLabel="Registar nova criança"
          panelClassName="p-5 space-y-4 overflow-y-auto"
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  👶
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-sm text-slate-900">
                    Registar Nova Criança no Clube
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ficará disponível na lista oficial para associação por até 2 adultos.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNewChildModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewYouthAthlete} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo da Criança *</label>
                <input
                  type="text"
                  required
                  value={childFormName}
                  onChange={(e) => setChildFormName(e.target.value)}
                  placeholder="Ex: Tomás Mariano"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data Nascimento *</label>
                  <input
                    type="date"
                    required
                    value={childFormBirth}
                    onChange={(e) => handleChildBirthChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Escalão Jovem</label>
                  <select
                    value={childFormEscalao}
                    onChange={(e) => setChildFormEscalao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-900 font-semibold cursor-pointer"
                  >
                    {ESCALOES_ATLETISMO.slice(0, 6).map((esc) => (
                      <option key={esc} value={esc}>
                        {esc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIF da Criança *</label>
                  <input
                    type="text"
                    required
                    value={childFormNif}
                    onChange={(e) => setChildFormNif(e.target.value)}
                    placeholder="9 dígitos"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cartão Cidadão / BI</label>
                  <input
                    type="text"
                    value={childFormCc}
                    onChange={(e) => setChildFormCc(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tamanho de Camisola</label>
                  <select
                    value={childFormShirt}
                    onChange={(e) => setChildFormShirt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-900"
                  >
                    <option value="6-8 anos">6-8 anos</option>
                    <option value="8-10 anos">8-10 anos</option>
                    <option value="10-12 anos">10-12 anos</option>
                    <option value="12-14 anos">12-14 anos</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alergias / Cuidados</label>
                  <input
                    type="text"
                    value={childFormMedical}
                    onChange={(e) => setChildFormMedical(e.target.value)}
                    placeholder="Ex: Asma"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewChildModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold cursor-pointer shadow-xs"
                >
                  Registar e Associar ao Meu Perfil
                </button>
              </div>
            </form>
        </Sheet>
      )}
    </div>
  )
}
