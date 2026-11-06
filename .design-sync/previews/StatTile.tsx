import { StatTile, Screen } from '@urcharneca/ui'

export const PainelDeNumeros = () => (
  <Screen style={{ width: 400 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      <StatTile value={15} label="Atletas" onClick={() => {}} />
      <StatTile value={6} label="Crianças" onClick={() => {}} />
      <StatTile value={0} label="Pendentes" onClick={() => {}} />
    </div>
  </Screen>
)
