import { EventListItem, Screen, demoEvents } from '@urcharneca/ui'

const byId = (id: string) => demoEvents.find((e) => e.id === id)!

export const Treino = () => (
  <Screen style={{ width: 400 }}>
    <EventListItem event={byId('evt-treino-terca')} onOpen={() => {}} />
  </Screen>
)

export const Evento = () => (
  <Screen style={{ width: 400 }}>
    <EventListItem event={byId('evt-homenagem-2026')} onOpen={() => {}} />
  </Screen>
)

export const Reuniao = () => (
  <Screen style={{ width: 400 }}>
    <EventListItem event={byId('evt-reuniao-epoca')} onOpen={() => {}} />
  </Screen>
)
