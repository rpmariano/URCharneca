import { ActivityCover, KindBadge, Screen } from '@urcharneca/ui'

const KINDS = ['trofeu_cascais', 'equipa', 'individual', 'training', 'event'] as const

export const PorTipo = () => (
  <Screen style={{ width: 400 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {KINDS.map((k) => (
        <ActivityCover key={k} kind={k} seed={`capa-${k}`} className="rounded-2xl">
          <div style={{ aspectRatio: '4 / 3', padding: 10, position: 'relative' }}>
            <KindBadge kind={k} solid />
          </div>
        </ActivityCover>
      ))}
    </div>
  </Screen>
)

export const Miniatura = () => (
  <Screen>
    <div style={{ display: 'flex', gap: 12 }}>
      <ActivityCover kind="training" seed="a" className="rounded-xl">
        <div style={{ width: 72, height: 72 }} />
      </ActivityCover>
      <ActivityCover kind="trofeu_cascais" seed="b" className="rounded-xl">
        <div style={{ width: 72, height: 72 }} />
      </ActivityCover>
    </div>
  </Screen>
)
