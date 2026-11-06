import { EmptyState, Screen } from '@urcharneca/ui'

export const ComAcao = () => (
  <Screen style={{ width: 380 }}>
    <EmptyState text="Nenhuma atividade com estes filtros." action="Limpar filtros" onAction={() => {}} />
  </Screen>
)

export const Simples = () => (
  <Screen style={{ width: 380 }}>
    <EmptyState text="Não há treinos marcados." />
  </Screen>
)
