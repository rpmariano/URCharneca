import { SearchPill, IconButton, Screen } from '@urcharneca/ui'
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
const SlidersHorizontal = mk('M21 5h-7M10 5H3M21 12h-9M8 12H3M21 19h-5M12 19H3M14 3v4M8 10v4M16 17v4')

export const Vazia = () => {
  const [q, setQ] = useState('')
  return (
    <Screen style={{ width: 400 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SearchPill value={q} onChange={setQ} placeholder="Procurar provas, treinos, locais" />
        </div>
        <IconButton label="Filtros">
          <SlidersHorizontal className="w-5 h-5" />
        </IconButton>
      </div>
    </Screen>
  )
}

export const ComTexto = () => {
  const [q, setQ] = useState('Cascais')
  return (
    <Screen style={{ width: 400 }}>
      <SearchPill value={q} onChange={setQ} placeholder="Procurar provas, treinos, locais" />
    </Screen>
  )
}
