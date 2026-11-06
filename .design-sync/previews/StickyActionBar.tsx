import { StickyActionBar, Button, Screen } from '@urcharneca/ui'

export const BarraDeInscricao = () => (
  <Screen style={{ width: 400, height: 160, position: 'relative', transform: 'translateZ(0)' }}>
    <p className="t-small" style={{ color: 'var(--text-3)' }}>
      A barra fica fixa no fundo do ecrã de detalhe.
    </p>
    <StickyActionBar
      summary={
        <>
          <div className="t-body t-strong">Dom, 22 Nov · 09:00</div>
          <div className="t-small" style={{ color: 'var(--text-3)' }}>
            Carrinha: 5 lugares livres
          </div>
        </>
      }
    >
      <Button>Inscrever</Button>
    </StickyActionBar>
  </Screen>
)
