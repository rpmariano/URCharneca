import { Tag, Screen } from '@urcharneca/ui'

export const Estados = () => (
  <Screen>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Tag tone="ok">Inscrito</Tag>
      <Tag tone="warn">Aguarda clube</Tag>
      <Tag tone="info">Vai</Tag>
      <Tag tone="danger">2 por confirmar</Tag>
      <Tag>Realizada</Tag>
    </div>
  </Screen>
)
