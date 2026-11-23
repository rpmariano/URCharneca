import { describe, expect, it } from 'vitest'
import { computeVanAllocation, getRaceVehicles } from '../../src/utils/formatters'
import type { Race, RaceRegistration, TransportMode } from '../../src/types'

const race = (over: Partial<Race> = {}): Race =>
  ({
    id: 'race-1',
    title: 'Prova teste',
    category: 'equipa',
    date: '2030-01-01',
    start_time: '09:00',
    location: 'Teste',
    distances: ['10 km'],
    van_available: true,
    van_capacity: 2,
    vehicles: [],
    ...over,
  }) as Race

let seq = 0
const reg = (over: Partial<RaceRegistration> = {}): RaceRegistration =>
  ({
    id: `reg-${++seq}`,
    race_id: 'race-1',
    athlete_id: `ath-${seq}`,
    athlete_name: `Atleta ${seq}`,
    is_dependent: false,
    escalao: 'Seniores M',
    distance: '10 km',
    status: 'self_enrolled',
    transport_mode: 'van_roundtrip' as TransportMode,
    bib_status: 'pending',
    bib_transfer_available: false,
    created_at: '2030-01-01T10:00:00.000Z',
    ...over,
  }) as RaceRegistration

describe('getRaceVehicles', () => {
  it('sem carrinha devolve lista vazia', () => {
    expect(getRaceVehicles(race({ van_available: false }))).toEqual([])
  })
  it('capacidade simples vira um veículo', () => {
    expect(getRaceVehicles(race({ van_capacity: 7 }))).toEqual([{ id: 'veh-1', name: 'Carrinha do Clube', seats: 7 }])
  })
  it('capacidade 0 e sem veículos devolve vazio', () => {
    expect(getRaceVehicles(race({ van_capacity: 0 }))).toEqual([])
  })
  it('normaliza nomes, ids e lugares negativos/inválidos', () => {
    const v = getRaceVehicles(race({ vehicles: [{ id: '', name: '  ', seats: -3 }, { id: 'x', name: 'Van', seats: 4 }] }))
    expect(v[0]).toMatchObject({ id: 'veh-1', name: 'Veículo 1', seats: 0 })
    expect(v[1]).toMatchObject({ id: 'x', name: 'Van', seats: 4 })
  })
})

describe('computeVanAllocation', () => {
  it('atribui por ordem de van_requested_at e o excedente vai para lista de espera', () => {
    const a = reg({ van_requested_at: '2030-01-01T10:03:00Z' })
    const b = reg({ van_requested_at: '2030-01-01T10:01:00Z' })
    const c = reg({ van_requested_at: '2030-01-01T10:02:00Z' })
    const r = computeVanAllocation(race({ van_capacity: 2 }), [a, b, c])
    expect(r.confirmedPassengers.map((x) => x.id)).toEqual([b.id, c.id])
    expect(r.waitlistPassengers.map((x) => x.id)).toEqual([a.id])
    expect(r.capacity).toBe(2)
    expect(r.availableSeats).toBe(0)
  })

  it('sem van_requested_at usa created_at', () => {
    const late = reg({ created_at: '2030-01-01T12:00:00Z' })
    const early = reg({ created_at: '2030-01-01T08:00:00Z' })
    const r = computeVanAllocation(race({ van_capacity: 1 }), [late, early])
    expect(r.confirmedPassengers[0].id).toBe(early.id)
    expect(r.waitlistPassengers[0].id).toBe(late.id)
  })

  it('van_requested_at tem prioridade sobre created_at', () => {
    const a = reg({ created_at: '2030-01-01T08:00:00Z', van_requested_at: '2030-01-02T08:00:00Z' })
    const b = reg({ created_at: '2030-01-01T09:00:00Z' })
    const r = computeVanAllocation(race({ van_capacity: 1 }), [a, b])
    expect(r.confirmedPassengers[0].id).toBe(b.id)
  })

  it('canceladas nao ocupam lugar; quem fica livre sobe da lista de espera', () => {
    const a = reg({ created_at: '2030-01-01T08:00:00Z' })
    const b = reg({ created_at: '2030-01-01T09:00:00Z' })
    const c = reg({ created_at: '2030-01-01T10:00:00Z' })
    const before = computeVanAllocation(race({ van_capacity: 2 }), [a, b, c])
    expect(before.waitlistPassengers.map((x) => x.id)).toEqual([c.id])
    const after = computeVanAllocation(race({ van_capacity: 2 }), [{ ...a, status: 'cancelled' }, b, c])
    expect(after.confirmedPassengers.map((x) => x.id)).toEqual([b.id, c.id])
    expect(after.waitlistPassengers).toEqual([])
  })

  it('modos sem carrinha nao entram; boleias sao listadas', () => {
    const own = reg({ transport_mode: 'own_transport' })
    const offer = reg({ transport_mode: 'carpool_offer' })
    const need = reg({ transport_mode: 'carpool_need' })
    const van = reg({ transport_mode: 'van_return_only' })
    const r = computeVanAllocation(race({ van_capacity: 5 }), [own, offer, need, van])
    expect(r.confirmedPassengers.map((x) => x.id)).toEqual([van.id])
    expect(r.carpoolOffers.map((x) => x.id)).toEqual([offer.id])
    expect(r.carpoolNeeds.map((x) => x.id)).toEqual([need.id])
    expect(r.availableSeats).toBe(4)
  })

  it('prova sem carrinha: todos os pedidos de carrinha ficam em espera, capacidade 0', () => {
    const a = reg()
    const r = computeVanAllocation(race({ van_available: false }), [a])
    expect(r.capacity).toBe(0)
    expect(r.confirmedPassengers).toEqual([])
    expect(r.waitlistPassengers.map((x) => x.id)).toEqual([a.id])
  })

  describe('multi-veiculo', () => {
    const two = () =>
      race({
        vehicles: [
          { id: 'v1', name: 'Carrinha 1', seats: 1 },
          { id: 'v2', name: 'Carrinha 2', seats: 2 },
        ],
      })

    it('capacidade e soma dos veiculos; distribui pelos lugares vagos por ordem', () => {
      const regs = [1, 2, 3, 4].map((i) => reg({ created_at: `2030-01-01T0${i}:00:00Z` }))
      const r = computeVanAllocation(two(), regs)
      expect(r.capacity).toBe(3)
      expect(r.vehicles[0].passengers.map((x) => x.id)).toEqual([regs[0].id])
      expect(r.vehicles[1].passengers.map((x) => x.id)).toEqual([regs[1].id, regs[2].id])
      expect(r.waitlistPassengers.map((x) => x.id)).toEqual([regs[3].id])
      expect(r.vehicles.map((v) => v.availableSeats)).toEqual([0, 0])
    })

    it('respeita o veiculo escolhido quando ha vaga (mesmo sendo mais tardio)', () => {
      const early = reg({ created_at: '2030-01-01T01:00:00Z' })
      const lateChoosesV1 = reg({ created_at: '2030-01-01T05:00:00Z', vehicle_id: 'v1' })
      const r = computeVanAllocation(two(), [early, lateChoosesV1])
      expect(r.vehicles[0].passengers.map((x) => x.id)).toEqual([lateChoosesV1.id])
      expect(r.vehicles[1].passengers.map((x) => x.id)).toEqual([early.id])
    })

    it('veiculo escolhido cheio: passa para outro com vaga, nunca excede a lotacao', () => {
      const a = reg({ created_at: '2030-01-01T01:00:00Z', vehicle_id: 'v1' })
      const b = reg({ created_at: '2030-01-01T02:00:00Z', vehicle_id: 'v1' })
      const r = computeVanAllocation(two(), [a, b])
      expect(r.vehicles[0].passengers.map((x) => x.id)).toEqual([a.id])
      expect(r.vehicles[1].passengers.map((x) => x.id)).toEqual([b.id])
      for (const v of r.vehicles) expect(v.passengers.length).toBeLessThanOrEqual(v.vehicle.seats)
    })

    it('vehicle_id desconhecido e tratado como sem escolha', () => {
      const a = reg({ vehicle_id: 'nao-existe' })
      const r = computeVanAllocation(two(), [a])
      expect(r.confirmedPassengers.map((x) => x.id)).toEqual([a.id])
    })

    it('veiculo com 0 lugares nunca recebe passageiros', () => {
      const r = computeVanAllocation(race({ vehicles: [{ id: 'v0', name: 'Vazio', seats: 0 }] }), [reg()])
      expect(r.capacity).toBe(0)
      expect(r.waitlistPassengers).toHaveLength(1)
    })
  })
})
