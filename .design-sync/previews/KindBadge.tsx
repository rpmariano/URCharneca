import { KindBadge, Screen } from '@urcharneca/ui'

export const TiposDeAtividade = () => (
  <Screen>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <KindBadge kind="trofeu_cascais" />
      <KindBadge kind="equipa" />
      <KindBadge kind="individual" />
      <KindBadge kind="training" />
      <KindBadge kind="event" />
      <KindBadge kind="event" label="Reunião" />
    </div>
  </Screen>
)
