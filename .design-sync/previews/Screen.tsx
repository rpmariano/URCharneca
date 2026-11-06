import { Screen, PageHeader, SectionTitle, ListRow, Button } from '@urcharneca/ui'

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
const IdCard = mk('M3 5h18v14H3zM7 15h4M7 9h4v3H7zM15 9h3M15 13h3')
const UsersRound = mk('M18 21a6 6 0 0 0-12 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20a4.5 4.5 0 0 0-4-4.5M17 4a3.5 3.5 0 0 1 0 7')

export const EcraBase = () => (
  <Screen style={{ width: 400 }}>
    <PageHeader
      title="Perfil"
      action={
        <Button size="sm" variant="secondary">
          Editar
        </Button>
      }
    />
    <div style={{ marginTop: 24 }}>
      <SectionTitle title="Conta" />
      <div className="divide-soft">
        <ListRow icon={IdCard} title="Dados pessoais" description="Contactos, escalão e t-shirt" onClick={() => {}} />
        <ListRow icon={UsersRound} title="Crianças a meu cargo" description="2 perfis infantis" onClick={() => {}} />
      </div>
    </div>
  </Screen>
)
