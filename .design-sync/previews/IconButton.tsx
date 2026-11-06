import { IconButton, Screen } from '@urcharneca/ui'

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
const ArrowLeft = mk('M19 12H5M12 19l-7-7 7-7')
const Pencil = mk('M17 3l4 4L8 20H4v-4z')
const Share = mk('M12 3v12M8 7l4-4 4 4M5 13v6h14v-6')
const SlidersHorizontal = mk('M21 5h-7M10 5H3M21 12h-9M8 12H3M21 19h-5M12 19H3M14 3v4M8 10v4M16 17v4')

export const Contorno = () => (
  <Screen>
    <div style={{ display: 'flex', gap: 12 }}>
      <IconButton label="Filtros">
        <SlidersHorizontal className="w-5 h-5" />
      </IconButton>
      <IconButton label="Editar">
        <Pencil className="w-4 h-4" />
      </IconButton>
    </div>
  </Screen>
)

export const Flutuante = () => (
  <Screen style={{ background: 'linear-gradient(135deg, #0b2350, #0a5fc0)' }}>
    <div style={{ display: 'flex', gap: 12 }}>
      <IconButton label="Voltar" floating>
        <ArrowLeft className="w-5 h-5" />
      </IconButton>
      <IconButton label="Partilhar" floating>
        <Share className="w-5 h-5" />
      </IconButton>
    </div>
  </Screen>
)
