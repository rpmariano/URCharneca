import { RsvpButtons, Screen, demoEvents } from '@urcharneca/ui'

export const Presenca = () => (
  <Screen style={{ width: 380 }}>
    <RsvpButtons event={demoEvents.find((e) => e.id === 'evt-homenagem-2026')!} />
  </Screen>
)
