import { Button, Screen } from '@urcharneca/ui'

// Ícones embutidos (em vez de importar lucide-react, que torna a compilação da pré-visualização muito lenta)
const mk = (d: string) => (p: { className?: string; strokeWidth?: number }) => (
  <svg
    className={p.className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={p.strokeWidth ?? 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)
const Plus = mk('M5 12h14M12 5v14')
const Trash2 = mk('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6')

export const Variants = () => (
  <Screen>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button>Inscrever</Button>
      <Button variant="secondary">Gerir inscrição</Button>
      <Button variant="ghost">Limpar</Button>
      <Button variant="danger">
        <Trash2 className="w-4 h-4" /> Remover
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
    <Button block>Sugerir uma prova</Button>
  </Screen>
)

export const Disabled = () => (
  <Screen>
    <Button variant="secondary" size="sm" disabled>
      Confirmar pendentes (0)
    </Button>
  </Screen>
)
