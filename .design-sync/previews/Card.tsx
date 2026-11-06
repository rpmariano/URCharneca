import { Card, Screen, KIND_COLOR } from '@urcharneca/ui'

export const Base = () => (
  <Screen style={{ width: 380 }}>
    <Card style={{ padding: 16 }}>
      <div className="t-body t-strong">Carrinha da Charneca — domingo às 07:15</div>
      <p className="t-small" style={{ color: 'var(--text-3)', marginTop: 4 }}>
        Saída da Sociedade U.R. Charneca às 07:15 em ponto. Dorsais levantados no sábado.
      </p>
    </Card>
  </Screen>
)

export const ComFaixaDeCor = () => (
  <Screen style={{ width: 380 }}>
    <div style={{ display: 'grid', gap: 12 }}>
      <Card interactive accent={KIND_COLOR.trofeu_cascais} className="t-body t-strong" style={{ padding: 16 }}>
        1ª Prova — Troféu de Cascais
      </Card>
      <Card interactive accent={KIND_COLOR.training} className="t-body t-strong" style={{ padding: 16 }}>
        Treino de terça — rampas e técnica
      </Card>
    </div>
  </Screen>
)
