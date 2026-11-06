import { CategoryTabs, Screen, KIND_ICON } from '@urcharneca/ui'
import { useState } from 'react'

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
const Flag = mk('M4 22V4M4 4c4-2 8 2 12 0v10c-4 2-8-2-12 0')
const Sparkles = mk('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16v4M17 18h4')

export const TiposDeAtividade = () => {
  const [v, setV] = useState('all')
  return (
    <Screen padded={false} style={{ width: 400, borderBottom: '1px solid var(--border-card)' }}>
      <CategoryTabs
        value={v}
        onChange={setV}
        options={[
          { value: 'all', label: 'Destaques', icon: Sparkles },
          { value: 'provas', label: 'Provas', icon: Flag },
          { value: 'trofeu_cascais', label: 'Troféu', icon: KIND_ICON.trofeu_cascais },
          { value: 'equipa', label: 'Clube', icon: KIND_ICON.equipa },
          { value: 'training', label: 'Treinos', icon: KIND_ICON.training },
          { value: 'event', label: 'Eventos', icon: KIND_ICON.event },
        ]}
      />
    </Screen>
  )
}
