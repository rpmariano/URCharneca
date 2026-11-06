import { SectionTitle, Screen } from '@urcharneca/ui'

export const ComContadorEAcao = () => (
  <Screen style={{ width: 400 }}>
    <div style={{ display: 'grid', gap: 14 }}>
      <SectionTitle title="Próximas provas" action="Todas" onAction={() => {}} />
      <SectionTitle title="Inscritos" count={8} />
      <SectionTitle title="Aniversários" />
    </div>
  </Screen>
)
