import { Chip, Screen, KIND_COLOR } from '@urcharneca/ui'

export const FiltrosPorTipo = () => (
  <Screen style={{ width: 400 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Chip>Tudo</Chip>
      <Chip active color={KIND_COLOR.training}>Treinos</Chip>
      <Chip active color={KIND_COLOR.trofeu_cascais}>Troféu de Cascais</Chip>
      <Chip color={KIND_COLOR.equipa}>Provas do Clube</Chip>
      <Chip color={KIND_COLOR.individual}>Sugeridas por Atletas</Chip>
      <Chip color={KIND_COLOR.event}>Eventos</Chip>
    </div>
  </Screen>
)

export const FiltrosPorData = () => (
  <Screen style={{ width: 400 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Chip active>Próximas</Chip>
      <Chip>7 dias</Chip>
      <Chip>30 dias</Chip>
      <Chip>Passadas</Chip>
      <Chip>Intervalo</Chip>
    </div>
  </Screen>
)
