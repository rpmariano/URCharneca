import { SheetHeader, Screen, KindBadge } from '@urcharneca/ui'

export const ComEtiqueta = () => (
  <Screen padded={false} style={{ width: 400, paddingTop: 12 }}>
    <SheetHeader title="2ª Prova — Troféu de Cascais" onClose={() => {}}>
      <div style={{ marginBottom: 4 }}>
        <KindBadge kind="trofeu_cascais" />
      </div>
    </SheetHeader>
  </Screen>
)

export const ComSubtitulo = () => (
  <Screen padded={false} style={{ width: 400, paddingTop: 12 }}>
    <SheetHeader title="Novo comunicado" subtitle="Visível para toda a equipa na página inicial e em Comunicados." onClose={() => {}} />
  </Screen>
)
