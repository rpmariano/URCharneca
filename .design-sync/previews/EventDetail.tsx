import { EventDetail, demoEvents } from '@urcharneca/ui'

export const Evento = () => <EventDetail event={demoEvents.find((e) => e.id === 'evt-homenagem-2026')!} onBack={() => {}} />
