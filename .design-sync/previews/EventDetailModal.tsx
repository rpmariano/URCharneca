import { EventDetailModal, demoEvents } from '@urcharneca/ui'

export const Evento = () => (
  <EventDetailModal event={demoEvents.find((e) => e.id === 'evt-homenagem-2026')!} onClose={() => {}} />
)
