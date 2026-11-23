import type { AthleteProfile, Race, RaceRegistration, RaceVehicle } from '../types'
import { TRANSPORT_LABELS } from '../types'
import { todayISO } from './dates'

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0
  const [y, m, d] = birthDate.split('-').map(Number)
  const [ty, tm, td] = todayISO().split('-').map(Number)
  const today = new Date(ty, tm - 1, td)
  let age = today.getFullYear() - y
  const mDiff = today.getMonth() - (m - 1)
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
    age--
  }
  return Math.max(0, age)
}

export function estimateEscalao(birthDate: string, gender: 'M' | 'F' = 'M'): string {
  const age = calculateAge(birthDate)
  if (age < 10) return 'Benjamins A (Sub-10)'
  if (age <= 11) return 'Benjamins B (Sub-12)'
  if (age <= 13) return 'Infantis (Sub-14)'
  if (age <= 15) return 'Iniciados (Sub-16)'
  if (age <= 17) return 'Juvenis (Sub-18)'
  if (age <= 19) return 'Juniores (Sub-20)'
  if (age <= 22) return gender === 'F' ? 'Sub-23 F' : 'Sub-23 M'
  if (age <= 34) return gender === 'F' ? 'Seniores F' : 'Seniores M'
  if (age <= 39) return gender === 'F' ? 'Veteranos F35' : 'Veteranos M35'
  if (age <= 44) return gender === 'F' ? 'Veteranos F40' : 'Veteranos M40'
  if (age <= 49) return gender === 'F' ? 'Veteranos F45' : 'Veteranos M45'
  if (age <= 54) return gender === 'F' ? 'Veteranos F50' : 'Veteranos M50'
  if (age <= 59) return gender === 'F' ? 'Veteranos F55' : 'Veteranos M55'
  return gender === 'F' ? 'Veteranos F60+' : 'Veteranos M60+'
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const diaSem = DIAS_SEMANA[dt.getDay()]
  const mes = MESES_CURTOS[m - 1]
  return `${diaSem}, ${d} ${mes}`
}

export function formatDayMonth(dateStr: string): { day: string; month: string; weekday: string } {
  if (!dateStr) return { day: '--', month: '---', weekday: '---' }
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return {
    day: String(d).padStart(2, '0'),
    month: MESES_CURTOS[m - 1].toUpperCase(),
    weekday: DIAS_SEMANA[dt.getDay()],
  }
}

export function getDaysFromReference(dateStr: string, refDate = todayISO()): number {
  const [y1, m1, d1] = dateStr.split('-').map(Number)
  const [y2, m2, d2] = refDate.split('-').map(Number)
  const t1 = new Date(y1, m1 - 1, d1).getTime()
  const t2 = new Date(y2, m2 - 1, d2).getTime()
  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24))
}

export interface VehicleAllocation {
  vehicle: RaceVehicle
  passengers: RaceRegistration[]
  occupiedSeats: number
  availableSeats: number
}

export interface VanAllocationResult {
  capacity: number
  confirmedPassengers: RaceRegistration[]
  waitlistPassengers: RaceRegistration[]
  availableSeats: number
  vehicles: VehicleAllocation[]
  carpoolOffers: RaceRegistration[]
  carpoolNeeds: RaceRegistration[]
}

/** Devolve a lista normalizada de veículos configurados para a prova (vazio se não existir carrinha). */
export function getRaceVehicles(race: Race): RaceVehicle[] {
  if (!race.van_available) return []
  if (race.vehicles && race.vehicles.length > 0) {
    return race.vehicles.map((v, idx) => ({
      ...v,
      id: v.id || `veh-${idx + 1}`,
      name: v.name.trim() || `Veículo ${idx + 1}`,
      seats: Math.max(0, Number(v.seats) || 0),
    }))
  }
  if (race.van_capacity > 0) {
    return [{ id: 'veh-1', name: 'Carrinha do Clube', seats: race.van_capacity }]
  }
  return []
}

export function computeVanAllocation(
  race: Race,
  raceRegistrations: RaceRegistration[]
): VanAllocationResult {
  const activeRegs = raceRegistrations.filter((r) => r.status !== 'cancelled')
  const vanRequesters = activeRegs
    .filter((r) => TRANSPORT_LABELS[r.transport_mode]?.usesVanSeat)
    .sort((a, b) => (a.van_requested_at || a.created_at).localeCompare(b.van_requested_at || b.created_at))

  const configuredVehicles = getRaceVehicles(race)
  const buckets = new Map<string, RaceRegistration[]>()
  for (const v of configuredVehicles) {
    buckets.set(v.id, [])
  }

  const placedIds = new Set<string>()
  // 1ª passagem: colocar primeiro quem escolheu explicitamente um veículo que ainda tem vaga
  for (const reg of vanRequesters) {
    if (!reg.vehicle_id) continue
    const vehicle = configuredVehicles.find((v) => v.id === reg.vehicle_id)
    const bucket = vehicle ? buckets.get(vehicle.id) : undefined
    if (vehicle && bucket && bucket.length < vehicle.seats) {
      bucket.push(reg)
      placedIds.add(reg.id)
    }
  }

  // 2ª passagem: distribuir restantes pedidos por ordem de chegada pelos lugares vagos
  const waitlistPassengers: RaceRegistration[] = []
  for (const reg of vanRequesters) {
    if (placedIds.has(reg.id)) continue
    const openVehicle = configuredVehicles.find((v) => (buckets.get(v.id)?.length || 0) < v.seats)
    if (openVehicle) {
      buckets.get(openVehicle.id)!.push(reg)
      placedIds.add(reg.id)
    } else {
      waitlistPassengers.push(reg)
    }
  }

  const vehicles: VehicleAllocation[] = configuredVehicles.map((vehicle) => {
    const passengers = buckets.get(vehicle.id) || []
    const occupiedSeats = passengers.length
    const availableSeats = Math.max(0, vehicle.seats - occupiedSeats)
    return { vehicle, passengers, occupiedSeats, availableSeats }
  })

  const capacity = vehicles.reduce((acc, v) => acc + v.vehicle.seats, 0)
  const confirmedPassengers = vanRequesters.filter((r) => placedIds.has(r.id))
  const availableSeats = Math.max(0, capacity - confirmedPassengers.length)

  const carpoolOffers = activeRegs.filter((r) => r.transport_mode === 'carpool_offer')
  const carpoolNeeds = activeRegs.filter((r) => r.transport_mode === 'carpool_need')

  return {
    capacity,
    confirmedPassengers,
    waitlistPassengers,
    availableSeats,
    vehicles,
    carpoolOffers,
    carpoolNeeds,
  }
}

export function generateWhatsAppSummary(race: Race, regs: RaceRegistration[]): string {
  const active = regs.filter((r) => r.status !== 'cancelled')
  const byDist = new Map<string, RaceRegistration[]>()
  for (const r of active) {
    const list = byDist.get(r.distance) || []
    list.push(r)
    byDist.set(r.distance, list)
  }

  const lines: string[] = [
    `🏃‍♂️ *U.R. CHARNECA ATLETISMO* 🏃‍♀️`,
    `📌 *${race.title}*`,
    `📅 ${formatShortDate(race.date)} às ${race.start_time} | 📍 ${race.location}`,
    ``,
  ]

  for (const [dist, list] of byDist.entries()) {
    lines.push(`*${dist} (${list.length}):*`)
    for (const item of list) {
      const bibTag = item.bib_number ? ` [Dorsal #${item.bib_number}]` : ''
      lines.push(`• ${item.athlete_name}${bibTag}`)
    }
    lines.push(``)
  }

  if (race.van_available) {
    const van = computeVanAllocation(race, active)
    lines.push(
      `🚐 *Transporte do Clube (${van.confirmedPassengers.length}/${van.capacity} lugares · ${van.availableSeats} vagos — Saída ${race.van_departure_time || 'a definir'}):*`
    )
    for (const v of van.vehicles) {
      const driverPart = v.vehicle.driver_name ? ` · Condutor: ${v.vehicle.driver_name}` : ''
      lines.push(`*${v.vehicle.name}* (${v.occupiedSeats}/${v.vehicle.seats} lugares · ${v.availableSeats} vagos${driverPart})`)
      for (const p of v.passengers) {
        const modeTag = p.transport_mode === 'van_return_only' ? ' (Só regresso)' : ''
        lines.push(`  ✓ ${p.athlete_name}${modeTag}`)
      }
    }
    if (van.waitlistPassengers.length > 0) {
      lines.push(`⏳ *Lista de Espera Carrinha:* ${van.waitlistPassengers.map((w) => w.athlete_name).join(', ')}`)
    }
  }

  return lines.join('\n')
}

export function generateAdminInscriptionCSV(
  race: Race,
  regs: RaceRegistration[],
  profiles: AthleteProfile[]
): string {
  const active = regs.filter((r) => r.status !== 'cancelled')
  const headers = [
    'Prova',
    'Nome Atleta',
    'Escalão',
    'Distância',
    'Data Nascimento',
    'NIF',
    'CC',
    'T-Shirt',
    'Telefone',
    'Estado Inscrição',
    'Dorsal',
    'Transporte',
  ]

  const rows = active.map((reg) => {
    const parentProfile = profiles.find((p) => p.id === reg.athlete_id)
    let birth = parentProfile?.birth_date || ''
    let nif = parentProfile?.nif || ''
    let cc = parentProfile?.cc_number || ''
    let shirt = parentProfile?.shirt_size || ''
    const phone = parentProfile?.phone || ''

    if (reg.is_dependent && parentProfile && reg.dependent_id) {
      const dep = parentProfile.dependents.find((d) => d.id === reg.dependent_id)
      if (dep) {
        birth = dep.birth_date
        nif = dep.nif
        cc = dep.cc_number || ''
        shirt = dep.shirt_size || 'Criança'
      }
    }

    return [
      race.title,
      reg.athlete_name,
      reg.escalao,
      reg.distance,
      birth,
      nif,
      cc,
      shirt,
      phone,
      reg.status,
      reg.bib_number || '',
      TRANSPORT_LABELS[reg.transport_mode]?.short || reg.transport_mode,
    ]
      .map((val) => `"${String(val).replace(/"/g, '""')}"`)
      .join(';')
  })

  return [headers.join(';'), ...rows].join('\n')
}

export interface UpcomingBirthday {
  id: string
  name: string
  isChild: boolean
  date: string // próxima ocorrência YYYY-MM-DD
  daysAway: number
  turning: number
}

/** Próximos aniversários (adultos e crianças), ordenados pela proximidade. */
export function getUpcomingBirthdays(
  people: Array<{ id: string; name: string; birth_date: string; isChild: boolean }>,
  limit = 5,
  ref = todayISO()
): UpcomingBirthday[] {
  const [ry] = ref.split('-').map(Number)
  return people
    .filter((p) => p.birth_date)
    .map((p) => {
      const [by, bm, bd] = p.birth_date.split('-').map(Number)
      const mmdd = `${String(bm).padStart(2, '0')}-${String(bd).padStart(2, '0')}`
      let year = ry
      if (`${ry}-${mmdd}` < ref) year = ry + 1
      const date = `${year}-${mmdd}`
      return {
        id: p.id,
        name: p.name,
        isChild: p.isChild,
        date,
        daysAway: getDaysFromReference(date, ref),
        turning: year - by,
      }
    })
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, limit)
}

/** Soma `days` dias a uma data YYYY-MM-DD. */
export function addDaysISO(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function formatLongDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}
