/**
 * Primitivas de interface partilhadas. Usam apenas as variáveis de tema
 * (index.css), para que os temas fiquem coerentes em todos os ecrãs.
 * Estilo "explorar": um só tipo de letra, cantos arredondados, muito espaço em branco.
 */
import React from 'react'
import { CalendarHeart, ChevronRight, Dumbbell, Lightbulb, Search, Shield, Sparkles, Trophy, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityKind, Race, TeamEvent } from '../types'
import { formatDayMonth } from '../utils/formatters'

export const KIND_SINGULAR: Record<ActivityKind, string> = {
  trofeu_cascais: 'Troféu de Cascais',
  equipa: 'Prova do clube',
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

export const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  trofeu_cascais: Trophy,
  equipa: Shield,
  individual: Lightbulb,
  training: Dumbbell,
  event: CalendarHeart,
}

export const kindOfRace = (r: Race): ActivityKind => r.category
export const kindOfEvent = (e: TeamEvent): ActivityKind => (e.type === 'training' ? 'training' : 'event')

/**
 * Fundo de ecrã da app: aplica a cor de fundo, a cor do texto e a fonte do tema.
 * Envolver cada ecrã (ou composição) num `Screen`.
 */
export const Screen: React.FC<{ children?: React.ReactNode; padded?: boolean; className?: string; style?: React.CSSProperties }> = ({
  children,
  padded = true,
  className = '',
  style,
}) => (
  <div
    className={`${padded ? 'p-5' : ''} ${className}`}
    style={{ background: 'var(--bg-app)', color: 'var(--text-1)', fontFamily: 'var(--font-sans)', minHeight: '100%', ...style }}
  >
    {children}
  </div>
)

/** Topo de página: título grande em minúsculas, subtítulo opcional e ação à direita. */
export const PageHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({
  subtitle,
  title,
  action,
}) => (
  <div className="flex items-start justify-between gap-3 pt-6 pb-2">
    <div className="min-w-0">
      <h1 className="t-title text-[var(--text-1)]">{title}</h1>
      {subtitle && <p className="t-body text-[var(--text-3)] mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
)

/** Título de secção com contador opcional e ligação ("Ver tudo") à direita. */
export const SectionTitle: React.FC<{
  title: string
  count?: number
  action?: string
  onAction?: () => void
}> = ({ title, count, action, onAction }) => (
  <div className="flex items-center justify-between gap-3">
    <h2 className="t-heading text-[var(--text-1)]">
      {title}
      {count !== undefined && <span className="ml-1.5 font-normal text-[var(--text-3)]">{count}</span>}
    </h2>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="t-small t-strong text-[var(--text-1)] underline underline-offset-2 cursor-pointer min-h-11 -my-2 pl-3 inline-flex items-center gap-0.5 shrink-0"
      >
        {action} <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    )}
  </div>
)

/** Superfície base. `interactive` dá feedback ao toque; `accent` desenha uma faixa colorida à esquerda. */
export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; accent?: string }
> = ({ interactive, accent, className = '', style, ...rest }) => (
  <div
    {...rest}
    className={`card ${interactive ? 'pressable' : ''} ${className}`}
    style={accent ? { borderLeft: `4px solid ${accent}`, ...style } : style}
  />
)

/** Número com etiqueta (painel de gestão). */
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
      className="card p-4 text-left min-h-11 pressable disabled:cursor-default disabled:active:transform-none disabled:active:opacity-100"
    >
      <div className={`t-title t-num ${on ? 'text-[var(--text-1)]' : 'text-[var(--text-3)]'}`}>{value}</div>
      <div className="t-small text-[var(--text-3)] mt-0.5">{label}</div>
    </button>
  )
}

/** Estado vazio com título, texto de orientação e ação opcional. */
export const EmptyState: React.FC<{ title?: string; text: string; action?: string; onAction?: () => void; icon?: LucideIcon }> = ({
  title,
  text,
  action,
  onAction,
  icon: Icon = Sparkles,
}) => (
  <div className="py-10 px-4 text-center flex flex-col items-center gap-3">
    <span className="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-2)]">
      <Icon className="w-5 h-5" aria-hidden="true" />
    </span>
    {title && <h3 className="t-heading text-[var(--text-1)]">{title}</h3>}
    <p className="t-body text-[var(--text-3)] max-w-[30ch]">{text}</p>
    {action && onAction && (
      <Button variant="secondary" onClick={onAction} className="mt-1">
        {action}
      </Button>
    )}
  </div>
)

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

/** Botão de cantos arredondados. `primary` usa o azul do clube; `secondary` contorno; `ghost` texto sublinhado; `danger` para ações destrutivas. */
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; block?: boolean }
> = ({ variant = 'primary', size = 'md', block, className = '', type = 'button', ...rest }) => {
  const base =
    'inline-flex items-center justify-center gap-2 t-strong rounded-xl pressable disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap'
  const sizes = size === 'sm' ? 't-small px-4 min-h-11' : 't-body px-6 min-h-12'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--run)] text-[var(--on-accent)]',
    secondary: 'bg-[var(--surface-card)] text-[var(--text-1)] border border-[var(--text-1)]',
    ghost: 'text-[var(--text-1)] underline underline-offset-2 hover:bg-[var(--surface-raised)]',
    danger: 'bg-[var(--surface-card)] text-[var(--tint-rose-fg)] border border-[var(--tint-rose-border)]',
  }
  return (
    <button type={type} {...rest} className={`${base} ${sizes} ${variants[variant]} ${block ? 'w-full' : ''} ${className}`} />
  )
}

/** Botão redondo só com ícone (44 px). `floating` é a versão branca com sombra para usar sobre capas. */
export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; floating?: boolean }
> = ({ label, floating, className = '', type = 'button', children, ...rest }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    {...rest}
    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 pressable ${
      floating
        ? 'bg-[var(--surface-card)] text-[var(--text-1)] shadow-[var(--shadow-float)]'
        : 'bg-[var(--surface-card)] text-[var(--text-1)] border border-[var(--border-card)]'
    } ${className}`}
  >
    {children}
  </button>
)

/** Filtro em pílula com estado ativo (contorno escuro) e ponto de cor opcional. */
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
    className={`shrink-0 inline-flex items-center gap-2 px-4 min-h-11 rounded-full border t-small whitespace-nowrap pressable ${
      active
        ? 'bg-[var(--surface-raised)] text-[var(--text-1)] border-[var(--text-1)] t-strong shadow-[inset_0_0_0_1px_var(--text-1)]'
        : 'bg-[var(--surface-card)] text-[var(--text-1)] border-[var(--border-card)]'
    }`}
  >
    {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />}
    {children}
  </button>
)

/** Etiqueta do tipo de atividade com ícone: Troféu de Cascais, Prova do clube, Sugerida, Treino ou Evento. `solid` é a versão branca para usar sobre capas. */
export const KindBadge: React.FC<{ kind: ActivityKind; label?: string; solid?: boolean }> = ({ kind, label, solid }) => {
  const Icon = KIND_ICON[kind]
  return (
    <span
      className={`inline-flex items-center gap-1.5 t-small t-strong px-2.5 py-1 rounded-full ${
        solid ? 'bg-[var(--surface-card)] shadow-[var(--shadow-card)]' : 'bg-[var(--surface-raised)]'
      }`}
      style={{ color: KIND_COLOR[kind] }}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {label || KIND_SINGULAR[kind]}
    </span>
  )
}

/** Etiqueta pequena de estado (neutral, ok, warn, danger, info). */
export const Tag: React.FC<{ tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info'; children: React.ReactNode }> = ({
  tone = 'neutral',
  children,
}) => {
  const tones = {
    neutral: 'bg-[var(--surface-raised)] text-[var(--text-2)]',
    ok: 'bg-[var(--tint-emerald-bg)] text-[var(--tint-emerald-fg)]',
    warn: 'bg-[var(--tint-amber-bg)] text-[var(--tint-amber-fg)]',
    danger: 'bg-[var(--tint-rose-bg)] text-[var(--tint-rose-fg)]',
    info: 'bg-[var(--tint-blue-bg)] text-[var(--tint-blue-fg)]',
  }
  return (
    <span className={`inline-flex items-center gap-1 t-small t-strong px-2 py-0.5 rounded-md ${tones[tone]}`}>{children}</span>
  )
}

/** Bloco de data compacto: mês abreviado por cima do dia. */
export const DateBlock: React.FC<{ date: string; color?: string }> = ({ date, color = 'var(--run)' }) => {
  const dm = formatDayMonth(date)
  return (
    <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] flex flex-col items-center justify-center shrink-0">
      <span className="text-xs leading-none t-strong uppercase" style={{ color }} aria-hidden="true">
        {dm.month}
      </span>
      <span className="t-heading t-num leading-tight text-[var(--text-1)]">{dm.day}</span>
    </div>
  )
}

/** Avatar circular com iniciais; `child` usa o tom dourado dos perfis infantis. */
export const Avatar: React.FC<{ name: string; child?: boolean; size?: number }> = ({ name, child, size = 40 }) => (
  <div
    className="rounded-full flex items-center justify-center t-strong shrink-0"
    style={{
      width: size,
      height: size,
      fontSize: Math.max(12, size * 0.36),
      background: child ? 'var(--tint-amber-bg-strong)' : 'var(--text-1)',
      color: child ? 'var(--tint-amber-fg)' : 'var(--bg-app)',
    }}
    aria-hidden="true"
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
// Explorar
// ---------------------------------------------------------------------------

/** Pílula de pesquisa com sombra suave (topo da página Explorar). */
export const SearchPill: React.FC<{
  value: string
  onChange: (v: string) => void
  placeholder?: string
  trailing?: React.ReactNode
}> = ({ value, onChange, placeholder = 'Procurar', trailing }) => (
  <div className="flex items-center gap-2 pl-5 pr-1.5 min-h-14 rounded-full bg-[var(--surface-card)] border border-[var(--border-card)] shadow-[var(--shadow-card)]">
    <Search className="w-5 h-5 text-[var(--text-1)] shrink-0" aria-hidden="true" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="flex-1 min-w-0 h-11 bg-transparent t-body t-strong text-[var(--text-1)] placeholder:text-[var(--text-3)] placeholder:font-normal border-0 focus:shadow-none"
      style={{ boxShadow: 'none' }}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Limpar pesquisa"
        className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--text-2)] cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    )}
    {trailing}
  </div>
)

/** Fila de categorias com ícone e sublinhado no item ativo. */
export const CategoryTabs = <T extends string>({
  value,
  options,
  onChange,
  label = 'Categorias',
}: {
  value: T
  options: Array<{ value: T; label: string; icon: LucideIcon }>
  onChange: (v: T) => void
  label?: string
}) => (
  <div className="scroll-row gap-1 px-3" role="tablist" aria-label={label}>
    {options.map((o) => {
      const active = value === o.value
      return (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(o.value)}
          className={`shrink-0 min-w-[64px] min-h-[60px] px-2 pt-2 pb-2.5 flex flex-col items-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
            active ? 'border-[var(--text-1)] text-[var(--text-1)]' : 'border-transparent text-[var(--text-3)]'
          }`}
        >
          <o.icon className="w-6 h-6" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
          <span className={`text-xs whitespace-nowrap ${active ? 't-strong' : ''}`}>{o.label}</span>
        </button>
      )
    })}
  </div>
)

/** Linha de lista com ícone, título, descrição e seta (menus do Perfil e de Gerir). */
export const ListRow: React.FC<{
  icon?: LucideIcon
  title: string
  description?: string
  trailing?: React.ReactNode
  onClick?: () => void
  danger?: boolean
}> = ({ icon: Icon, title, description, trailing, onClick, danger }) => {
  const body = (
    <>
      {Icon && <Icon className={`w-6 h-6 shrink-0 ${danger ? 'text-[var(--tint-rose-fg)]' : 'text-[var(--text-1)]'}`} strokeWidth={1.8} aria-hidden="true" />}
      <span className="flex-1 min-w-0 text-left">
        <span className={`block t-body ${danger ? 'text-[var(--tint-rose-fg)]' : 'text-[var(--text-1)]'}`}>{title}</span>
        {description && <span className="block t-small text-[var(--text-3)]">{description}</span>}
      </span>
      {trailing}
      {onClick && <ChevronRight className="w-5 h-5 text-[var(--text-2)] shrink-0" aria-hidden="true" />}
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="w-full min-h-14 py-3 flex items-center gap-4 cursor-pointer">
      {body}
    </button>
  ) : (
    <div className="w-full min-h-14 py-3 flex items-center gap-4">{body}</div>
  )
}

/** Barra de ação fixa no fundo de uma página de detalhe: resumo à esquerda, botão principal à direita. */
export const StickyActionBar: React.FC<{ children: React.ReactNode; summary?: React.ReactNode }> = ({ children, summary }) => (
  <div
    className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-5 pt-3 flex items-center justify-between gap-4 border-t border-[var(--border-card)]"
    style={{ background: 'var(--bg-nav)', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
  >
    <div className="min-w-0 flex-1">{summary}</div>
    {children}
  </div>
)

// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------
export const inputClass =
  'w-full rounded-xl bg-[var(--surface-card)] border border-[var(--border-card-strong)] px-3.5 py-2.5 min-h-12 t-body text-[var(--text-1)] placeholder:text-[var(--text-muted)]'

/** Rótulo de formulário que envolve um input; usar com a classe `inputClass`. */
export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block t-small t-strong text-[var(--text-1)] mb-1.5">{label}</span>
    {children}
    {hint && <span className="block t-small text-[var(--text-3)] mt-1">{hint}</span>}
  </label>
)

/** Interruptor com rótulo e descrição. */
export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({
  checked,
  onChange,
  label,
  hint,
}) => (
  <label className="flex items-center gap-4 cursor-pointer min-h-12 py-1.5">
    <span className="flex-1 min-w-0">
      <span className="block t-body text-[var(--text-1)]">{label}</span>
      {hint && <span className="block t-small text-[var(--text-3)]">{hint}</span>}
    </span>
    <span className="relative shrink-0 w-12 h-8">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-x-0 -inset-y-1.5 w-full h-11 opacity-0 cursor-pointer"
      />
      <span
        className="absolute inset-0 rounded-full transition-colors bg-[var(--border-card-strong)] peer-checked:bg-[var(--text-1)] peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--run)] peer-focus-visible:outline-offset-2"
        aria-hidden="true"
      />
      <span
        className="absolute top-1 left-1 w-6 h-6 rounded-full bg-[var(--bg-app)] transition-transform peer-checked:translate-x-4"
        aria-hidden="true"
      />
    </span>
  </label>
)

/** Cabeçalho de um bottom-sheet: botão fechar à esquerda, título centrado e subtítulo. */
export const SheetHeader: React.FC<{ title: string; subtitle?: string; onClose: () => void; children?: React.ReactNode }> = ({
  title,
  subtitle,
  onClose,
  children,
}) => (
  <div className="px-3 pt-1 pb-3 border-b border-[var(--border-card)] shrink-0">
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--text-1)] cursor-pointer shrink-0 hover:bg-[var(--surface-raised)]"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1 pr-11 text-center">
        <h2 className="t-body t-strong text-[var(--text-1)] truncate">{title}</h2>
      </div>
    </div>
    {(subtitle || children) && (
      <div className="px-2 pt-1 text-center">
        {children}
        {subtitle && <p className="t-small text-[var(--text-3)]">{subtitle}</p>}
      </div>
    )}
  </div>
)

/** Seletor segmentado (2 a 4 opções). */
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
    className="grid gap-1 p-1 rounded-xl bg-[var(--surface-raised)]"
    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
  >
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
        className={`px-2 min-h-11 rounded-lg t-small transition-colors cursor-pointer ${
          value === o.value ? 'bg-[var(--surface-card)] text-[var(--text-1)] t-strong shadow-[var(--shadow-card)]' : 'text-[var(--text-2)]'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
)
