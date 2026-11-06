import { RaceDetailModal, demoRaces } from '@urcharneca/ui'

export const TrofeuComCriancas = () => (
  <RaceDetailModal race={demoRaces.find((r) => r.id === 'race-trofeu-1-2026')!} onClose={() => {}} />
)
