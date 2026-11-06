import { RaceListItem, Screen, demoRaces } from '@urcharneca/ui'

const byId = (id: string) => demoRaces.find((r) => r.id === id)!

export const TrofeuCascais = () => (
  <Screen style={{ width: 400 }}>
    <RaceListItem race={byId('race-trofeu-1-2026')} onOpen={() => {}} />
  </Screen>
)

export const ProvaDoClube = () => (
  <Screen style={{ width: 400 }}>
    <RaceListItem race={byId('race-marginal-2026')} onOpen={() => {}} />
  </Screen>
)

export const SugeridaPorAtleta = () => (
  <Screen style={{ width: 400 }}>
    <RaceListItem race={byId('race-corrida-natal-2026')} onOpen={() => {}} />
  </Screen>
)
