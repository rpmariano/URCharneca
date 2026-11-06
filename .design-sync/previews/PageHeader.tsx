import { PageHeader, Screen, Button } from '@urcharneca/ui'

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

export const ComAcao = () => (
  <Screen style={{ width: 400 }}>
    <PageHeader
      title="Gerir a equipa"
      action={
        <Button size="sm">
          <Plus className="w-4 h-4" /> Criar
        </Button>
      }
    />
  </Screen>
)

export const ComSubtitulo = () => (
  <Screen style={{ width: 400 }}>
    <PageHeader title="Inscrições" subtitle="As tuas provas e presenças" />
  </Screen>
)
