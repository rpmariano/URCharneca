/**
 * Primitivas de interface partilhadas. Usam apenas as variáveis de tema
 * (index.css), para que os três temas fiquem coerentes em todos os ecrãs.
 */
import React from 'react'
import { ChevronRight, X } from 'lucide-react'
import type { ActivityKind, Race, TeamEvent } from '../types'
import { formatDayMonth } from '../utils/formatters'

export const KIND_SINGULAR: Record<ActivityKind, string> = {
  trofeu_cascais: 'Troféu Cascais',
  equipa: 'Prova do Clube',
  individual: 'Sugerida',
  training: 'Treino',
  event: 'Evento',
}

export const KIND_COLOR: Record<ActivityKind, string> = {
  trofeu_cascais: 'var(--cat-trofeu)',
  equipa: 'var(--cat-clube)',
  individual: 'var(--cat-sugerida)',
  training: 'var(--cat-treino)',
  event: 'var(--cat-evento)',
}

export const kindOfRace = (r: Race): ActivityKind => r.category
export const kindOfEvent = (e: TeamEvent): ActivityKind => (e.type === 'training' ? 'training' : 'event')

/**
 * Fundo de ecrã da app: aplica a cor de fundo, a cor do texto e a fonte do tema.
 * Envolver cada ecrã (ou composição) num `Screen` — fora dele os componentes ficam sobre fundo branco.
 */
export const Screen: React.FC<{ children?: React.ReactNode; padded?: boolean; className?: string; style?: React.CSSProperties }> = ({
  children,
  padded = true,
  className = '',
  style,
}) => (
  <div
    className={`${padded ? 'p-4' : ''} ${className}`}
    style={{ background: 'var(--bg-app)', color: 'var(--text-1)', fontFamily: 'var(--font-sans)', minHeight: '100%', ...style }}
  >
    {children}
  </div>
)

/** Cabeçalho de página: sobretítulo pequeno na cor de destaque + título grande condensado em maiúsculas, com ação opcional à direita. */
export const PageHeader: React.FC<{ eyebrow?: string; title: string; action?: React.ReactNode }> = ({
  eyebrow,
  title,
  action,
}) => (
  <div className="flex items-end justify-between gap-3 pt-3">
    <div className="min-w-0">
      {eyebrow && <div className="eyebrow text-[var(--run)] mb-1">{eyebrow}</div>}
      <h1 className="display text-[40px] text-[var(--text-1)]">{title}</h1>
    </div>
    {action}
  </div>
)

/** Título de secção condensado em maiúsculas, com contador opcional e ligação "ver todos" na cor de destaque. */
export const SectionTitle: React.FC<{
  title: string
  count?: number
  action?: string
  onAction?: () => void
}> = ({ title, count, action, onAction }) => (
  <div className="flex items-center justify-between">
    <h2 className="display text-xl text-[var(--text-1)]">
      {title}
      {count !== undefined && <span className="ml-1.5 text-[var(--text-3)]">{count}</span>}
    </h2>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="eyebrow text-[var(--run)] cursor-pointer py-1 inline-flex items-center gap-0.5"
      >
        {action} <ChevronRight className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
)

/** Superfície base (cartão escuro com borda subtil). `interactive` dá feedback ao toque; `accent` desenha uma faixa colorida à esquerda. */
export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; accent?: string }
> = ({ interactive, accent, className = '', style, ...rest }) => (
  <div
    {...rest}
    className={`iron-card ${interactive ? 'iron-card-interactive cursor-pointer active:scale-[0.99]' : ''} ${className}`}
    style={accent ? { borderLeft: `4px solid ${accent}`, ...style } : style}
  />
)

/** Número grande com etiqueta (painel de estatísticas, estilo app de corrida). */
export const StatTile: React.FC<{ value: number | string; label: string; highlight?: boolean; onClick?: () => void }> = ({
  value,
  label,
  highlight,
  onClick,
}) => {
  const on = highlight ?? (typeof value === 'number' ? value > 0 : true)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="py-3 px-2 text-left cursor-pointer disabled:cursor-default active:scale-95 transition"
    >
      <div className={`stat-num text-[44px] ${on ? 'text-[var(--run)]' : 'text-[var(--text-3)]'}`}>{value}</div>
      <div className="eyebrow text-[9px] text-[var(--text-3)] mt-1.5">{label}</div>
    </button>
  )
}

/** Estado vazio dentro de um cartão, com ação opcional. */
export const EmptyState: React.FC<{ text: string; action?: string; onAction?: () => void }> = ({
  text,
  action,
  onAction,
}) => (
  <div className="iron-card p-5 text-center text-xs text-[var(--text-3)] space-y-3">
    <p>{text}</p>
    {action && onAction && (
      <Button size="sm" onClick={onAction}>
        {action}
      </Button>
    )}
  </div>
)

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

/** Botão em pílula, maiúsculas a negrito. `primary` usa a cor de destaque (volt); `secondary` contorno; `ghost` só texto; `danger` para ações destrutivas. */
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; block?: boolean }
> = ({ variant = 'primary', size = 'md', block, className = '', type = 'button', ...rest }) => {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-extrabold uppercase tracking-wide rounded-full transition active:scale-[0.96] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = size === 'sm' ? 'text-[11px] px-3.5 py-1.5 min-h-[34px]' : 'text-xs px-5 py-3 min-h-[46px]'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--run)] text-[var(--on-accent)]',
    secondary: 'bg-transparent text-[var(--text-1)] border border-[var(--border-card-strong)]',
    ghost: 'text-[var(--text-2)] hover:bg-[var(--surface-raised)]',
    danger: 'bg-[var(--tint-rose-bg)] text-[var(--tint-rose-fg)] border border-[var(--tint-rose-border)]',
  }
  return (
    <button type={type} {...rest} className={`${base} ${sizes} ${variants[variant]} ${block ? 'w-full' : ''} ${className}`} />
  )
}

/** Filtro em pílula com estado ativo (fundo invertido) e ponto de cor opcional por tipo de atividade. */
export const Chip: React.FC<{
  active?: boolean
  color?: string
  onClick?: () => void
  children: React.ReactNode
}> = ({ active, color, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold whitespace-nowrap transition active:scale-95 cursor-pointer ${
      active
        ? 'bg-[var(--text-1)] text-[var(--bg-app)] border-[var(--text-1)]'
        : 'bg-[var(--surface-raised)] text-[var(--text-2)] border-[var(--border-card)]'
    }`}
  >
    {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
    {children}
  </button>
)

/** Etiqueta colorida do tipo de atividade: Troféu Cascais, Prova do Clube, Sugerida, Treino ou Evento. */
export const KindBadge: React.FC<{ kind: ActivityKind; label?: string }> = ({ kind, label }) => (
  <span
    className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border"
    style={{
      color: KIND_COLOR[kind],
      borderColor: `color-mix(in srgb, ${KIND_COLOR[kind]} 45%, transparent)`,
      background: `color-mix(in srgb, ${KIND_COLOR[kind]} 12%, transparent)`,
    }}
  >
    {label || KIND_SINGULAR[kind]}
  </span>
)

/** Etiqueta pequena de estado (neutral, ok, warn, danger, info). */
export const Tag: React.FC<{ tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info'; children: React.ReactNode }> = ({
  tone = 'neutral',
  children,
}) => {
  const tones = {
    neutral: 'bg-[var(--surface-raised)] text-[var(--text-2)] border-[var(--border-card)]',
    ok: 'bg-[var(--tint-emerald-bg)] text-[var(--tint-emerald-fg)] border-[var(--tint-emerald-border)]',
    warn: 'bg-[var(--tint-amber-bg)] text-[var(--tint-amber-fg)] border-[var(--tint-amber-border)]',
    danger: 'bg-[var(--tint-rose-bg)] text-[var(--tint-rose-fg)] border-[var(--tint-rose-border)]',
    info: 'bg-[var(--tint-blue-bg)] text-[var(--tint-blue-fg)] border-[var(--tint-blue-border)]',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${tones[tone]}`}>
      {children}
    </span>
  )
}

/** Bloco de data: dia em número grande condensado + mês abreviado na cor do tipo. */
export const DateBlock: React.FC<{ date: string; color?: string }> = ({ date, color = 'var(--run)' }) => {
  const dm = formatDayMonth(date)
  return (
    <div className="w-12 flex flex-col items-center justify-center shrink-0 pt-0.5">
      <span className="stat-num text-[32px] text-[var(--text-1)]">{dm.day}</span>
      <span className="eyebrow text-[10px] mt-1" style={{ color }}>
        {dm.month}
      </span>
    </div>
  )
}

/** Avatar circular com iniciais; `child` usa o tom de destaque dos perfis infantis. */
export const Avatar: React.FC<{ name: string; child?: boolean; size?: number }> = ({ name, child, size = 36 }) => (
  <div
    className="rounded-full flex items-center justify-center font-bold shrink-0 border"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.36,
      background: child ? 'var(--tint-amber-bg)' : 'var(--surface-raised)',
      color: child ? 'var(--tint-amber-fg)' : 'var(--text-1)',
      borderColor: child ? 'var(--tint-amber-border)' : 'var(--border-card)',
    }}
  >
    {name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('')}
  </div>
)

// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------
export const inputClass =
  'w-full rounded-xl bg-[var(--surface-raised)] border border-[var(--border-card)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--run)]'

/** Rótulo de formulário (maiúsculas pequenas) que envolve um input; usar com a classe `inputClass`. */
export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-[var(--text-muted)] mt-1">{hint}</span>}
  </label>
)

/** Caixa de seleção com rótulo e descrição. */
export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({
  checked,
  onChange,
  label,
  hint,
}) => (
  <label className="flex items-start gap-3 cursor-pointer py-1">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 accent-[var(--run)] shrink-0"
    />
    <span>
      <span className="block text-sm font-semibold text-[var(--text-1)]">{label}</span>
      {hint && <span className="block text-[11px] text-[var(--text-3)]">{hint}</span>}
    </span>
  </label>
)

/** Cabeçalho fixo de um bottom-sheet: título grande condensado, subtítulo e botão fechar. */
export const SheetHeader: React.FC<{ title: string; subtitle?: string; onClose: () => void; children?: React.ReactNode }> = ({
  title,
  subtitle,
  onClose,
  children,
}) => (
  <div className="px-5 pt-2 pb-3 border-b border-[var(--border-card)] flex items-start justify-between gap-3 shrink-0">
    <div className="min-w-0">
      {children}
      <h2 className="display text-[28px] text-[var(--text-1)]">{title}</h2>
      {subtitle && <p className="text-xs text-[var(--text-3)] mt-0.5">{subtitle}</p>}
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="Fechar"
      className="p-2 rounded-full bg-[var(--surface-raised)] text-[var(--text-2)] cursor-pointer shrink-0"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
)

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: React.ReactNode }>
  onChange: (v: T) => void
}) => (
  <div
    className="grid gap-1 p-1 rounded-full bg-[var(--surface-raised)]"
    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
  >
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
        className={`py-2 px-2 rounded-full text-[11px] font-extrabold uppercase tracking-wide transition cursor-pointer ${
          value === o.value ? 'bg-[var(--run)] text-[var(--on-accent)]' : 'text-[var(--text-3)]'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
)
