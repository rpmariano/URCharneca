import { Card, Screen, KIND_COLOR } from '@urcharneca/ui'

export const Base = () => (
  <Screen style={{ width: 380 }}>
    <Card className="p-4">
      <div className="text-sm font-bold">Carrinha da Charneca — Domingo às 07:15</div>
      <p className="text-xs" style={{ color: 'var(--text-3)', marginTop: 4 }}>
        Saída da Sociedade U.R. Charneca às 07:15 em ponto. Dorsais levantados no sábado.
      </p>
    </Card>
  </Screen>
)

export const ComFaixaDeCor = () => (
  <Screen style={{ width: 380 }}>
    <div style={{ display: 'grid', gap: 10 }}>
      <Card interactive accent={KIND_COLOR.trofeu_cascais} className="p-4 text-sm font-bold">
        1ª Prova — Troféu de Cascais
      </Card>
      <Card interactive accent={KIND_COLOR.training} className="p-4 text-sm font-bold">
        Treino de Terça — Rampas e Técnica
      </Card>
      <Card interactive accent={KIND_COLOR.event} className="p-4 text-sm font-bold">
        Jantar de Natal da equipa
      </Card>
    </div>
  </Screen>
)
