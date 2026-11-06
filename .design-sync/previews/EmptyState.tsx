import { EmptyState, Screen } from '@urcharneca/ui'

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
const Ticket = mk('M2 9a3 3 0 0 1 0 6v3h20v-3a3 3 0 0 1 0-6V6H2zM13 6v2M13 16v2M13 11v2')

export const ComAcao = () => (
  <Screen style={{ width: 380 }}>
    <EmptyState
      icon={Ticket}
      title="Ainda sem inscrições"
      text="Quando te inscreveres numa prova, aparece aqui."
      action="Explorar provas"
      onAction={() => {}}
    />
  </Screen>
)

export const Simples = () => (
  <Screen style={{ width: 380 }}>
    <EmptyState text="Não há treinos marcados." />
  </Screen>
)
