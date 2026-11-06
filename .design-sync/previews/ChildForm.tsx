import { ChildForm, Screen, emptyChild, demoChildren } from '@urcharneca/ui'

export const NovaCrianca = () => (
  <Screen style={{ width: 400 }}>
    <ChildForm initial={emptyChild()} submitLabel="Adicionar criança" onSubmit={() => {}} onCancel={() => {}} />
  </Screen>
)

export const EditarCrianca = () => (
  <Screen style={{ width: 400 }}>
    <ChildForm initial={demoChildren[0]} submitLabel="Guardar" onSubmit={() => {}} />
  </Screen>
)
