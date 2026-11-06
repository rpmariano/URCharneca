import { PageHeader, Screen, Button } from '@urcharneca/ui'
import { Plus } from 'lucide-react'

export const ComAcao = () => (
  <Screen style={{ width: 400 }}>
    <PageHeader
      eyebrow="Agenda da equipa"
      title="Atividades"
      action={
        <Button size="sm">
          <Plus className="w-4 h-4" /> Criar
        </Button>
      }
    />
  </Screen>
)

export const Simples = () => (
  <Screen style={{ width: 400 }}>
    <PageHeader eyebrow="Equipa" title="Comunicados" />
  </Screen>
)
