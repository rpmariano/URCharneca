import { Button, Screen } from '@urcharneca/ui'
import { Plus, Trash2 } from 'lucide-react'

export const Variants = () => (
  <Screen>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button>Inscrever</Button>
      <Button variant="secondary">Alterar</Button>
      <Button variant="ghost">Cancelar</Button>
      <Button variant="danger">
        <Trash2 className="w-3.5 h-3.5" /> Remover
      </Button>
    </div>
  </Screen>
)

export const Sizes = () => (
  <Screen>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Button size="sm">
        <Plus className="w-4 h-4" /> Criar
      </Button>
      <Button>Publicar prova</Button>
    </div>
  </Screen>
)

export const Block = () => (
  <Screen style={{ width: 380 }}>
    <Button block>Sugerir à equipa</Button>
  </Screen>
)

export const Disabled = () => (
  <Screen>
    <Button variant="secondary" size="sm" disabled>
      Confirmar pendentes (0)
    </Button>
  </Screen>
)
