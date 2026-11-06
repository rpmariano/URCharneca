import { Screen, PageHeader, SectionTitle, StatTile, Button } from '@urcharneca/ui'

export const EcraBase = () => (
  <Screen style={{ width: 400 }}>
    <PageHeader eyebrow="Agenda da equipa" title="Atividades" action={<Button size="sm">Criar</Button>} />
    <div style={{ marginTop: 20 }}>
      <SectionTitle title="Esta semana" count={3} action="Ver todas" onAction={() => {}} />
    </div>
    <div className="grid grid-cols-3 border-y border-[var(--border-card)] divide-x divide-[var(--border-card)]" style={{ marginTop: 12 }}>
      <StatTile value={2} label="Inscrições" />
      <StatTile value={3} label="Treinos 7 dias" />
      <StatTile value={0} label="Por ler" />
    </div>
  </Screen>
)
