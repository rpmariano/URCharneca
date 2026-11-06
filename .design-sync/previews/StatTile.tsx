import { StatTile, Screen } from '@urcharneca/ui'

export const PainelDeNumeros = () => (
  <Screen style={{ width: 400 }}>
    <div className="grid grid-cols-3 border-y border-[var(--border-card)] divide-x divide-[var(--border-card)]">
      <StatTile value={2} label="Inscrições" onClick={() => {}} />
      <StatTile value={3} label="Treinos 7 dias" onClick={() => {}} />
      <StatTile value={0} label="Por ler" onClick={() => {}} />
    </div>
  </Screen>
)

export const Texto = () => (
  <Screen>
    <StatTile value="12K" label="Distância" highlight />
  </Screen>
)
