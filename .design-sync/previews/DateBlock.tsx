import { DateBlock, Screen, KIND_COLOR } from '@urcharneca/ui'

export const PorTipo = () => (
  <Screen>
    <div style={{ display: 'flex', gap: 16 }}>
      <DateBlock date="2026-11-22" color={KIND_COLOR.trofeu_cascais} />
      <DateBlock date="2026-11-29" color={KIND_COLOR.equipa} />
      <DateBlock date="2026-12-01" color={KIND_COLOR.individual} />
      <DateBlock date="2026-11-10" color={KIND_COLOR.training} />
      <DateBlock date="2026-11-19" color={KIND_COLOR.event} />
    </div>
  </Screen>
)
