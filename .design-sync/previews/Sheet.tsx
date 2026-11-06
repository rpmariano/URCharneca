import { Sheet, SheetHeader, Button } from '@urcharneca/ui'

export const BottomSheet = () => (
  <Sheet onClose={() => {}} ariaLabel="Confirmar presença">
    <SheetHeader title="Confirmar presença" subtitle="Treino de Terça — Rampas e Técnica" onClose={() => {}} />
    <div className="px-5 py-4" style={{ display: 'grid', gap: 10 }}>
      <p className="text-sm" style={{ color: 'var(--text-2)' }}>
        Terça-feira, 10 de novembro às 18:00 na Quinta da Marinha. Leva água e roupa para o frio.
      </p>
      <Button block>Vou</Button>
      <Button block variant="secondary">
        Talvez
      </Button>
    </div>
  </Sheet>
)
