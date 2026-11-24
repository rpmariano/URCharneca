/**
 * Primitivas de interface partilhadas. Usam apenas as variáveis de tema (index.css), para que os temas
 * fiquem coerentes em todos os ecrãs.
 * Direção "Pista": cantos retos, sem sombras, réguas (1 px e 3 px escura), blocos de cor sólida,
 * Archivo condensada nos títulos e números, Public Sans no texto.
 */
import React, { useId } from 'react'
import { DefaultAvatar, avatarKind } from './DefaultAvatar'
import { CalendarHeart, ChevronRight, Dumbbell, Lightbulb, Search, Shield, Trophy, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityKind, Race, TeamEvent } from '../types'
import { formatDayMonth } from '../utils/formatters'
import { AppHeader } from './AppHeader'

export const KIND_SINGULAR: Record<ActivityKind, string> = {
  trofeu_cascais: 'Troféu de Cascais',
  equipa: 'Prova do clube',
  individual: 'Comunidade',
  training: 'Treino',
  event: 'Evento',
}

/** Cor do marcador de cada tipo (calendário, legenda, barra lateral). */
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

/** Treinos e eventos têm marcador vazado (só contorno); as provas, cheio. */
const KIND_HOLLOW: Record<ActivityKind, boolean> = {
  trofeu_cascais: false,
  equipa: false,
  individual: false,
  training: true,
  event: true,
}

/** Marcador quadrado do tipo de atividade (decorativo: o nome do tipo está sempre no texto ou no rótulo). */
export const KindMark: React.FC<{ kind: ActivityKind; size?: number }> = ({ kind, size = 10 }) => (
  <span
    aria-hidden="true"
    className="inline-block shrink-0"
    style={{
      width: size,
      height: size,
      background: KIND_HOLLOW[kind] ? 'transparent' : KIND_COLOR[kind],
      boxShadow: KIND_HOLLOW[kind] ? `inset 0 0 0 2px ${KIND_COLOR[kind]}` : undefined,
    }}
  />
)

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

/** Topo de página: bloco azul fixo (AppHeader) com o título; o subtítulo, se existir, fica por baixo como texto normal.
 *  Pensado para um contentor com `px-5`: o bloco sangra para as margens (`-mx-5`). */
export const PageHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; bleed?: string }> = ({
  subtitle,
  title,
  action,
  bleed = '-mx-5',
}) => (
  <>
    <AppHeader title={title} action={action} className={bleed} />
    {subtitle && <p className="t-body text-[var(--text-2)]">{subtitle}</p>}
  </>
)

/** Contador vermelho (por ler, novas, pendentes). O número é decorativo: dar o texto completo ao leitor de ecrã. */
export const Counter: React.FC<{ value: number | string; className?: string }> = ({ value, className = '' }) => (
  <span
    aria-hidden="true"
    className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-[var(--alert)] text-[var(--on-alert)] t-label t-strong t-num leading-none ${className}`}
  >
    {value}
  </span>
)

/** Título de secção (Archivo condensada) com contador opcional e ligação ("Ver tudo") à direita. */
export const SectionTitle: React.FC<{
  title: string
  count?: number
  action?: string
  onAction?: () => void
  as?: 'h2' | 'h3'
}> = ({ title, count, action, onAction, as: H = 'h2' }) => (
  <div className="flex items-end justify-between gap-3 pb-2">
    <H className="t-heading text-[var(--text-1)] min-w-0">
      {title}
      {count !== undefined && <span className="ml-2 num-wide text-[var(--link)]">{count}</span>}
    </H>
    {action && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="t-small t-strong text-[var(--link)] hover:underline underline-offset-4 cursor-pointer min-h-11 -my-2 pl-3 inline-flex items-center gap-0.5 shrink-0"
      >
        {action} <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    )}
  </div>
)

/** Superfície base: caixa com régua fina, cantos retos. `accent` mantém-se por compatibilidade e é ignorado (sem faixas laterais). */
export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; accent?: string }
> = ({ interactive, accent: _accent, className = '', ...rest }) => (
  <div {...rest} className={`card ${interactive ? 'pressable' : ''} ${className}`} />
)

/** Número com etiqueta (painel de gestão): número grande condensado sobre uma régua escura. */
export const StatTile: React.FC<{
  value: number | string
  label: string
  highlight?: boolean
  onClick?: () => void
}> = ({ value, label, highlight, onClick }) => {
  const on = highlight ?? (typeof value === 'number' ? value > 0 : true)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="rule-top pt-2 pb-2 text-left min-h-11 row-link disabled:cursor-default flex flex-col"
    >
      <span className="num text-[48px]" style={{ color: on ? 'var(--link)' : 'var(--text-3)' }}>
        {value}
      </span>
      <span className="t-small t-strong text-[var(--text-1)] mt-1">{label}</span>
    </button>
  )
}

/** Estado vazio: régua escura, título, texto de orientação e ação opcional. Sem ícone decorativo. */
export const EmptyState: React.FC<{ title?: string; text: string; action?: string; onAction?: () => void; icon?: LucideIcon }> = ({
  title,
  text,
  action,
  onAction,
}) => (
  <div className="rule-top pt-4 pb-6 flex flex-col items-start gap-2">
    {title && <h3 className="t-heading text-[var(--text-1)]">{title}</h3>}
    <p className="t-body text-[var(--text-2)]">{text}</p>
    {action && onAction && (
      <Button variant="secondary" onClick={onAction} className="mt-2">
        {action}
      </Button>
    )}
  </div>
)

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse'

/**
 * Botão de cantos retos. `primary` azul do clube; `secondary` contorno escuro de 2 px; `ghost` texto sublinhado;
 * `danger` contorno vermelho (ações destrutivas); `inverse` branco com texto azul, para usar sobre os blocos azuis.
 */
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg'; block?: boolean }
> = ({ variant = 'primary', size = 'md', block, className = '', type = 'button', ...rest }) => {
  const base =
    'inline-flex items-center justify-center gap-2 t-strong pressable disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap'
  const sizes = size === 'sm' ? 't-small px-4 min-h-11' : size === 'lg' ? 'text-[17px] px-6 min-h-[54px]' : 'text-[16px] px-5 min-h-12'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--run)] text-[var(--on-accent)] hover:enabled:bg-[var(--run-deep)]',
    secondary:
      'bg-transparent text-[var(--text-1)] border-2 border-[var(--text-1)] hover:enabled:bg-[var(--text-1)] hover:enabled:text-[var(--bg-app)]',
    ghost: 'text-[var(--text-1)] underline underline-offset-4 decoration-2 hover:enabled:bg-[var(--surface-raised)]',
    danger:
      'bg-transparent text-[var(--danger)] border-2 border-[var(--danger)] hover:enabled:bg-[var(--alert)] hover:enabled:text-[var(--on-alert)] hover:enabled:border-[var(--alert)]',
    inverse: 'bg-[#ffffff] text-[#004c94] hover:enabled:bg-[#dfe8f3]',
  }
  return (
    <button type={type} {...rest} className={`${base} ${sizes} ${variants[variant]} ${block ? 'w-full' : ''} ${className}`} />
  )
}

/** Botão quadrado só com ícone (44 px), contorno de 2 px. `floating` mantém-se por compatibilidade. */
export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; floating?: boolean }
> = ({ label, floating: _floating, className = '', type = 'button', children, ...rest }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    {...rest}
    className={`w-11 h-11 flex items-center justify-center shrink-0 pressable bg-[var(--surface-card)] text-[var(--text-1)] border-2 border-[var(--text-1)] hover:bg-[var(--surface-raised)] ${className}`}
  >
    {children}
  </button>
)

/** Filtro com estado ativo (preenchido a azul) e marcador de cor opcional. */
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
    className={`shrink-0 inline-flex items-center gap-2 px-4 min-h-11 border-2 t-small t-strong whitespace-nowrap pressable ${
      active
        ? 'bg-[var(--run)] text-[var(--on-accent)] border-[var(--run)]'
        : 'bg-transparent text-[var(--text-1)] border-[var(--text-1)] hover:bg-[var(--surface-raised)]'
    }`}
  >
    {color && <span className="w-2.5 h-2.5 shrink-0" style={{ background: color }} aria-hidden="true" />}
    {children}
  </button>
)

/** Tipo de atividade: marcador quadrado e nome (sem pílula). */
export const KindBadge: React.FC<{ kind: ActivityKind; label?: string; solid?: boolean }> = ({ kind, label }) => (
  <span className="inline-flex items-center gap-2 t-small t-strong text-[var(--text-1)]">
    <KindMark kind={kind} />
    {label || KIND_SINGULAR[kind]}
  </span>
)

export type TagTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'blue' | 'yellow' | 'red' | 'green' | 'brown'

/**
 * Etiqueta de estado: bloco liso, sem pílula.
 * ok = azul cheio (inscrito, confirmado); warn = dourado (pendente, a aguardar); danger = vermelho (alerta);
 * info = contorno azul; neutral = contorno escuro. Os tons antigos (blue, yellow, ...) mapeiam para estes.
 */
export const Tag: React.FC<{ tone?: TagTone; children: React.ReactNode }> = ({ tone = 'neutral', children }) => {
  const map: Record<TagTone, string> = {
    ok: 'bg-[var(--run)] text-[var(--on-accent)] border-[var(--run)]',
    blue: 'bg-[var(--run)] text-[var(--on-accent)] border-[var(--run)]',
    warn: 'bg-[var(--gold)] text-[var(--on-gold)] border-[var(--gold)]',
    yellow: 'bg-[var(--gold)] text-[var(--on-gold)] border-[var(--gold)]',
    danger: 'bg-[var(--alert)] text-[var(--on-alert)] border-[var(--alert)]',
    red: 'bg-[var(--alert)] text-[var(--on-alert)] border-[var(--alert)]',
    info: 'bg-transparent text-[var(--link)] border-[var(--link)]',
    green: 'bg-transparent text-[var(--link)] border-[var(--link)]',
    neutral: 'bg-transparent text-[var(--text-1)] border-[var(--text-1)]',
    brown: 'bg-transparent text-[var(--text-1)] border-[var(--text-1)]',
  }
  return (
    <span className={`inline-flex items-center gap-1 shrink-0 t-small t-strong px-2 py-px border-2 whitespace-nowrap ${map[tone]}`}>
      {children}
    </span>
  )
}

/**
 * Bloco de data: dia em número grande (Archivo muito condensada) e mês por baixo.
 * `row` para listas (52 px), `hero` para o topo de uma prova (bloco dourado), `xl` para o topo no computador.
 */
export const DateBlock: React.FC<{ date: string; color?: string; size?: 'row' | 'hero' | 'xl'; className?: string }> = ({
  date,
  color,
  size = 'row',
  className = '',
}) => {
  const dm = formatDayMonth(date)
  const day = dm.day.padStart(2, '0')
  const month = dm.month.toLowerCase().replace('.', '')
  if (size === 'row') {
    return (
      <span
        className={`w-[52px] shrink-0 flex flex-col items-center justify-center num ${className}`}
        style={{ color: color ?? 'var(--link)' }}
        aria-hidden="true"
      >
        <span className="text-[44px]">{day}</span>
        <span className="text-[18px] font-extrabold">{month}</span>
      </span>
    )
  }
  const xl = size === 'xl'
  return (
    <span
      className={`block-gold shrink-0 flex flex-col items-center justify-center num ${xl ? 'w-[152px] min-h-[150px]' : 'w-24 min-h-[104px]'} ${className}`}
      aria-hidden="true"
    >
      <span className={xl ? 'text-[124px]' : 'text-[76px]'}>{day}</span>
      <span className={`${xl ? 'text-[34px]' : 'text-[22px]'} font-extrabold`}>{month}</span>
    </span>
  )
}

/**
 * Avatar quadrado. Com `photo` mostra a foto; sem foto a figura por defeito (adulto ou criança; sem género, neutra).
 * Decorativo: o nome fica sempre no texto ao lado (alt vazio / aria-hidden).
 */
export const Avatar: React.FC<{
  name: string
  child?: boolean
  size?: number
  photo?: string
  gender?: 'M' | 'F'
}> = ({ child, size = 40, photo, gender }) => {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="object-cover shrink-0 block"
        style={{ width: size, height: size }}
      />
    )
  }
  return <DefaultAvatar kind={avatarKind(gender, child)} size={size} />
}

// ---------------------------------------------------------------------------
// Explorar
// ---------------------------------------------------------------------------

/** Campo de pesquisa para o bloco azul do topo: branco, cantos retos, régua branca de 2 px. */
export const SearchPill: React.FC<{
  value: string
  onChange: (v: string) => void
  placeholder?: string
  trailing?: React.ReactNode
}> = ({ value, onChange, placeholder = 'Procurar', trailing }) => (
  <div className="flex items-center gap-2 pl-3.5 pr-0 h-12 bg-[#ffffff] border-2 border-[#ffffff] text-[#0d1726]">
    <Search className="w-5 h-5 shrink-0" aria-hidden="true" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="flex-1 min-w-0 h-11 bg-transparent t-body text-[#0d1726] placeholder:text-[#4d5a70] border-0 focus:shadow-none"
      style={{ boxShadow: 'none', color: '#0d1726' }}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Limpar pesquisa"
        className="w-11 h-11 flex items-center justify-center text-[#0d1726] cursor-pointer shrink-0 [--focus:#0d1726]"
        style={{ outlineOffset: -3 }}
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    )}
    {trailing}
  </div>
)

/**
 * Separadores em botões unidos (sobre o bloco azul): o ativo fica preenchido a branco com texto azul.
 * `options[].icon` mantém-se por compatibilidade e não é desenhado.
 */
export const CategoryTabs = <T extends string>({
  value,
  options,
  onChange,
  label = 'Categorias',
}: {
  value: T
  options: Array<{ value: T; label: string; icon?: LucideIcon }>
  onChange: (v: T) => void
  label?: string
}) => (
  <div className="joined" role="tablist" aria-label={label}>
    {options.map((o) => {
      const active = value === o.value
      return (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(o.value)}
          className={`min-w-0 h-11 px-1 border-2 border-[#ffffff] t-small t-strong whitespace-nowrap cursor-pointer transition-colors ${
            active ? 'bg-[#ffffff] text-[#004c94]' : 'bg-transparent text-[#ffffff] hover:bg-[#ffffff]/15'
          }`}
        >
          {o.label}
        </button>
      )
    })}
  </div>
)

/** Linha de lista com ícone opcional (simples, sem quadrado), título, descrição e seta (menus do Perfil e de Gerir). */
export const ListRow: React.FC<{
  icon?: LucideIcon
  title: string
  description?: string
  trailing?: React.ReactNode
  onClick?: () => void
  danger?: boolean
  tone?: string
}> = ({ icon: Icon, title, description, trailing, onClick, danger }) => {
  const body = (
    <>
      {Icon && <Icon className={`w-5 h-5 shrink-0 ${danger ? 'text-[var(--danger)]' : 'text-[var(--text-1)]'}`} strokeWidth={2} aria-hidden="true" />}
      <span className="flex-1 min-w-0 text-left">
        <span className={`block t-body t-strong ${danger ? 'text-[var(--danger)]' : 'text-[var(--text-1)]'}`}>{title}</span>
        {description && <span className="block t-small text-[var(--text-2)]">{description}</span>}
      </span>
      {trailing}
      {onClick && <ChevronRight className="w-5 h-5 text-[var(--text-1)] shrink-0" aria-hidden="true" />}
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="w-full min-h-14 py-3 flex items-center gap-4 cursor-pointer row-link">
      {body}
    </button>
  ) : (
    <div className="w-full min-h-14 py-3 flex items-center gap-4">{body}</div>
  )
}

/** Barra de ação fixa no fundo de uma página de detalhe: régua escura de 3 px, resumo à esquerda, botão principal à direita. */
export const StickyActionBar: React.FC<{ children: React.ReactNode; summary?: React.ReactNode }> = ({ children, summary }) => (
  <div
    className="fixed-bar fixed-bar-pad pt-3 flex items-center justify-between gap-4 border-t-[3px] border-[var(--rule-strong)]"
    style={{ background: 'var(--bg-nav)', paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))' }}
  >
    <div className="min-w-0 flex-1">{summary}</div>
    {children}
  </div>
)

/** Etiqueta para os blocos azuis (contorno branco). */
export const HeroTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center shrink-0 px-2 py-px border-2 border-[#ffffff] text-[#ffffff] t-small t-strong whitespace-nowrap">
    {children}
  </span>
)

/**
 * Faixa escura de factos (Distância, Local, Inscrições): rótulo pequeno e valor em Archivo condensada.
 * `accent` pinta o valor de amarelo (o que pede atenção).
 */
export const FactStrip: React.FC<{ items: Array<{ label: string; value: React.ReactNode; accent?: boolean }>; className?: string }> = ({
  items,
  className = '',
}) => (
  <dl className={`block-band on-band m-0 flex flex-wrap gap-x-6 gap-y-2 px-5 py-3 ${className}`}>
    {items.map((it, i) => (
      <div key={it.label} className={`flex flex-col gap-0.5 min-w-0 ${i === items.length - 1 && items.length > 2 ? 'ml-auto items-end text-right' : ''}`}>
        <dt className="t-label text-[var(--band-fg-2)]">{it.label}</dt>
        <dd className="m-0 num-wide text-[24px] leading-[1.1]" style={{ color: it.accent ? 'var(--band-accent)' : undefined }}>
          {it.value}
        </dd>
      </div>
    ))}
  </dl>
)

// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------
export const inputClass =
  'w-full bg-[var(--surface-card)] border-2 border-[var(--border-card-strong)] px-3.5 py-2.5 min-h-12 t-body text-[var(--text-1)] placeholder:text-[var(--text-muted)]'

/**
 * Rótulo de formulário que envolve um input; usar com a classe `inputClass`. A dica fica fora do rótulo
 * (ligada por `aria-describedby`), para não entrar no nome do campo. Com um `Segmented` o rótulo dá nome ao
 * grupo, sem `<label>` (tocar no texto carregava no primeiro botão).
 */
export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => {
  const id = useId()
  const labelId = `${id}label`
  const hintId = hint ? `${id}hint` : undefined
  const isGroup = React.Children.toArray(children).some((c) => React.isValidElement(c) && c.type === Segmented)
  const controls = React.Children.map(children, (c) => {
    if (!React.isValidElement<React.AriaAttributes>(c)) return c
    if (c.type === Segmented) return React.cloneElement(c, { 'aria-labelledby': labelId, 'aria-describedby': hintId })
    if (hintId && (c.type === 'input' || c.type === 'select' || c.type === 'textarea')) {
      return React.cloneElement(c, { 'aria-describedby': hintId })
    }
    return c
  })
  const Wrapper = isGroup ? 'div' : 'label'
  return (
    <div className={`block ${className}`}>
      <Wrapper className="block">
        <span id={labelId} className="block t-small t-strong text-[var(--text-1)] mb-1.5">{label}</span>
        {controls}
      </Wrapper>
      {hint && <span id={hintId} className="block t-small text-[var(--text-2)] mt-1">{hint}</span>}
    </div>
  )
}

/** Interruptor quadrado com rótulo e descrição. */
export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({
  checked,
  onChange,
  label,
  hint,
}) => (
  <label className="flex items-center gap-4 cursor-pointer min-h-12 py-1.5">
    <span className="flex-1 min-w-0">
      <span className="block t-body t-strong text-[var(--text-1)]">{label}</span>
      {hint && <span className="block t-small text-[var(--text-2)]">{hint}</span>}
    </span>
    <span className="relative shrink-0 w-12 h-7">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-x-0 -inset-y-2 w-full h-11 opacity-0 cursor-pointer"
      />
      <span
        className="absolute inset-0 border-2 border-[var(--border-card-strong)] bg-[var(--surface-card)] transition-colors peer-checked:bg-[var(--run)] peer-checked:border-[var(--run)] peer-focus-visible:outline-3 peer-focus-visible:outline-[var(--focus)] peer-focus-visible:outline-offset-2"
        aria-hidden="true"
      />
      <span
        className="absolute top-[5px] left-[5px] w-[18px] h-[18px] bg-[var(--border-card-strong)] transition-transform peer-checked:translate-x-5 peer-checked:bg-[#ffffff]"
        aria-hidden="true"
      />
    </span>
  </label>
)

/** Cabeçalho de uma folha/diálogo: título à esquerda (Archivo), fechar à direita, régua escura por baixo. */
export const SheetHeader: React.FC<{ title: string; subtitle?: string; onClose: () => void; children?: React.ReactNode }> = ({
  title,
  subtitle,
  onClose,
  children,
}) => (
  <div className="pl-5 pr-2 pt-3 pb-3 border-b-[3px] border-[var(--rule-strong)] shrink-0">
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1 pt-2">
        <h2 className="t-heading text-[var(--text-1)]">{title}</h2>
        {subtitle && <p className="t-small text-[var(--text-2)] mt-1">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="w-11 h-11 flex items-center justify-center text-[var(--text-1)] cursor-pointer shrink-0 hover:bg-[var(--surface-raised)]"
      >
        <X className="w-6 h-6" aria-hidden="true" />
      </button>
    </div>
    {children && <div className="pt-2 pr-3">{children}</div>}
  </div>
)

/** Seletor em botões unidos (2 a 4 opções). Dar-lhe nome com `label` ou pô-lo dentro de um `Field`. */
export const Segmented = <T extends string>({
  value,
  options,
  onChange,
  label,
  ...aria
}: {
  value: T
  options: Array<{ value: T; label: React.ReactNode }>
  onChange: (v: T) => void
  label?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}) => (
  <div role="group" aria-label={label} {...aria} className="joined">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        aria-pressed={value === o.value}
        className={`min-w-0 px-2 min-h-11 border-2 border-[var(--text-1)] t-small t-strong transition-colors cursor-pointer ${
          value === o.value ? 'bg-[var(--run)] text-[var(--on-accent)]' : 'bg-transparent text-[var(--text-1)] hover:bg-[var(--surface-raised)]'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
)
