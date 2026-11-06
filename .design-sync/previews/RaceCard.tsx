import { RaceCard, Screen, demoRaces } from '@urcharneca/ui'

// Datas relativas a "hoje", para a contagem decrescente fazer sentido em qualquer data
const inDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const race = (id: string, days: number) => ({ ...demoRaces.find((r) => r.id === id)!, date: inDays(days) })

export const Carrossel = () => (
  <Screen style={{ width: 420 }}>
    <div className="snap-row">
      <RaceCard race={race('race-trofeu-1-2026', 16)} onOpen={() => {}} />
      <RaceCard race={race('race-trail-charneca-2026', 9)} onOpen={() => {}} />
    </div>
  </Screen>
)

export const ComCarrinha = () => (
  <Screen style={{ width: 420 }}>
    <RaceCard race={race('race-descobrimentos-2026', 23)} onOpen={() => {}} />
  </Screen>
)

export const Amanha = () => (
  <Screen style={{ width: 420 }}>
    <RaceCard race={race('race-marginal-2026', 1)} onOpen={() => {}} />
  </Screen>
)
