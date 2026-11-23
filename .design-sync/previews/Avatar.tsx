import { Avatar, Screen } from '@urcharneca/ui'

export const AdultoECrianca = () => (
  <Screen>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="Administrador" />
      <Avatar name="Patrícia Mariano" size={44} />
      <Avatar name="Tomás Mariano" child />
      <Avatar name="Sara Lopes" child size={28} />
    </div>
  </Screen>
)
