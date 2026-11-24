import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Share } from 'lucide-react'
import { useRetract } from '../layout/useScrollRetract'

/** Emblema do clube (quadrado, sem moldura). Decorativo: o título da barra diz onde estamos. */
export const HeaderEmblem: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <img
    src={`${import.meta.env.BASE_URL}urc-emblema.jpg`}
    alt=""
    width={size}
    height={size}
    className="hdr-emblem object-cover shrink-0 block"
    style={{ width: size, height: size }}
  />
)

/**
 * Botões unidos para o bloco azul (separadores de uma página: Clubes, Atletas, ...). O ativo fica branco com
 * texto azul. Grupo com `aria-pressed` (como o `Segmented`).
 */
export const HeaderSegmented = <T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  label: string
}) => (
  // Até 4 opções dividem a largura; com mais, a fila desliza na horizontal
  <div role="group" aria-label={label} className={options.length > 4 ? 'scroll-row joined-row' : 'joined'}>
    {options.map((o) => {
      const on = value === o.value
      return (
        <button
          key={o.value}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(o.value)}
          className={`${options.length > 4 ? 'shrink-0 px-4' : 'min-w-0 px-1.5'} h-11 border-2 border-[#ffffff] t-small t-strong whitespace-nowrap cursor-pointer transition-colors ${
            on ? 'bg-[#ffffff] text-[#004c94]' : 'bg-transparent text-[#ffffff] hover:bg-[#ffffff]/15'
          }`}
          style={on ? { outlineOffset: 3 } : undefined}
        >
          {o.label}
        </button>
      )
    })}
  </div>
)

/** Botão quadrado branco para usar sobre o bloco azul (alvo de 44 px, foco branco). */
export const HeaderButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({
  label,
  className = '',
  type = 'button',
  children,
  ...rest
}) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    {...rest}
    className={`w-11 h-11 flex items-center justify-center shrink-0 pressable bg-[#ffffff] text-[#004c94] hover:bg-[#dfe8f3] ${className}`}
  >
    {children}
  </button>
)

const BAR_STYLE: React.CSSProperties = {
  background: 'var(--hdr-bg)',
  color: 'var(--hdr-fg)',
  paddingTop: 'env(safe-area-inset-top, 0px)',
}
/** `text-wrap: pretty` global dos parágrafos anula o nowrap do `truncate`: força-o aqui. */
const NOWRAP: React.CSSProperties = { textWrap: 'nowrap' }

/**
 * Bloco azul fixo (sticky) no topo de cada ecrã: título em Archivo condensada, ações e o emblema à direita.
 * `children` fica também fixo, por baixo da barra (pesquisa, separadores), dentro do mesmo bloco azul.
 * `titleAs="p"` evita um segundo h1 quando o ecrã já tem o seu próprio título na página.
 */
export const AppHeader: React.FC<{
  title: string
  action?: React.ReactNode
  leading?: React.ReactNode
  titleAs?: 'h1' | 'p'
  className?: string
  children?: React.ReactNode
  /** Telemóvel: os `children` podem recolher para trás da barra (ver `retracted`). */
  collapsible?: boolean
  /** Com `collapsible`: recolhe os `children` (a altura do cabeçalho na página não muda, não há saltos). */
  retracted?: boolean
  /** Sem emblema à direita (barras com várias ações, onde o título precisa do espaço). */
  emblem?: boolean
}> = ({ title, action, leading, titleAs = 'h1', className = '', children, collapsible = false, retracted = false, emblem = true }) => {
  const Title = titleAs
  const tools = useRetract(collapsible && retracted)
  const ref = useRef<HTMLElement>(null)
  // Publica a altura do cabeçalho em --app-header-h (colunas laterais fixas usam-na para ficar por baixo dele)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const ro = new ResizeObserver(() => root.style.setProperty('--app-header-h', `${Math.round(el.offsetHeight)}px`))
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--app-header-h')
    }
  }, [])
  return (
    // Em `collapsible` o <header> é transparente: o fundo azul fica só na barra, que tapa o que recolhe por trás
    <header
      ref={ref}
      className={`app-header on-blue sticky top-0 z-30 ${children ? 'app-header-tall' : ''} ${collapsible ? 'pointer-events-none' : ''} ${className}`}
      style={collapsible ? undefined : BAR_STYLE}
    >
      <div
        className={`flex items-center gap-3 px-5 min-h-16 py-2 ${collapsible ? 'relative z-10 pointer-events-auto' : ''}`}
        style={collapsible ? BAR_STYLE : undefined}
      >
        {leading}
        <Title className="flex-1 min-w-0 line-clamp-2 break-words font-display text-[28px] leading-[0.95] font-black [font-stretch:75%] text-[var(--hdr-fg)]">
          {title}
        </Title>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        {emblem && <HeaderEmblem />}
      </div>
      {collapsible ? (
        <div {...tools.props} className={`app-header-tools ${tools.hidden ? 'is-retracted' : ''}`}>
          {children}
        </div>
      ) : (
        children
      )}
    </header>
  )
}

/**
 * Barra fixa dos detalhes de prova/evento: "Voltar" à esquerda, partilhar e emblema à direita.
 * O título aparece na barra depois de o topo da página (`.detail-hero`) sair do ecrã.
 * `overlay` mantém-se por compatibilidade (já não há capa por baixo).
 */
export const DetailBar: React.FC<{
  title: string
  onBack: () => void
  onShare: () => void
  overlay?: boolean
}> = ({ title, onBack, onShare }) => {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const el = document.querySelector<HTMLElement>('.detail-hero')
      const limit = el ? el.offsetTop + el.offsetHeight - 64 : 160
      setScrolled(window.scrollY > limit)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="app-header on-blue sticky top-0 z-30" style={BAR_STYLE}>
      <div className="flex items-center gap-3 pl-2 pr-5 min-h-16 py-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 pl-2 pr-3 flex items-center gap-1.5 shrink-0 text-[15px] t-strong text-[var(--hdr-fg)] hover:underline underline-offset-4 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
          Voltar
        </button>
        <p
          className={`flex-1 min-w-0 truncate font-display text-[20px] leading-none font-extrabold [font-stretch:75%] text-[var(--hdr-fg)] transition-opacity duration-150 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
          style={NOWRAP}
          aria-hidden="true"
        >
          {title}
        </p>
        <HeaderButton label="Partilhar" onClick={onShare}>
          <Share className="w-5 h-5" aria-hidden="true" />
        </HeaderButton>
        <HeaderEmblem />
      </div>
    </header>
  )
}
