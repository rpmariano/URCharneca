import { Sheet, SheetHeader, Button } from '@urcharneca/ui'

export const BottomSheet = () => (
  <Sheet onClose={() => {}} ariaLabel="Inscrição">
    <SheetHeader title="Inscrição" subtitle="Trail da Charneca 2026" onClose={() => {}} />
    <div style={{ display: 'grid', gap: 12, padding: '16px 20px 20px' }}>
      <p className="t-body" style={{ color: 'var(--text-2)' }}>
        O pedido fica pendente até o clube confirmar a inscrição.
      </p>
      <Button block>Pedir inscrição</Button>
      <Button block variant="secondary">
        Agora não
      </Button>
    </div>
  </Sheet>
)
